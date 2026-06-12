import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { voiceAgents, campaigns, callLogs } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export function createAgentRouter() {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const agents = await db.select().from(voiceAgents).orderBy(desc(voiceAgents.createdAt));
      res.json({ data: agents });
    } catch { res.status(500).json({ error: 'Failed to fetch agents' }); }
  });

  router.get('/:id', async (req, res) => {
    try {
      const [agent] = await db.select().from(voiceAgents).where(eq(voiceAgents.id, parseInt(req.params.id)));
      if (!agent) return res.status(404).json({ error: 'Agent not found' });
      const calls = await db.select().from(callLogs).where(eq(callLogs.agentId, parseInt(req.params.id))).orderBy(desc(callLogs.startedAt)).limit(20);
      res.json({ data: { ...agent, recentCalls: calls } });
    } catch { res.status(500).json({ error: 'Failed to fetch agent' }); }
  });

  const CreateSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    type: z.enum(['outbound_campaign', 'inbound_ivr', 'status_check']),
    steps: z.array(z.object({
      id: z.string(), type: z.enum(['speak','collect','condition','transfer','task_update','delay','end']),
      config: z.record(z.unknown()), nextStepId: z.string().optional(),
      branchConditions: z.array(z.object({ keyword: z.string(), nextStepId: z.string() })).optional(),
    })).default([]),
    prompt: z.string().optional(),
    voiceId: z.string().optional(),
    llmProvider: z.enum(['ollama','openai','minimax']).default('minimax'),
    llmModel: z.string().optional(),
  });

  router.post('/', async (req, res) => {
    try {
      const body = CreateSchema.parse(req.body);
      const [agent] = await db.insert(voiceAgents).values({
        name: body.name, description: body.description, type: body.type,
        steps: body.steps, prompt: body.prompt,
        voiceId: body.voiceId || 'en_US-amy-medium',
        llmProvider: body.llmProvider, llmModel: body.llmModel || (body.llmProvider === 'minimax' ? 'MiniMax-Text-01' : body.llmProvider === 'openai' ? 'gpt-4o-mini' : 'llama3.2:latest'),
      }).returning();
      res.status(201).json({ data: agent });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
      res.status(500).json({ error: 'Failed to create agent' });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const [agent] = await db.update(voiceAgents).set({ ...req.body, updatedAt: new Date() })
        .where(eq(voiceAgents.id, parseInt(req.params.id))).returning();
      if (!agent) return res.status(404).json({ error: 'Agent not found' });
      res.json({ data: agent });
    } catch { res.status(500).json({ error: 'Failed to update agent' }); }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await db.delete(voiceAgents).where(eq(voiceAgents.id, parseInt(req.params.id)));
      res.json({ data: { deleted: true } });
    } catch { res.status(500).json({ error: 'Failed to delete agent' }); }
  });

  router.post('/:id/test', async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ error: 'phone required' });
      res.json({ data: { message: 'Test call queued', agentId: req.params.id, phone } });
    } catch { res.status(500).json({ error: 'Failed to initiate test call' }); }
  });

  return router;
}

export function createCampaignRouter() {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const result = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
      res.json({ data: result });
    } catch { res.status(500).json({ error: 'Failed to fetch campaigns' }); }
  });

  router.get('/:id', async (req, res) => {
    try {
      const [c] = await db.select().from(campaigns).where(eq(campaigns.id, parseInt(req.params.id)));
      if (!c) return res.status(404).json({ error: 'Campaign not found' });
      res.json({ data: c });
    } catch { res.status(500).json({ error: 'Failed to fetch campaign' }); }
  });

  const CreateSchema = z.object({
    agentId: z.number(), name: z.string().min(1).max(255),
    description: z.string().optional(), scheduleAt: z.string().datetime().optional(),
    scheduleExpr: z.string().optional(),
    contacts: z.array(z.object({ name: z.string(), phone: z.string(), variables: z.record(z.string()).default({}) })).default([]),
  });

  router.post('/', async (req, res) => {
    try {
      const body = CreateSchema.parse(req.body);
      const [campaign] = await db.insert(campaigns).values({
        agentId: body.agentId, name: body.name, description: body.description,
        scheduleAt: body.scheduleAt ? new Date(body.scheduleAt) : null,
        scheduleExpr: body.scheduleExpr, contactsJson: body.contacts,
        status: body.scheduleAt ? 'scheduled' : 'draft',
      }).returning();
      res.status(201).json({ data: campaign });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
      res.status(500).json({ error: 'Failed to create campaign' });
    }
  });

  router.post('/:id/run', async (req, res) => {
    try {
      const [c] = await db.update(campaigns).set({ status: 'running', startedAt: new Date() })
        .where(eq(campaigns.id, parseInt(req.params.id))).returning();
      if (!c) return res.status(404).json({ error: 'Campaign not found' });
      res.json({ data: { message: 'Campaign started', campaign: c } });
    } catch { res.status(500).json({ error: 'Failed to start campaign' }); }
  });

  router.post('/:id/stop', async (req, res) => {
    try {
      const [c] = await db.update(campaigns).set({ status: 'paused', completedAt: new Date() })
        .where(eq(campaigns.id, parseInt(req.params.id))).returning();
      if (!c) return res.status(404).json({ error: 'Campaign not found' });
      res.json({ data: { message: 'Campaign stopped', campaign: c } });
    } catch { res.status(500).json({ error: 'Failed to stop campaign' }); }
  });

  return router;
}

export function createCallLogsRouter() {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || '50'), 200);
      const result = await db.select().from(callLogs).orderBy(desc(callLogs.startedAt)).limit(limit);
      res.json({ data: result });
    } catch { res.status(500).json({ error: 'Failed to fetch call logs' }); }
  });

  router.get('/:id', async (req, res) => {
    try {
      const [call] = await db.select().from(callLogs).where(eq(callLogs.id, parseInt(req.params.id)));
      if (!call) return res.status(404).json({ error: 'Call not found' });
      res.json({ data: call });
    } catch { res.status(500).json({ error: 'Failed to fetch call' }); }
  });

  return router;
}
