import { verifyAccessToken } from '../utils/jwt.js';
export function authMiddleware(req, res, next) {
    // Inject x-original-url so proxy can reconstruct the full path (Express strips mount prefix)
    if (!req.headers['x-original-url']) {
        const full = req.originalUrl ?? req.url ?? '';
        req.headers['x-original-url'] = full;
    }
    // Gateway injects X-User-Id when it validates the JWT — trust it for proxied requests
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];
    const userEmail = req.headers['x-user-email'];
    if (userId) {
        // Proxied request — gateway already validated JWT
        req.user = { userId: parseInt(userId, 10), role: userRole, email: userEmail ?? '' };
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
    }
    catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
export function adminOnly(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}
