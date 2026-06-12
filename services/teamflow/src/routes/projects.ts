import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { projects, tasks, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, adminOnly, type AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../services/activity-logger.js';

const router = Router();
router.use(authMiddleware);

const ProjectSchema = z.object({
  clientId: z.number().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  const { clientId, status } = req.query;
  const conditions = [];
  if (clientId) conditions.push(eq(projects.clientId, Number(clientId)));
  if (status) conditions.push(eq(projects.status, status as 'active' | 'paused' | 'completed' | 'archived'));

  const rows = await db.select().from(projects)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(projects.createdAt);

  return res.json({ data: rows });
});

router.post('/', adminOnly, async (req: AuthRequest, res) => {
  const parse = ProjectSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.errors });

  const [row] = await db.insert(projects).values({
    ...parse.data,
    status: parse.data.status ?? 'active',
  }).returning();

  await logActivity({
    userId: req.user!.userId,
    projectId: row.id,
    action: 'project_created',
    details: { name: row.name },
  });

  return res.status(201).json({ data: row });
});

router.get('/:id', async (req: AuthRequest, res) => {
  const [row] = await db.select().from(projects).where(eq(projects.id, Number(req.params.id))).limit(1);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const projectTasks = await db.select({
    id: tasks.id,
    title: tasks.title,
    description: tasks.description,
    status: tasks.status,
    priority: tasks.priority,
    dueDate: tasks.dueDate,
    projectId: tasks.projectId,
    assignedTo: tasks.assignedTo,
    createdBy: tasks.createdBy,
    createdAt: tasks.createdAt,
    updatedAt: tasks.updatedAt,
  }).from(tasks).where(eq(tasks.projectId, row.id)).orderBy(tasks.createdAt);

  // Get assignee names
  const assigneeIds = [...new Set(projectTasks.map(t => t.assignedTo).filter(Boolean))];
  let assigneeMap: Record<number, string> = {};
  if (assigneeIds.length > 0) {
    const assigneeUsers = await db.select().from(users).orderBy(users.name);
    assigneeMap = Object.fromEntries(assigneeUsers.map(u => [u.id, u.name]));
  }

  return res.json({
    data: {
      ...row,
      tasks: projectTasks.map(t => ({
        ...t,
        assigneeName: t.assignedTo ? assigneeMap[t.assignedTo] : null,
      })),
    },
  });
});

router.put('/:id', async (req: AuthRequest, res) => {
  const parse = ProjectSchema.partial().safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.errors });

  const [row] = await db.update(projects)
    .set({ ...parse.data, updatedAt: new Date() })
    .where(eq(projects.id, Number(req.params.id)))
    .returning();

  if (!row) return res.status(404).json({ error: 'Not found' });

  await logActivity({
    userId: req.user!.userId,
    projectId: row.id,
    action: 'updated',
    details: { name: row.name, changes: Object.keys(parse.data) },
  });

  return res.json({ data: row });
});

router.delete('/:id', adminOnly, async (req: AuthRequest, res) => {
  const [row] = await db.delete(projects).where(eq(projects.id, Number(req.params.id))).returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  return res.json({ message: 'Project archived' });
});

export default router;