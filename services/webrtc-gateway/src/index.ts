// src/index.ts — Standalone WebRTC Voice Gateway
// Zero external APIs — fully self-hosted, browser-to-browser calling via mediasoup

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import { createMediasoupWorker, getMediasoupRouter } from './mediasoup/index.js';
import { RoomManager } from './rooms/room-manager.js';
import { SignalingHandler } from './signaling/socket-handler.js';

const PORT = parseInt(process.env.WEBRTC_PORT || '3004');
const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('tiny'));
app.use(express.json());

// Health & stats (no auth needed — internal service)
app.get('/health', (_req, res) => {
  const stats = roomManager.getStats();
  res.json({
    status: 'ok',
    rooms: stats,
    mediasoup: mediasoupVersion,
  });
});

app.get('/stats', (_req, res) => {
  res.json({ data: roomManager.getStats() });
});

// Room management REST API (called by voice-agent service)
app.post('/rooms', async (req, res) => {
  const { agentId, campaignId, name, callerPeerId, callerSocketId, callerUserId, callerName } = req.body;
  if (!agentId || !callerPeerId) {
    return res.status(400).json({ error: 'agentId and callerPeerId required' });
  }
  const room = roomManager.createRoom({
    agentId, campaignId, name,
    callerSocketId: callerSocketId || 'rest',
    callerPeerId,
    callerUserId,
    callerName,
  });
  res.json({ data: { roomId: room.id, roomName: room.name } });
});

app.get('/rooms/:roomId', (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({ data: room });
});

app.post('/rooms/:roomId/end', (req, res) => {
  roomManager.endRoom(req.params.roomId);
  res.json({ data: { ended: true } });
});

// Mediasoup router info for clients
app.get('/router/rtp-capabilities', (_req, res) => {
  res.json({ data: { rtpCapabilities: getMediasoupRouter()?.rtpCapabilities } });
});

// ─── Bootstrap ───────────────────────────────────────────────
const server = http.createServer(app);

// Socket.IO for WebRTC signaling + voice agent bridge
const io = new SocketIO(server, {
  cors: { origin: '*' },
  path: '/webrtc',
});

// Room manager singleton
const roomManager = new RoomManager();

// Mediasoup worker (must start before signaling)
let mediasoupVersion = 'unknown';
createMediasoupWorker().then(({ router }) => {
  console.log('[WebRTC] Mediasoup worker ready');
  mediasoupVersion = '3.14.0';

  // Wire signaling
  const signaling = new SignalingHandler(io, roomManager, router!);
  signaling.attach();

  server.listen(PORT, () => {
    console.log(`[WebRTC] Standalone gateway running on port ${PORT}`);
    console.log('[WebRTC] No external APIs required — 100% self-hosted');
  });
}).catch(err => {
  console.error('[WebRTC] Failed to start mediasoup:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[WebRTC] Shutting down...');
  server.close();
  process.exit(0);
});