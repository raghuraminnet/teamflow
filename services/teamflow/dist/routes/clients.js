import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { clients } from '../db/schema.js';
import { eq, like } from 'drizzle-orm';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { logActivity } from '../services/activity-logger.js';
const router = Router();
router.use(authMiddleware);
const ClientSchema = z.object({
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    company: z.string().optional(),
    notes: z.string().optional(),
});
router.get('/', async (req, res) => {
    const { search } = req.query;
    if (search) {
        const rows = await db.select().from(clients).where(like(clients.name, `%${search}%`)).orderBy(clients.createdAt);
        return res.json({ data: rows });
    }
    const rows = await db.select().from(clients).orderBy(clients.createdAt);
    return res.json({ data: rows });
});
router.post('/', adminOnly, async (req, res) => {
    const parse = ClientSchema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: parse.error.errors });
    const [row] = await db.insert(clients).values(parse.data).returning();
    await logActivity({ userId: req.user.userId, action: 'created', details: { clientId: row.id, name: row.name } });
    return res.status(201).json({ data: row });
});
router.get('/:id', async (req, res) => {
    const [row] = await db.select().from(clients).where(eq(clients.id, Number(req.params.id))).limit(1);
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    return res.json({ data: row });
});
router.put('/:id', adminOnly, async (req, res) => {
    const parse = ClientSchema.partial().safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: parse.error.errors });
    const [row] = await db.update(clients)
        .set({ ...parse.data, updatedAt: new Date() })
        .where(eq(clients.id, Number(req.params.id)))
        .returning();
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    return res.json({ data: row });
});
router.delete('/:id', adminOnly, async (req, res) => {
    const [row] = await db.delete(clients).where(eq(clients.id, Number(req.params.id))).returning();
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    return res.json({ message: 'Client deleted' });
});
export default router;
