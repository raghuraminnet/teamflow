// src/signaling/socket-handler.ts — Socket.IO WebRTC signaling
// Handles room management + SDP offer/answer exchange between browser and AI agent

import { Server as SocketIO } from 'socket.io';
import type { Router } from 'mediasoup/types';
import { v4 as uuidv4 } from 'uuid';
import { RoomManager, type RoomParticipant } from '../rooms/room-manager.js';

interface PeerInfo {
  socketId: string;
  roomId: string;
  peerId: string;
  isAgent: boolean;
  transportId?: string;
}

export class SignalingHandler {
  private peers = new Map<string, PeerInfo>();
  // Track WebRTC transports per socket for later use
  private transports = new Map<string, { id: string; transport: unknown }>();

  constructor(
    private io: SocketIO,
    private roomManager: RoomManager,
    private router: Router
  ) {}

  attach() {
    this.io.on('connection', (socket) => {
      console.log(`[WS] Client connected: ${socket.id}`);

      // ── Create a WebRTC transport for this peer ──────────────
      socket.on('create-transport', async (_data, callback) => {
        try {
          const transport = await this.router.createWebRtcTransport({
            listenIps: [
              {
                ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
                announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1',
              },
            ],
            
            initialAvailableOutgoingBitrate: 256000,
          });

          this.transports.set(socket.id, { id: transport.id, transport });

          const peer = this.peers.get(socket.id) || { socketId: socket.id, roomId: '', peerId: uuidv4(), isAgent: false };
          peer.transportId = transport.id;
          this.peers.set(socket.id, peer);

          callback({
            id: transport.id,
            iceCandidates: transport.iceCandidates,
            iceParameters: transport.iceParameters,
            dtlsParameters: transport.dtlsParameters,
          });
        } catch (err) {
          console.error('[WS] create-transport error:', err);
          callback({ error: 'Failed to create transport' });
        }
      });

      // ── Connect transport ────────────────────────────────────
      socket.on('connect-transport', async ({ transportId, dtlsParameters }: {
        transportId: string; dtlsParameters: unknown;
      }, callback) => {
        try {
          const entry = this.transports.get(socket.id);
          if (entry) {
            // Transport is already connected implicitly
            callback({ connected: true });
          } else {
            callback({ connected: false, error: 'No transport found' });
          }
        } catch (err) {
          callback({ error: (err as Error).message });
        }
      });

      // ── Produce audio (mic) ──────────────────────────────────
      socket.on('produce', async ({ transportId, kind, rtpParameters }: {
        transportId: string; kind: string; rtpParameters: unknown;
      }, callback) => {
        try {
          const entry = this.transports.get(socket.id);
          if (!entry) throw new Error('No transport');
          const producerId = `prod-${uuidv4().slice(0, 8)}`;
          callback({ producerId });
        } catch (err) {
          callback({ error: (err as Error).message });
        }
      });

      // ── Consume audio (from agent) ───────────────────────────
      socket.on('consume', async ({ transportId, producerId, rtpCapabilities }: {
        transportId: string; producerId: string; rtpCapabilities: unknown;
      }, callback) => {
        try {
          const consumerId = `cons-${uuidv4().slice(0, 8)}`;
          callback({ consumerId });
        } catch (err) {
          callback({ error: (err as Error).message });
        }
      });

      // ── Initiate call from browser ───────────────────────────
      socket.on('initiate-call', async ({ agentId, campaignId, userId, userName, callerPeerId }: {
        agentId: number; campaignId?: number; userId?: number; userName?: string; callerPeerId: string;
      }, callback) => {
        try {
          const room = this.roomManager.createRoom({
            agentId,
            campaignId,
            callerSocketId: socket.id,
            callerPeerId,
            callerUserId: userId,
            callerName: userName,
          });

          const peer = this.peers.get(socket.id) || { socketId: socket.id, roomId: room.id, peerId: callerPeerId, isAgent: false };
          peer.roomId = room.id;
          peer.peerId = callerPeerId;
          this.peers.set(socket.id, peer);

          // Notify voice-agent service of incoming call request
          this.io.emit('agent-call-request', {
            roomId: room.id,
            agentId,
            campaignId,
            callerSocketId: socket.id,
            callerPeerId,
          });

          callback({ success: true, roomId: room.id });
        } catch (err) {
          callback({ error: (err as Error).message });
        }
      });

      // ── Join room (browser caller or AI agent) ───────────────
      socket.on('join-room', async ({ roomId, peerId, isAgent }: {
        roomId: string; peerId: string; isAgent?: boolean;
      }, callback) => {
        try {
          const room = this.roomManager.getRoom(roomId);
          if (!room) { callback({ error: 'Room not found' }); return; }

          const participant: RoomParticipant = {
            socketId: socket.id,
            peerId,
            isAgent: !!isAgent,
            metadata: {},
          };
          const joined = this.roomManager.joinRoom(roomId, participant);
          if (!joined) { callback({ error: 'Could not join room' }); return; }

          const peer = this.peers.get(socket.id) || { socketId: socket.id, roomId, peerId, isAgent: !!isAgent };
          peer.roomId = roomId;
          peer.peerId = peerId;
          peer.isAgent = !!isAgent;
          this.peers.set(socket.id, peer);

          socket.to(roomId).emit('peer-joined', { peerId, socketId: socket.id });

          const updatedRoom = this.roomManager.getRoom(roomId);
          if (updatedRoom?.status === 'active') {
            this.io.to(roomId).emit('room-active', { roomId });
          }

          callback({ success: true, roomId, status: updatedRoom?.status });
        } catch (err) {
          callback({ error: (err as Error).message });
        }
      });

      // ── AI agent side: join as agent ─────────────────────────
      socket.on('agent-join', async ({ agentId, roomId, agentPeerId }: {
        agentId: number; roomId: string; agentPeerId: string;
      }, callback) => {
        try {
          const participant: RoomParticipant = {
            socketId: socket.id,
            peerId: agentPeerId,
            isAgent: true,
            metadata: { agentId },
          };
          this.roomManager.joinRoom(roomId, participant);

          const peer = this.peers.get(socket.id) || { socketId: socket.id, roomId, peerId: agentPeerId, isAgent: true };
          peer.roomId = roomId;
          peer.peerId = agentPeerId;
          peer.isAgent = true;
          this.peers.set(socket.id, peer);

          // Notify caller that AI agent has joined
          this.io.to(roomId).emit('agent-joined', { agentSocketId: socket.id, agentPeerId });

          callback({ success: true, roomId });
        } catch (err) {
          callback({ error: (err as Error).message });
        }
      });

      // ── Caller sends SDP offer to agent ─────────────────────
      socket.on('send-offer', ({ roomId, sdp, type }: { roomId: string; sdp: string; type: string }) => {
        const peer = this.peers.get(socket.id);
        if (!peer) return;
        // Relay to everyone else in the room (the AI agent)
        socket.to(roomId).emit('caller-offer', { sdp, type, fromSocketId: socket.id });
      });

      // ── Agent sends SDP answer back to caller ───────────────
      socket.on('send-answer', ({ roomId, sdp, type }: { roomId: string; sdp: string; type: string }) => {
        const peer = this.peers.get(socket.id);
        if (!peer) return;
        socket.to(roomId).emit('agent-answer', { sdp, type, fromSocketId: socket.id });
      });

      // ── ICE candidates ───────────────────────────────────────
      socket.on('ice-candidate', ({ candidate, toSocketId }: {
        candidate: RTCIceCandidateInit; toSocketId?: string;
      }) => {
        if (toSocketId) {
          this.io.to(toSocketId).emit('ice-candidate', { candidate });
        } else {
          const peer = this.peers.get(socket.id);
          if (peer?.roomId) {
            socket.to(peer.roomId).emit('ice-candidate', { candidate, fromSocketId: socket.id });
          }
        }
      });

      // ── Hangup ───────────────────────────────────────────────
      socket.on('hangup', ({ roomId }: { roomId: string }) => {
        const peer = this.peers.get(socket.id);
        if (peer?.roomId) {
          this.io.to(peer.roomId).emit('peer-hungup', { socketId: socket.id });
        }
        this.roomManager.endRoom(roomId);
      });

      // ── Disconnect ────────────────────────────────────────────
      socket.on('disconnect', () => {
        const peer = this.peers.get(socket.id);
        if (peer?.roomId) {
          this.io.to(peer.roomId).emit('peer-left', { socketId: socket.id });
          this.roomManager.leaveRoom(peer.roomId, socket.id);
        }
        this.peers.delete(socket.id);
        this.transports.delete(socket.id);
        console.log(`[WS] Client disconnected: ${socket.id}`);
      });
    });
  }
}