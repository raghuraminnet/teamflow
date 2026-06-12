import { Router } from 'express';
import { db } from '../db/index.js';
import { activityLog, users } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
const router = Router();
router.use(authMiddleware);
// Global activity feed — admin only
router.get('/', adminOnly, async (_req, res) => {
    const rows = await db.select().from(activityLog)
        .orderBy(desc(activityLog.createdAt))
        .limit(100);
    const allUsers = await db.select().from(users);
    const userMap = Object.fromEntries(allUsers.map(u => [u.id, u.name]));
    return res.json({
        data: rows.map(r => ({ ...r, userName: r.userId ? userMap[r.userId] : null })),
    });
});
// Project activity feed
router.get('/project/:id', async (req, res) => {
    const rows = await db.select().from(activityLog)
        .where(eq(activityLog.projectId, Number(req.params.id)))
        .orderBy(desc(activityLog.createdAt))
        .limit(100);
    const allUsers = await db.select().from(users);
    const userMap = Object.fromEntries(allUsers.map(u => [u.id, u.name]));
    return res.json({
        data: rows.map(r => ({ ...r, userName: r.userId ? userMap[r.userId] : null })),
    });
});
export default router;
