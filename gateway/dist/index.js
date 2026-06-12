import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { createProxyMiddleware } from 'http-proxy-middleware';
import http from 'http';
const PORT = parseInt(process.env.PORT || '3000');
const JWT_SECRET = process.env.JWT_SECRET;
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '100');
const RATE_LIMIT_IP = parseInt(process.env.RATE_LIMIT_IP || '500');
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
if (!JWT_SECRET) {
    console.error('JWT_SECRET environment variable is required');
    process.exit(1);
}
function logRequest(method, path, userId, status, duration) {
    console.log(`${method} ${path} userId=${userId ?? '-'} status=${status} duration=${duration}ms`);
}
const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ type: 'application/json' }));
app.get('/health', (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
});
const ipLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: RATE_LIMIT_IP,
    keyGenerator: (req) => req.ip || 'anonymous',
    handler: (_req, res) => {
        res.status(429).json({ error: 'Too many requests, please try again later.' });
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
});
const PUBLIC_PATHS = [
    '/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/uploads',
];
function isPublicPath(path) {
    return PUBLIC_PATHS.some(p => path.startsWith(p));
}
function jwtMiddleware(req, res, next) {
    if (isPublicPath(req.path))
        return next();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.slice(7);
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.userId = (payload.sub ?? (payload.userId != null ? String(payload.userId) : undefined)) ?? undefined;
        req.userRole = payload.role || 'user';
        req.userEmail = payload.email || '';
        next();
    }
    catch {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}
app.use(ipLimiter);
app.use(jwtMiddleware);
app.use((req, res, next) => {
    const start = Date.now();
    const method = req.method;
    const path = req.path;
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode ?? 0;
        logRequest(method, path, req.userId || null, statusCode, duration);
    });
    next();
});
// ── /api proxy: use native http.request with .on('response') ───────────────
app.use('/api', (req, res) => {
    const bodyData = req.body ? JSON.stringify(req.body) : '';
    const headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyData),
        'X-User-Id': req.userId || '',
        'X-User-Role': req.userRole || '',
        'X-User-Email': req.userEmail || '',
        'Host': 'teamflow-api:3001',
        'Connection': 'close',
    };
    const proxyReq = http.request({
        host: 'teamflow-api',
        port: 3001,
        path: '/api' + req.path,
        method: req.method,
        headers,
    });
    proxyReq.on('error', (e) => {
        console.error('API proxy error:', e.message);
        if (!res.writableEnded) {
            res.statusCode = 502;
            res.end();
        }
    });
    proxyReq.on('response', (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 500, proxyRes.headers);
        proxyRes.pipe(res);
    });
    if (bodyData)
        proxyReq.write(bodyData);
    proxyReq.end();
});
// ── Other proxies ───────────────────────────────────────────────────────────
function buildProxyConfig(pathPrefix, targetHost, ws = false) {
    return {
        target: `http://${targetHost}`,
        changeOrigin: true,
        ws,
        on: {
            proxyReq: (proxyReq, req) => {
                proxyReq.removeHeader('host');
                proxyReq.removeHeader('connection');
                const authReq = req;
                if (authReq.userId)
                    proxyReq.setHeader('X-User-Id', authReq.userId);
                if (authReq.userRole)
                    proxyReq.setHeader('X-User-Role', authReq.userRole);
                if (authReq.userEmail)
                    proxyReq.setHeader('X-User-Email', authReq.userEmail);
            },
            error: (_err, _req, res) => {
                if (res && typeof res === 'object' && 'statusCode' in res) {
                    res.statusCode = 502;
                    res.end?.();
                }
            },
        },
    };
}
app.use('/uploads', createProxyMiddleware({
    target: 'http://teamflow-api:3001',
    changeOrigin: true,
    pathRewrite: { '^/uploads': '/api/uploads' },
    on: {
        proxyReq: (proxyReq, req) => {
            proxyReq.removeHeader('host');
            proxyReq.removeHeader('connection');
            const authReq = req;
            if (authReq.userId)
                proxyReq.setHeader('X-User-Id', authReq.userId);
            if (authReq.userRole)
                proxyReq.setHeader('X-User-Role', authReq.userRole);
        },
        error: (_err, _req, res) => {
            if (res && typeof res === 'object' && 'statusCode' in res) {
                res.statusCode = 502;
                res.end?.();
            }
        },
    },
}));
app.use('/voice', createProxyMiddleware(buildProxyConfig('/voice', 'voice-svc:3002')));
app.use('/notify', createProxyMiddleware(buildProxyConfig('/notify', 'notify-svc:3003')));
app.use('/ws', createProxyMiddleware(buildProxyConfig('/notify/sse', 'notify-svc:3003', true)));
// ── 404 & Error Handlers ───────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`TeamFlow Gateway listening on port ${PORT}`);
    console.log(`Proxy targets: teamflow-api:3001, voice-svc:3002, notify-svc:3003`);
});
export default app;
