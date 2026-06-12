import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { knowledgeBase } from '../db/schema.js';
import { eq, like, or } from 'drizzle-orm';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
const router = Router();
router.use(authMiddleware);
const ArticleSchema = z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    fileUrl: z.string().optional(),
});
router.get('/', async (req, res) => {
    const { q, category } = req.query;
    const conditions = [];
    if (q) {
        conditions.push(or(like(knowledgeBase.title, `%${q}%`), like(knowledgeBase.content, `%${q}%`), like(knowledgeBase.category, `%${q}%`)));
    }
    if (category) {
        conditions.push(eq(knowledgeBase.category, category));
    }
    const rows = await db.select().from(knowledgeBase)
        .where(conditions.length > 0 ? or(...conditions) : undefined)
        .orderBy(knowledgeBase.updatedAt);
    return res.json({ data: rows });
});
router.post('/', adminOnly, async (req, res) => {
    const parse = ArticleSchema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: parse.error.errors });
    const [row] = await db.insert(knowledgeBase).values({
        ...parse.data,
        createdBy: req.user.userId,
    }).returning();
    return res.status(201).json({ data: row });
});
router.get('/:id', async (req, res) => {
    const [row] = await db.select().from(knowledgeBase)
        .where(eq(knowledgeBase.id, Number(req.params.id))).limit(1);
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    return res.json({ data: row });
});
router.put('/:id', adminOnly, async (req, res) => {
    const parse = ArticleSchema.partial().safeParse(req.body);
    if (!parse.success)
        return res.status(400).json({ error: parse.error.errors });
    const [row] = await db.update(knowledgeBase)
        .set({ ...parse.data, updatedAt: new Date() })
        .where(eq(knowledgeBase.id, Number(req.params.id)))
        .returning();
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    return res.json({ data: row });
});
router.delete('/:id', adminOnly, async (req, res) => {
    const [row] = await db.delete(knowledgeBase)
        .where(eq(knowledgeBase.id, Number(req.params.id))).returning();
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    return res.json({ message: 'Article deleted' });
});
export default router;
