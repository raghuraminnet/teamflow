import 'dotenv/config';
import express, { type Request, type Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      userId: number;
    }
  }
}
import cors from 'cors';
import pool from './db/index.js';
import { addClient, removeClient, sendToUser, startKeepAlive, stopKeepAlive } from './sse.js';
import { sendEmail } from './email.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.NOTIFY_PORT || '3003', 10);

// ── Auth middleware (X-User-Id injected by gateway) ────────────────────────────
function requireUser(req: Request, res: Response, next: express.NextFunction): void {
  const userId = parseInt(req.headers['x-user-id'] as string || '', 10);
  if (!userId || isNaN(userId)) {
    res.status(401).json({ error: 'Missing or invalid X-User-Id header' });
    return;
  }
  (req as Request & { userId: number }).userId = userId;
  next();
}

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'notify', ts: new Date().toISOString() });
});

// ── SSE ───────────────────────────────────────────────────────────────────────
app.get('/notify/sse', requireUser, (req: Request & { userId: number }, res: Response) => {
  const userId = req.userId;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial connection ack
  res.write(`data: ${JSON.stringify({ type: 'connected', ts: new Date().toISOString() })}\n\n`);

  addClient(userId, res);

  req.on('close', () => removeClient(userId));
});

// ── GET /notify/me ────────────────────────────────────────────────────────────
app.get('/notify/me', requireUser, async (req: Request, res: Response) => {
  const { userId } = req;
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = 20;
  const offset = (Math.max(page, 1) - 1) * limit;

  try {
    const result = await pool.query(
      `SELECT id, type, title, body, data, is_read, created_at
       FROM notify.notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countRes = await pool.query<{ count: string }>(
      'SELECT COUNT(*) FROM notify.notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({
      notifications: result.rows,
      unread: parseInt(countRes.rows[0].count, 10),
      page,
      limit,
    });
  } catch (err) {
    console.error('GET /notify/me error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ── PUT /notify/me/read/:id ──────────────────────────────────────────────────
app.put('/notify/me/read/:id', requireUser, async (req: Request, res: Response) => {
  const { userId } = req;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid notification id' });
    return;
  }

  try {
    const result = await pool.query(
      'UPDATE notify.notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.json({ ok: true, id });
  } catch (err) {
    console.error('PUT /notify/me/read/:id error:', err);
    res.status(500).json({ error: 'Failed to mark notification read' });
  }
});

// ── PUT /notify/me/read-all ───────────────────────────────────────────────────
app.put('/notify/me/read-all', requireUser, async (req: Request, res: Response) => {
  const { userId } = req;

  try {
    await pool.query(
      'UPDATE notify.notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /notify/me/read-all error:', err);
    res.status(500).json({ error: 'Failed to mark all read' });
  }
});

// ── POST /notify/send ────────────────────────────────────────────────────────
app.post('/notify/send', async (req: Request, res: Response) => {
  const { userId, type, title, body, data } = req.body as {
    userId?: number;
    type?: string;
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
  };

  if (!userId || !type || !title) {
    res.status(400).json({ error: 'userId, type, and title are required' });
    return;
  }

  try {
    // Insert into DB
    const result = await pool.query<{
      id: number; type: string; title: string; body: string | null;
      data: Record<string, unknown>; created_at: Date;
    }>(
      `INSERT INTO notify.notifications (user_id, type, title, body, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, type, title, body, data, created_at`,
      [userId, type, title, body || null, data || {}]
    );

    const notif = result.rows[0];
    const sseEvent = {
      id: notif.id,
      type: notif.type,
      title: notif.title,
      body: notif.body ?? undefined,
      data: notif.data,
      createdAt: notif.created_at.toISOString(),
    };

    // Broadcast via SSE
    sendToUser(userId, sseEvent);

    // Send email if enabled
    const prefsRes = await pool.query<{ email_enabled: boolean }>(
      'SELECT email_enabled FROM notify.notification_prefs WHERE user_id = $1',
      [userId]
    );
    const hasPrefs = prefsRes.rows.length > 0;
    const emailEnabled = hasPrefs ? prefsRes.rows[0].email_enabled : true;

    if (emailEnabled) {
      // TODO: resolve user email from teamflow-api or cache it
      // For now, skip email if no SMTP_USER configured
      const userEmail = req.headers['x-user-email'] as string | undefined;
      if (userEmail && process.env.SMTP_USER) {
        await sendEmail(userEmail, title, body || title);
      }
    }

    res.status(201).json({ ok: true, notification: sseEvent });
  } catch (err) {
    console.error('POST /notify/send error:', err);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// ── Init schema ───────────────────────────────────────────────────────────────
async function initSchema(): Promise<void> {
  try {
    const sql = await import('fs').then(fs => fs.readFileSync('./src/db/schema.sql', 'utf8'));
    await pool.query(sql);
    console.log('Notify schema initialised');
  } catch (err) {
    console.error('Schema init failed:', err);
  }
}

// ── Start ────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  await initSchema();
  startKeepAlive();

  app.listen(PORT, () => {
    console.log(`notify-svc listening on port ${PORT}`);
  });
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});