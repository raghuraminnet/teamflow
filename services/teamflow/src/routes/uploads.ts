import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { authMiddleware, adminOnly, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── Directory setup ──────────────────────────────────────────────────────────
const UPLOADS_DIR = '/app/uploads';
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─── Multer config ─────────────────────────────────────────────────────────────
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip',
]);

const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'txt', 'zip']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).replace(/^\./, '').toLowerCase();
    const ts = Date.now();
    const rand = uuidv4().replace(/-/g, '').slice(0, 8);
    cb(null, `${ts}-${rand}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).replace(/^\./, '').toLowerCase();
    if (!ALLOWED_EXTS.has(ext) || !ALLOWED_MIMES.has(file.mimetype)) {
      return cb(new Error(`File type not allowed. Allowed: ${[...ALLOWED_EXTS].join(', ')}`));
    }
    cb(null, true);
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
interface UploadMeta {
  id: string;
  filename: string;
  originalName: string;
  storedName: string;
  size: number;
  mimeType: string;
  uploadedBy: number;
  createdAt: Date;
}

// Track metadata in-memory (resets on restart). For production, use a DB table.
const uploadIndex = new Map<string, UploadMeta>();

function getMeta(id: string): UploadMeta | undefined {
  return uploadIndex.get(id);
}

function setMeta(id: string, meta: UploadMeta): void {
  uploadIndex.set(id, meta);
}

// ─── JWT extraction (reuse same pattern as authMiddleware) ───────────────────
function extractUser(req: AuthRequest): { userId?: number; role?: string } {
  const userId = req.headers['x-user-id'] as string | undefined;
  const userRole = req.headers['x-user-role'] as string | undefined;
  return {
    userId: userId ? parseInt(userId, 10) : undefined,
    role: userRole,
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /api/uploads — upload a file (admin-only for now)
router.post('/', adminOnly, upload.single('file'), (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided. Field name must be "file".' });
  }

  const { userId } = extractUser(req);
  const id = uuidv4();
  const meta: UploadMeta = {
    id,
    filename: id,
    originalName: req.file.originalname,
    storedName: req.file.filename,
    size: req.file.size,
    mimeType: req.file.mimetype,
    uploadedBy: userId ?? 0,
    createdAt: new Date(),
  };

  setMeta(id, meta);

  return res.status(201).json({
    data: {
      id,
      filename: meta.originalName,
      url: `/uploads/${id}`,
      size: meta.size,
      mimeType: meta.mimeType,
      createdAt: meta.createdAt.toISOString(),
    },
  });
});

// GET /api/uploads/:id — serve file inline
router.get('/:id', (req: AuthRequest, res) => {
  const meta = getMeta(req.params.id as string);
  if (!meta) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = path.join(UPLOADS_DIR, meta.storedName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  res.setHeader('Content-Type', meta.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(meta.originalName)}"`);
  res.setHeader('Content-Length', meta.size);
  res.setHeader('Cache-Control', 'private, max-age=31536000');
  fs.createReadStream(filePath).pipe(res);
});

// DELETE /api/uploads/:id — admin only, remove from disk
router.delete('/:id', adminOnly, (req: AuthRequest, res) => {
  const meta = getMeta(req.params.id as string);
  if (!meta) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = path.join(UPLOADS_DIR, meta.storedName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  uploadIndex.delete(req.params.id as string);
  return res.json({ message: 'File deleted' });
});

export default router;