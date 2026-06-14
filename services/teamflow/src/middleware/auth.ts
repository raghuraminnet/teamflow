import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { type JwtPayload } from '../utils/jwt.js';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  // Inject x-original-url so proxy can reconstruct the full path (Express strips mount prefix)
  if (!req.headers['x-original-url']) {
    const full = (req as Request & { originalUrl?: string }).originalUrl ?? req.url ?? '';
    req.headers['x-original-url'] = full;
  }

  // Gateway injects X-User-Id when it validates the JWT — trust it for proxied requests
  const userId = req.headers['x-user-id'] as string | undefined;
  const userRole = req.headers['x-user-role'] as string | undefined;
  const userEmail = req.headers['x-user-email'] as string | undefined;

  if (userId) {
    // Proxied request — gateway already validated JWT
    req.user = { userId: parseInt(userId, 10), role: userRole as 'admin' | 'team_member', email: userEmail ?? '' };
    return next();
  }

  // Direct request — verify JWT ourselves
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
