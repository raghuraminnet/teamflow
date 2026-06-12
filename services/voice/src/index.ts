import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import pool, { initSchema } from './db/index.js';
import { ami, pingAMI } from './asterisk/ami.js';
import { checkWhisper } from './stt/whisper.js';
import { checkPiper } from './tts/piper.js';
import { checkLLM } from './llm/bridge.js';
import { runCampaign, stopCampaign } from './campaigns/runner.js';

const PORT = parseInt(process.env.VOICE_PORT || '3002', 10);
const RECORDINGS_DIR = process.env.RECORDINGS_DIR || path.join(process.cwd(), 'recordings');
const TF_API_URL = process.env.TF_API_URL || 'http://teamflow-api:3001';

const app = express();
app.use(cors());
app.use(express.json());

// ─── Auth Middleware ───────────────────────────────────────────────────────────

function getUserId(req: express.Request): number | null {
  const id = req.headers['x-user-id'];
  return id ? parseInt(id as string, 10) : null;
}

function isAdmin(req: express.Request): boolean {
  return req.headers['x-user-role'] === 'admin';
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!getUserId(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!isAdmin(req)) {
    res.status(403).json({ error: 'Forbidden: admin only' });
    return;
  }
  next();
}

// ─── Voice Agents ──────────────────────────────────────────────────────────────

app.get('/voice/agents', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, description, type, steps, prompt, voice_id, llm_model, is_active, created_at FROM voice.voice_agents ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/voice/agents', requireAdmin, async (req, res) => {
  try {
    const { name, description, type, steps, prompt, voice_id, llm_model } = req.body;
    if (!name || !type) {
      res.status(400).json({ error: 'name and type are required' });
      return;
    }
    const { rows } = await pool.query(
      `INSERT INTO voice.voice_agents (name, description, type, steps, prompt, voice_id, llm_model, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, description || null, type, JSON.stringify(steps || []), prompt || null, voice_id || null, llm_model || null, getUserId(req)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/voice/agents/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM voice.voice_agents WHERE id = $1',
      [req.params.id]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/voice/agents/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description, type, steps, prompt, voice_id, llm_model, is_active } = req.body;
    const { rows } = await pool.query(
      `UPDATE voice.voice_agents SET
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        type = COALESCE($4, type),
        steps = COALESCE($5, steps),
        prompt = COALESCE($6, prompt),
        voice_id = COALESCE($7, voice_id),
        llm_model = COALESCE($8, llm_model),
        is_active = COALESCE($9, is_active)
       WHERE id = $1 RETURNING *`,
      [req.params.id, name, description, type, steps ? JSON.stringify(steps) : null, prompt, voice_id, llm_model, is_active]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/voice/agents/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM voice.voice_agents WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Campaigns ─────────────────────────────────────────────────────────────────

app.get('/voice/campaigns', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.description, c.status, c.schedule_at, c.schedule_expr,
              c.contacts, c.result, c.created_at, c.started_at, c.completed_at,
              a.name as agent_name
       FROM voice.campaigns c
       LEFT JOIN voice.voice_agents a ON c.agent_id = a.id
       ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/voice/campaigns', requireAdmin, async (req, res) => {
  try {
    const { agent_id, name, description, schedule_at, schedule_expr, contacts } = req.body;
    if (!agent_id || !name) {
      res.status(400).json({ error: 'agent_id and name are required' });
      return;
    }
    const { rows } = await pool.query(
      `INSERT INTO voice.campaigns (agent_id, name, description, schedule_at, schedule_expr, contacts, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [agent_id, name, description || null, schedule_at || null, schedule_expr || null, JSON.stringify(contacts || []), getUserId(req)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/voice/campaigns/:id/run', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT status FROM voice.campaigns WHERE id = $1',
      [req.params.id]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    const campaignId = parseInt(req.params.id, 10);
    runCampaign(campaignId, getUserId(req) || 0);
    res.json({ message: 'Campaign started', campaign_id: campaignId });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/voice/campaigns/:id/stop', requireAdmin, async (req, res) => {
  try {
    stopCampaign(parseInt(req.params.id, 10));
    res.json({ message: 'Campaign stop requested' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Call Logs ────────────────────────────────────────────────────────────────

app.get('/voice/calls', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 100);
    const offset = (page - 1) * limit;
    const { rows, total } = await pool.query(
      `SELECT cl.*, c.name as campaign_name, a.name as agent_name
       FROM voice.call_logs cl
       LEFT JOIN voice.campaigns c ON cl.campaign_id = c.id
       LEFT JOIN voice.voice_agents a ON cl.agent_id = a.id
       ORDER BY cl.started_at DESC
       LIMIT ${limit} OFFSET ${offset}`
    ).then(async (r) => {
      const cnt = await pool.query('SELECT COUNT(*) FROM voice.call_logs');
      return { rows: r.rows, total: parseInt(cnt.rows[0].count, 10) };
    });
    res.json({ calls: rows, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/voice/calls/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cl.*, c.name as campaign_name, a.name as agent_name
       FROM voice.call_logs cl
       LEFT JOIN voice.campaigns c ON cl.campaign_id = c.id
       LEFT JOIN voice.voice_agents a ON cl.agent_id = a.id
       WHERE cl.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Call not found' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Recordings ───────────────────────────────────────────────────────────────

app.get('/voice/recordings', requireAuth, async (req, res) => {
  try {
    if (!fs.existsSync(RECORDINGS_DIR)) {
      res.json([]);
      return;
    }
    const files = fs.readdirSync(RECORDINGS_DIR).filter(f => f.endsWith('.wav') || f.endsWith('.mp3'));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/voice/recordings/:file', requireAuth, (req, res) => {
  const filePath = path.join(RECORDINGS_DIR, req.params.file);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.sendFile(filePath);
});

// ─── Health ────────────────────────────────────────────────────────────────────

app.get('/health', async (req, res) => {
  const [asterisk, whisper, piper, llm, db] = await Promise.all([
    pingAMI().catch(() => false),
    checkWhisper().catch(() => false),
    checkPiper().catch(() => false),
    checkLLM().catch(() => false),
    pool.query('SELECT 1').then(() => true).catch(() => false),
  ]);

  const allUp = asterisk && whisper && piper && llm && db;
  res.status(allUp ? 200 : 503).json({
    status: allUp ? 'healthy' : 'degraded',
    services: { asterisk, whisper, piper, llm, db },
    timestamp: new Date().toISOString(),
  });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await initSchema();
    console.info('[Voice] Schema initialized');
  } catch (err) {
    console.warn('[Voice] Schema init warning:', (err as Error).message);
  }

  // Ensure recordings dir exists
  if (!fs.existsSync(RECORDINGS_DIR)) {
    fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  }

  // Connect AMI (graceful — doesn't fail if Asterisk is down)
  try {
    await ami.connect();
    console.info('[Voice] AMI connected');
  } catch (err) {
    console.warn('[Voice] AMI connect failed (will retry):', (err as Error).message);
  }

  const server = createServer(app);
  server.listen(PORT, '0.0.0.0', () => {
    console.info(`[Voice] Service running on port ${PORT}`);
  });
}

main().catch(console.error);