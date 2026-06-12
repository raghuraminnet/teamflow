import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { tasks, comments, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../services/activity-logger.js';

const router = Router();
router.use(authMiddleware);

const TaskSchema = z.object({
  projectId: z.number(),
  title: z.string().min(1),
  description: z.string().optional(),
  assignedTo: z.number().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'blocked']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  const { projectId, assignedTo, status, priority } = req.query;
  const conditions = [];
  if (projectId) conditions.push(eq(tasks.projectId, Number(projectId)));
  if (assignedTo) conditions.push(eq(tasks.assignedTo, Number(assignedTo)));
  if (status) conditions.push(eq(tasks.status, status as any));
  if (priority) conditions.push(eq(tasks.priority, priority as any));

  const rows = await db.select().from(tasks)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(tasks.createdAt);

  // Hydrate assignee + creator names
  const allUserIds = [...new Set(rows.map(r => [r.assignedTo, r.createdBy]).flat().filter(Boolean))] as number[];
  let userMap: Record<number, string> = {};
  if (allUserIds.length > 0) {
    const allUsers = await db.select().from(users);
    userMap = Object.fromEntries(allUsers.map(u => [u.id, u.name]));
  }

  return res.json({
    data: rows.map(t => ({
      ...t,
      assigneeName: t.assignedTo ? userMap[t.assignedTo] : null,
      creatorName: userMap[t.createdBy] ?? null,
    })),
  });
});

router.post('/', async (req: AuthRequest, res) => {
  const parse = TaskSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.errors });

  const [row] = await db.insert(tasks).values({
    ...parse.data,
    dueDate: parse.data.dueDate ? new Date(parse.data.dueDate) : null,
    createdBy: req.user!.userId,
    status: parse.data.status ?? 'todo',
    priority: parse.data.priority ?? 'medium',
  }).returning();

  await logActivity({
    userId: req.user!.userId,
    projectId: row.projectId,
    taskId: row.id,
    action: 'task_created',
    details: { title: row.title },
  });

  // Hydrate names
  const userMap: Record<number, string> = {};
  const allUsers = await db.select().from(users);
  allUsers.forEach(u => userMap[u.id] = u.name);

  return res.status(201).json({
    data: {
      ...row,
      assigneeName: row.assignedTo ? userMap[row.assignedTo] : null,
      creatorName: userMap[row.createdBy] ?? null,
    },
  });
});

router.get('/:id', async (req: AuthRequest, res) => {
  const [row] = await db.select().from(tasks).where(eq(tasks.id, Number(req.params.id))).limit(1);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const taskComments = await db.select({
    id: comments.id,
    content: comments.content,
    createdAt: comments.createdAt,
    userId: comments.userId,
  }).from(comments).where(eq(comments.taskId, row.id)).orderBy(comments.createdAt);

  const allUsers = await db.select().from(users);
  const userMap = Object.fromEntries(allUsers.map(u => [u.id, u.name]));

  return res.json({
    data: {
      ...row,
      assigneeName: row.assignedTo ? userMap[row.assignedTo] : null,
      creatorName: userMap[row.createdBy] ?? null,
      comments: taskComments.map(c => ({ ...c, userName: userMap[c.userId] ?? 'Unknown' })),
    },
  });
});

router.put('/:id', async (req: AuthRequest, res) => {
  const parse = TaskSchema.partial().safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.errors });

  const { status: newStatus, assignedTo, ...rest } = parse.data;
  const setFields: Record<string, any> = { ...rest, updatedAt: new Date() };
  if (newStatus !== undefined) setFields.status = newStatus;
  const [row] = await db.update(tasks)
    .set(setFields)
    .where(eq(tasks.id, Number(req.params.id)))
    .returning();

  if (!row) return res.status(404).json({ error: 'Not found' });

  if (newStatus && newStatus !== row.status) {
    await logActivity({
      userId: req.user!.userId,
      projectId: row.projectId,
      taskId: row.id,
      action: 'status_changed',
      details: { from: row.status, to: newStatus },
    });
  }

  if (assignedTo && assignedTo !== row.assignedTo) {
    await logActivity({
      userId: req.user!.userId,
      projectId: row.projectId,
      taskId: row.id,
      action: 'assigned',
      details: { to: assignedTo },
    });
  }

  return res.json({ data: row });
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const [row] = await db.delete(tasks).where(eq(tasks.id, Number(req.params.id))).returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  return res.json({ message: 'Task deleted' });
});

// Comments
router.get('/:id/comments', async (req: AuthRequest, res) => {
  const rows = await db.select().from(comments)
    .where(eq(comments.taskId, Number(req.params.id)))
    .orderBy(comments.createdAt);
  const allUsers = await db.select().from(users);
  const userMap = Object.fromEntries(allUsers.map(u => [u.id, u.name]));
  return res.json({ data: rows.map(c => ({ ...c, userName: userMap[c.userId] ?? 'Unknown' })) });
});

router.post('/:id/comments', async (req: AuthRequest, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'content required' });

  const [row] = await db.insert(comments).values({
    taskId: Number(req.params.id),
    userId: req.user!.userId,
    content: content.trim(),
  }).returning();

  await logActivity({
    userId: req.user!.userId,
    taskId: Number(req.params.id),
    action: 'commented',
    details: { commentId: row.id },
  });

  const allUsers = await db.select().from(users);
  const userMap = Object.fromEntries(allUsers.map(u => [u.id, u.name]));

  return res.status(201).json({ data: { ...row, userName: userMap[row.userId] } });
});

export default router;