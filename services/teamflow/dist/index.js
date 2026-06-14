import http from 'http';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import activityRoutes from './routes/activity.js';
import workflowRoutes from './routes/workflows.js';
import kbRoutes from './routes/kb.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/uploads.js';
import { verifyAccessToken } from './utils/jwt.js';
const app = express();
app.use(cors());
app.use(express.json());
// Health
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
// Public
app.use('/api/auth', authRoutes);
// Protected native routes
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/kb', kbRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);
// ── Microservice Proxies ─────────────────────────────────────────────────
// Raw HTTP proxy: intercepts /api/voice/* and /api/notify/* BEFORE Express routing,
// streams directly to the target service. This avoids Express body consumption issues.
function makeRawProxy(targetHost, targetPort, fromPrefix, toPrefix) {
    return function (req, res) {
        const rawUrl = req.headers['x-original-url'] ?? req.url ?? '';
        // Strip fromPrefix from rawUrl; toPrefix is the new base
        // Special case: notify service has /health at root (not /notify/health)
        let mapped;
        if (fromPrefix === '/api/notify') {
            if (rawUrl.includes('/sse')) {
                // SSE: /api/notify/sse → /notify/sse
                mapped = rawUrl.replace('/api/notify', '/notify');
            }
            else {
                // Everything else: strip /api/notify entirely → /health, /campaigns, etc.
                mapped = rawUrl.replace('/api/notify', '');
            }
        }
        else {
            mapped = rawUrl.replace(fromPrefix, toPrefix);
        }
        const [targetPath, targetQuery] = mapped.split('?');
        const targetSearch = targetQuery ? `?${targetQuery}` : '';
        const fullTarget = `http://${targetHost}:${targetPort}${targetPath}${targetSearch}`;
        // Inject auth headers from JWT
        const authHdr = req.headers.authorization;
        if (authHdr?.startsWith('Bearer ')) {
            try {
                const payload = verifyAccessToken(authHdr.slice(7));
                req.headers['x-user-id'] = String(payload.userId);
                req.headers['x-user-role'] = payload.role;
                req.headers['x-user-email'] = payload.email ?? '';
            }
            catch { }
        }
        // Build clean proxy headers
        const proxyHeaders = {};
        for (const [k, v] of Object.entries(req.headers)) {
            if (!v)
                continue;
            if (['host', 'connection', 'content-length', 'content-encoding', 'transfer-encoding', 'x-original-url'].includes(k))
                continue;
            proxyHeaders[k] = Array.isArray(v) ? v[0] : v;
        }
        console.log(`[proxy] ${req.method} ${rawUrl} → ${fullTarget}`);
        // For GET/HEAD with no body: use http.get (simpler, no manual req.end() needed)
        if (req.method === 'GET' || req.method === 'HEAD') {
            const proxyReq = http.get({
                hostname: targetHost,
                port: targetPort,
                path: targetPath + targetSearch,
                headers: proxyHeaders,
            }, (proxyRes) => {
                console.log(`[proxy][get] ${fullTarget} ← ${proxyRes.statusCode}`);
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                proxyRes.pipe(res);
            });
            proxyReq.on('error', (err) => { if (!res.writableEnded) {
                res.statusCode = 502;
                res.end();
            } console.error(`[proxy] err:`, err.message); });
            proxyReq.on('timeout', () => { proxyReq.destroy(); if (!res.writableEnded) {
                res.statusCode = 504;
                res.end();
            } console.error(`[proxy] timeout`); });
            proxyReq.setTimeout(8000);
            return;
        }
        // For methods with body (POST/PUT/PATCH)
        const proxyReq = http.request({
            hostname: targetHost,
            port: targetPort,
            path: targetPath + targetSearch,
            method: req.method,
            headers: proxyHeaders,
        }, (proxyRes) => {
            console.log(`[proxy] ${fullTarget} ← ${proxyRes.statusCode}`);
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });
        proxyReq.on('error', (err) => {
            console.error(`[proxy] error:`, err.message);
            if (!res.writableEnded) {
                res.statusCode = 502;
                res.end();
            }
        });
        proxyReq.on('timeout', () => {
            console.error(`[proxy] timeout: ${fullTarget}`);
            proxyReq.destroy();
            if (!res.writableEnded) {
                res.statusCode = 504;
                res.end();
            }
        });
        proxyReq.setTimeout(8000);
        req.on('data', (chunk) => proxyReq.write(chunk));
        req.on('end', () => proxyReq.end());
        req.on('error', (err) => { proxyReq.destroy(); console.error(`[proxy] client err:`, err.message); });
    };
}
// Use raw HTTP server so proxy routes bypass Express routing entirely.
// Express handler is called only for non-proxy routes.
const expressHandler = app;
const server = http.createServer((req, res) => {
    // Gateway strips /api prefix: teamflow-api receives /voice/* not /api/voice/*
    // But x-original-url from gateway preserves original /api/voice/*
    const originalUrl = req.headers['x-original-url'] ?? req.url ?? '';
    const urlToCheck = originalUrl || req.url || '';
    console.log(`[server] ${req.method} ${req.url} orig=${originalUrl}`);
    if (urlToCheck.startsWith('/api/voice')) {
        makeRawProxy('teamflow-voice', 3002, '/api/voice', '/voice')(req, res);
    }
    else if (urlToCheck.startsWith('/api/notify')) {
        makeRawProxy('teamflow-notify', 3003, '/api/notify', '/notify')(req, res);
    }
    else {
        expressHandler(req, res);
    }
});
server.listen(parseInt(process.env.PORT || '3001'), '0.0.0.0', () => {
    console.log(`TeamFlow API running on port ${process.env.PORT || '3001'}`);
});
export default app;
