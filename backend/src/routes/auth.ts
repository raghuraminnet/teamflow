import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

const router = Router();

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'team_member']).optional().default('team_member'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register — admin only in production, but first user is admin
router.post('/register', async (req, res) => {
  const parse = RegisterSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.errors });

  const { name, email, password, role } = parse.data;

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' });

  const hash = await bcrypt.hash(password, 12);
  // First registered user is always admin
  const allUsers = await db.select().from(users);
  const isAdmin = allUsers.length === 0;

  const [user] = await db.insert(users).values({
    name,
    email,
    passwordHash: hash,
    role: isAdmin ? 'admin' : role,
  }).returning();

  const payload = { userId: user.id, email: user.email, role: user.role };
  return res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  });
});

router.post('/login', async (req, res) => {
  const parse = LoginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.errors });

  const { email, password } = parse.data;
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const payload = { userId: user.id, email: user.email, role: user.role };
  return res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  });
});

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
  try {
    const payload = verifyRefreshToken(refreshToken);
    return res.json({ accessToken: signAccessToken(payload) });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

export default router;