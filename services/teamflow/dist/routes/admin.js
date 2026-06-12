import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users, tasks, projects, clients, activityLog } from '../db/schema.js';
import { eq, sql, desc, count } from 'drizzle-orm';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
const router = Router();
router.use(authMiddleware);
router.use(adminOnly);
// List users
router.get('/users', async (_req, res) => {
    const rows = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
    }).from(users).orderBy(users.createdAt);
    return res.json({ data: rows });
});
router.post('/users', async (req, res) => {
    const parse = z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(['admin', 'team_member']).optional().default('team_member'),
    }).safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: parse.error.errors });
    const { name, email, password, role } = parse.data;
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0)
        return res.status(409).json({ error: 'Email taken' });
    const hash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({ name, email, passwordHash: hash, role }).returning();
    return res.status(201).json({ data: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
router.put('/users/:id', async (req, res) => {
    const parse = z.object({
        name: z.string().min(2).optional(),
        role: z.enum(['admin', 'team_member']).optional(),
        avatarUrl: z.string().optional(),
    }).partial().safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: parse.error.errors });
    const [row] = await db.update(users).set(parse.data).where(eq(users.id, Number(req.params.id))).returning();
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    return res.json({ data: { id: row.id, name: row.name, email: row.email, role: row.role, avatarUrl: row.avatarUrl } });
});
router.delete('/users/:id', async (req, res) => {
    if (Number(req.params.id) === req.user.userId) {
        return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    await db.delete(users).where(eq(users.id, Number(req.params.id)));
    return res.json({ message: 'User deactivated' });
});
// Stats
router.get('/stats', async (_req, res) => {
    const [totalProjects, activeProjects, totalTasks, openTasks, doneTasks, totalClients, totalUsers,] = await Promise.all([
        db.select({ count: count() }).from(projects),
        db.select({ count: count() }).from(projects).where(eq(projects.status, 'active')),
        db.select({ count: count() }).from(tasks),
        db.select({ count: count() }).from(tasks).where(sql `${tasks.status} != 'done'`),
        db.select({ count: count() }).from(tasks).where(eq(tasks.status, 'done')),
        db.select({ count: count() }).from(clients),
        db.select({ count: count() }).from(users),
    ]);
    const recentActivity = await db.select().from(activityLog)
        .orderBy(desc(activityLog.createdAt))
        .limit(20);
    const tasksByStatus = await db.select({
        status: tasks.status,
        count: count(),
    }).from(tasks).groupBy(tasks.status);
    const allUsers = await db.select().from(users);
    const userMap = Object.fromEntries(allUsers.map(u => [u.id, u.name]));
    return res.json({
        data: {
            projects: { total: Number(totalProjects[0].count), active: Number(activeProjects[0].count) },
            tasks: { total: Number(totalTasks[0].count), open: Number(openTasks[0].count), done: Number(doneTasks[0].count) },
            clients: { total: Number(totalClients[0].count) },
            users: { total: Number(totalUsers[0].count) },
            tasksByStatus,
            recentActivity: recentActivity.map(r => ({ ...r, userName: r.userId ? userMap[r.userId] : null })),
        },
    });
});
export default router;
