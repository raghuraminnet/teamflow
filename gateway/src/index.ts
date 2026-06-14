import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import http from 'http';

const PORT = parseInt(process.env.PORT || '3000');
const JWT_SECRET = process.env.JWT_SECRET!;
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '100');
const RATE_LIMIT_IP = parseInt(process.env.RATE_LIMIT_IP || '500');
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

if (!JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

interface JwtPayload {
  sub?: string;
  userId?: number;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
  userEmail?: string;
}

function logRequest(method: string, path: string, userId: string | null, status: number, duration: number) {
  console.log(`${method} ${path} userId=${userId ?? '-'} status=${status} duration=${duration}ms`);
}

const app = express();

app.set('trust proxy', 1);

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ type: 'application/json' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, ts: Date.now() });
});

const ipLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: RATE_LIMIT_IP,
  keyGenerator: (req) => req.ip || 'anonymous',
  handler: (_req, res: Response) => {
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

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some(p => path.startsWith(p));
}

function jwtMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (isPublicPath(req.path)) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.userId = (payload.sub ?? (payload.userId != null ? String(payload.userId) : undefined)) ?? undefined;
    req.userRole = payload.role || 'user';
    req.userEmail = payload.email || '';
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

app.use(ipLimiter);
app.use(jwtMiddleware);
app.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const start = Date.now();
  const method = req.method;
  const path = req.path;
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = (res as Response & { statusCode?: number }).statusCode ?? 0;
    logRequest(method, path, req.userId || null, statusCode, duration);
  });
  next();
});

// ── Raw HTTP Proxy helper ───────────────────────────────────────────────────
// Mirrors the working approach from teamflow-api: uses hostname+port (not host string),
// http.get for GET/HEAD, clean headers.
function rawProxy(targetHost: string, targetPort: number, fromPrefix: string, toPrefix: string) {
  return function(req: AuthenticatedRequest, res: Response) {
    // req.url is stripped of mount prefix by Express. Use req.originalUrl to get the full path.
    const rawUrl = (req as Request & { originalUrl?: string }).originalUrl ?? req.url ?? '';
    const mapped = rawUrl.replace(fromPrefix, toPrefix);
    const [targetPath, targetQuery] = mapped.split('?');
    const targetSearch = targetQuery ? `?${targetQuery}` : '';
    const fullTarget = `http://${targetHost}:${targetPort}${targetPath}${targetSearch}`;
    console.log(`[proxy] ${req.method} ${rawUrl} → ${fullTarget}`);


    // Build clean proxy headers
    const proxyHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-User-Id': req.userId || '',
      'X-User-Role': req.userRole || '',
      'X-User-Email': req.userEmail || '',
    };

    // Use http.get for GET/HEAD
    if (req.method === 'GET' || req.method === 'HEAD') {
      const proxyReq = http.get({
        hostname: targetHost,
        port: targetPort,
        path: targetPath + targetSearch,
        headers: proxyHeaders,
      }, (proxyRes) => {
        console.log(`[proxy] ${fullTarget} ← ${proxyRes.statusCode}`);
        res.writeHead(proxyRes.statusCode!, proxyRes.headers);
        proxyRes.pipe(res);
      });
      proxyReq.on('error', (e) => {
        if (!res.writableEnded) { res.statusCode = 502; res.end(); }
        console.error(`[proxy] error: ${e.message}`);
      });
      proxyReq.setTimeout(8000, () => { proxyReq.destroy(); if (!res.writableEnded) { res.statusCode = 504; res.end(); } console.error(`[proxy] timeout`); });
      return;
    }

    // For methods with body
    const bodyData = req.body ? JSON.stringify(req.body) : '';
    proxyHeaders['Content-Length'] = String(Buffer.byteLength(bodyData));

    const proxyReq = http.request({
      hostname: targetHost,
      port: targetPort,
      path: targetPath + targetSearch,
      method: req.method,
      headers: proxyHeaders,
    }, (proxyRes) => {
      console.log(`[proxy] ${fullTarget} ← ${proxyRes.statusCode}`);
      res.writeHead(proxyRes.statusCode!, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (e) => {
      if (!res.writableEnded) { res.statusCode = 502; res.end(); }
      console.error(`[proxy] error: ${e.message}`);
    });
    proxyReq.setTimeout(8000, () => { proxyReq.destroy(); if (!res.writableEnded) { res.statusCode = 504; res.end(); } console.error(`[proxy] timeout`); });
    if (bodyData) proxyReq.write(bodyData);
    proxyReq.end();
  };
}

// ── Proxies ────────────────────────────────────────────────────────────────
// /api/* → teamflow-api:3001/api/*
// For GET/HEAD: use http.get without Content-Type/Length headers
// For body methods: only send headers when there's actually a body
app.use('/api', (req: AuthenticatedRequest, res: Response) => {
  const hasBody = req.body != null && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH');
  const bodyData = hasBody ? JSON.stringify(req.body) : '';
  const headers: Record<string, string> = {
    'X-User-Id': req.userId || '',
    'X-User-Role': req.userRole || '',
    'X-User-Email': req.userEmail || '',
  };
  if (bodyData) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = String(Buffer.byteLength(bodyData));
  }

  const opts: http.RequestOptions = {
    hostname: 'teamflow-api', port: 3001,
    path: '/api' + req.path, method: req.method, headers,
  };

  const proxyReq = (req.method === 'GET' || req.method === 'HEAD')
    ? http.get(opts, handleProxyRes)
    : http.request(opts, handleProxyRes);

  function handleProxyRes(proxyRes: http.IncomingMessage) {
    res.writeHead(proxyRes.statusCode ?? 500, proxyRes.headers);
    proxyRes.pipe(res);
  }

  proxyReq.on('error', (e) => {
    if (!res.writableEnded) { res.statusCode = 502; res.end(); }
  });
  proxyReq.setTimeout(8000, () => { proxyReq.destroy(); if (!res.writableEnded) { res.statusCode = 504; res.end(); } });

  if (bodyData) proxyReq.write(bodyData);
  proxyReq.end();
});

// /uploads/* → teamflow-api:3001/api/uploads/*
app.use('/uploads', (req: AuthenticatedRequest, res: Response) => {
  const bodyData = req.body ? JSON.stringify(req.body) : '';
  const proxyReq = http.request({
    hostname: 'teamflow-api',
    port: 3001,
    path: '/api/uploads' + req.url.slice('/uploads'.length),
    method: req.method,
    headers: {
      'Content-Type': req.headers['content-type'] || 'application/json',
      'Content-Length': Buffer.byteLength(bodyData),
      'X-User-Id': req.userId || '',
      'X-User-Role': req.userRole || '',
      'X-User-Email': req.userEmail || '',
      'Connection': 'close',
    },
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 500, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (e) => {
    if (!res.writableEnded) { res.statusCode = 502; res.end(); }
  });
  if (bodyData) proxyReq.write(bodyData);
  proxyReq.end();
});

// /voice/* → teamflow-voice:3002/voice/*
app.use('/voice', rawProxy('teamflow-voice', 3002, '/voice', '/voice'));

// Debug endpoint
app.get('/voice-debug', rawProxy('teamflow-voice', 3002, '/voice', '/voice'));
// /notify/* → teamflow-notify:3003/*
// notify service has /health at root, /notify/sse for SSE
app.use('/notify', function(req: AuthenticatedRequest, res: Response) {
  const rawUrl = (req as Request & { originalUrl?: string }).originalUrl ?? req.url ?? '';
  const isSSE = rawUrl.includes('/sse');
  const mapped = isSSE
    ? rawUrl.replace('/notify', '/notify') // SSE: keep /notify/sse
    : rawUrl.replace('/notify', '');       // else: strip /notify → /health, /contacts, etc.
  const [targetPath, targetQuery] = mapped.split('?');
  const targetSearch = targetQuery ? `?${targetQuery}` : '';
  const fullTarget = `http://teamflow-notify:3003${targetPath}${targetSearch}`;
  console.log(`[proxy] ${req.method} ${rawUrl} → ${fullTarget}`);

  const proxyHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-User-Id': req.userId || '',
    'X-User-Role': req.userRole || '',
    'X-User-Email': req.userEmail || '',
  };


  if (req.method === 'GET' || req.method === 'HEAD') {
    const proxyReq = http.get({
      hostname: 'teamflow-notify', port: 3003,
      path: targetPath + targetSearch,
      headers: proxyHeaders,
    }, (proxyRes) => {
      console.log(`[proxy] ${fullTarget} ← ${proxyRes.statusCode}`);
      res.writeHead(proxyRes.statusCode!, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (e) => { if (!res.writableEnded) { res.statusCode = 502; res.end(); } console.error(`[proxy] error: ${e.message}`); });
    proxyReq.setTimeout(8000, () => { proxyReq.destroy(); if (!res.writableEnded) { res.statusCode = 504; res.end(); } console.error(`[proxy] timeout`); });
    return;
  }

  const bodyData = req.body ? JSON.stringify(req.body) : '';
  proxyHeaders['Content-Length'] = String(Buffer.byteLength(bodyData));
  const proxyReq = http.request({
    hostname: 'teamflow-notify', port: 3003,
    path: targetPath + targetSearch, method: req.method, headers: proxyHeaders,
  }, (proxyRes) => {
    console.log(`[proxy] ${fullTarget} ← ${proxyRes.statusCode}`);
    res.writeHead(proxyRes.statusCode!, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (e) => { if (!res.writableEnded) { res.statusCode = 502; res.end(); } console.error(`[proxy] error: ${e.message}`); });
  proxyReq.setTimeout(8000, () => { proxyReq.destroy(); if (!res.writableEnded) { res.statusCode = 504; res.end(); } console.error(`[proxy] timeout`); });
  if (bodyData) proxyReq.write(bodyData);
  proxyReq.end();
});
// /ws/* → teamflow-notify:3003/notify/sse (WebSocket upgrade)
app.use('/ws', (req: AuthenticatedRequest, res: Response) => {
  const targetPath = '/notify/sse';
  const proxyReq = http.request({
    hostname: 'teamflow-notify',
    port: 3003,
    path: targetPath + (req.url.includes('?') ? req.url.replace('/ws', '') : ''),
    method: req.method,
    headers: {
      'X-User-Id': req.userId || '',
      'X-User-Role': req.userRole || '',
      'X-User-Email': req.userEmail || '',
      'Upgrade': req.headers['upgrade'] || 'websocket',
      'Connection': req.headers['connection'] || 'upgrade',
      'Sec-WebSocket-Key': req.headers['sec-websocket-key'] || '',
      'Sec-WebSocket-Version': req.headers['sec-websocket-version'] || '',
    },
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 500, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (e) => { if (!res.writableEnded) { res.statusCode = 502; res.end(); } });
  req.pipe(proxyReq);
  proxyReq.on('response', (proxyRes) => { proxyRes.pipe(res); });
});

// ── 404 & Error Handlers ───────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TeamFlow Gateway listening on port ${PORT}`);
  console.log(`Proxy targets: teamflow-api:3001, teamflow-voice:3002, teamflow-notify:3003`);
});

export default app;