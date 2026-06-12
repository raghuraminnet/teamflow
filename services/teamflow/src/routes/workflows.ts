import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { workflowTemplates, workflowRuns } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware, adminOnly, type AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../services/activity-logger.js';

const router = Router();
router.use(authMiddleware);

const WorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggerType: z.enum(['manual', 'scheduled', 'event']).optional(),
  stepsJson: z.array(z.object({
    id: z.string(),
    type: z.string(),
    config: z.record(z.any()),
  })).optional().default([]),
  scheduleExpr: z.string().optional(),
  isActive: z.boolean().optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  const rows = await db.select().from(workflowTemplates).orderBy(workflowTemplates.createdAt);
  return res.json({ data: rows });
});

router.post('/', adminOnly, async (req: AuthRequest, res) => {
  const parse = WorkflowSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.errors });

  const [row] = await db.insert(workflowTemplates).values({
    ...parse.data,
    triggerType: parse.data.triggerType ?? 'manual',
    isActive: parse.data.isActive ?? true,
  }).returning();

  return res.status(201).json({ data: row });
});

router.get('/:id', async (req: AuthRequest, res) => {
  const [row] = await db.select().from(workflowTemplates)
    .where(eq(workflowTemplates.id, Number(req.params.id))).limit(1);
  if (!row) return res.status(404).json({ error: 'Not found' });
  return res.json({ data: row });
});

router.put('/:id', adminOnly, async (req: AuthRequest, res) => {
  const parse = WorkflowSchema.partial().safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.errors });

  const [row] = await db.update(workflowTemplates)
    .set(parse.data)
    .where(eq(workflowTemplates.id, Number(req.params.id)))
    .returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  return res.json({ data: row });
});

router.delete('/:id', adminOnly, async (req: AuthRequest, res) => {
  const [row] = await db.delete(workflowTemplates)
    .where(eq(workflowTemplates.id, Number(req.params.id))).returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  return res.json({ message: 'Workflow template deleted' });
});

// Trigger a workflow run
router.post('/:id/run', async (req: AuthRequest, res) => {
  const [template] = await db.select().from(workflowTemplates)
    .where(eq(workflowTemplates.id, Number(req.params.id))).limit(1);
  if (!template) return res.status(404).json({ error: 'Not found' });

  const { projectId } = req.body;
  const [run] = await db.insert(workflowRuns).values({
    templateId: template.id,
    projectId: projectId ? Number(projectId) : null,
    triggeredBy: req.user!.userId,
    status: 'running',
  }).returning();

  await logActivity({
    userId: req.user!.userId,
    projectId: projectId ? Number(projectId) : undefined,
    action: 'workflow_triggered',
    details: { templateId: template.id, templateName: template.name, runId: run.id },
  });

  // Execute workflow steps asynchronously
  runWorkflow(run.id, template.stepsJson as any[], req.user!.userId).catch(console.error);

  return res.status(201).json({ data: run });
});

router.get('/:id/runs', async (req: AuthRequest, res) => {
  const rows = await db.select().from(workflowRuns)
    .where(eq(workflowRuns.templateId, Number(req.params.id)))
    .orderBy(desc(workflowRuns.startedAt));
  return res.json({ data: rows });
});

async function runWorkflow(runId: number, steps: any[], userId: number) {
  const results: any[] = [];
  for (const step of steps) {
    try {
      let result: any;
      switch (step.type) {
        case 'create_task':
          // Step.config: { projectId, title, assignedTo }
          if (step.config?.projectId && step.config?.title) {
            const { tasks } = await import('../db/schema.js');
            const [task] = await db.insert(tasks).values({
              projectId: step.config.projectId,
              title: step.config.title,
              description: step.config.description ?? '',
              assignedTo: step.config.assignedTo ?? null,
              priority: step.config.priority ?? 'medium',
              createdBy: userId,
            }).returning();
            result = { taskId: task.id };
          }
          break;
        case 'delay':
          // Step.config: { ms }
          if (step.config?.ms) {
            await new Promise(r => setTimeout(r, step.config.ms));
            result = { delayed: step.config.ms };
          }
          break;
        case 'webhook':
          // Step.config: { url, method, headers, body }
          if (step.config?.url) {
            const resp = await fetch(step.config.url, {
              method: step.config.method ?? 'POST',
              headers: step.config.headers ?? { 'Content-Type': 'application/json' },
              body: step.config.body ? JSON.stringify(step.config.body) : undefined,
            });
            result = { status: resp.status, ok: resp.ok };
          }
          break;
        default:
          result = { skipped: true, reason: `Unknown step type: ${step.type}` };
      }
      results.push({ stepId: step.id, result });
    } catch (err: any) {
      results.push({ stepId: step.id, error: err.message });
    }
  }

  await db.update(workflowRuns)
    .set({ status: 'completed', completedAt: new Date(), resultJson: { steps: results } })
    .where(eq(workflowRuns.id, runId));
}

export default router;