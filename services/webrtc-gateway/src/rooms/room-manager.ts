// src/rooms/room-manager.ts
// Each "room" is a 1:1 WebRTC call session between a browser client and the AI voice agent

import { v4 as uuidv4 } from 'uuid';

export interface RoomParticipant {
  socketId: string;
  peerId: string;
  isAgent: boolean; // true = AI voice agent side, false = browser caller side
  userId?: number;
  name?: string;
  metadata: Record<string, unknown>;
}

export interface CallRoom {
  id: string;
  name: string;
  agentId: number;
  campaignId?: number;
  participants: Map<string, RoomParticipant>;
  createdAt: Date;
  startedAt?: Date;
  status: 'waiting' | 'active' | 'ended';
}

export class RoomManager {
  private rooms = new Map<string, CallRoom>();

  createRoom(opts: {
    agentId: number;
    campaignId?: number;
    name?: string;
    callerSocketId: string;
    callerPeerId: string;
    callerUserId?: number;
    callerName?: string;
  }): CallRoom {
    const roomId = uuidv4();
    const room: CallRoom = {
      id: roomId,
      name: opts.name || `call-${roomId.slice(0, 8)}`,
      agentId: opts.agentId,
      campaignId: opts.campaignId,
      participants: new Map(),
      createdAt: new Date(),
      status: 'waiting',
    };
    room.participants.set(opts.callerSocketId, {
      socketId: opts.callerSocketId,
      peerId: opts.callerPeerId,
      isAgent: false,
      userId: opts.callerUserId,
      name: opts.callerName,
      metadata: {},
    });
    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId: string, participant: RoomParticipant): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.status === 'ended') return false;
    room.participants.set(participant.socketId, participant);

    // When both sides are in, call is active
    if (room.participants.size === 2) {
      room.status = 'active';
      room.startedAt = new Date();
    }
    return true;
  }

  leaveRoom(roomId: string, socketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.participants.delete(socketId);
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
    } else if (room.status === 'active') {
      room.status = 'ended';
    }
  }

  getRoom(roomId: string): CallRoom | undefined {
    return this.rooms.get(roomId);
  }

  getRoomBySocket(socketId: string): CallRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.participants.has(socketId)) return room;
    }
    return undefined;
  }

  endRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.status = 'ended';
    }
  }

  getActiveRooms(): CallRoom[] {
    return [...this.rooms.values()].filter(r => r.status === 'active');
  }

  getStats() {
    let waiting = 0, active = 0;
    for (const room of this.rooms.values()) {
      if (room.status === 'waiting') waiting++;
      if (room.status === 'active') active++;
    }
    return { total: this.rooms.size, waiting, active };
  }
}