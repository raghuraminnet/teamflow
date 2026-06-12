import type { Response } from 'express';

interface SSEEvent {
  id?: number;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

// Map<userId, Response> — one active SSE connection per user
const clients = new Map<number, Response>();

export function addClient(userId: number, res: Response): void {
  // Disconnect existing if any
  removeClient(userId);
  clients.set(userId, res);
  console.log(`SSE client connected: user ${userId} (total: ${clients.size})`);
}

export function removeClient(userId: number): void {
  if (clients.has(userId)) {
    clients.delete(userId);
    console.log(`SSE client disconnected: user ${userId} (total: ${clients.size})`);
  }
}

export function sendToUser(userId: number, event: SSEEvent): void {
  const res = clients.get(userId);
  if (!res) return;

  try {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    res.write(payload);
  } catch (err) {
    console.error(`Failed to send SSE to user ${userId}:`, err);
    removeClient(userId);
  }
}

export function sendKeepAlive(): void {
  for (const [userId, res] of clients.entries()) {
    try {
      res.write(': keepalive\n\n');
    } catch (err) {
      console.error(`Keepalive failed for user ${userId}:`, err);
      clients.delete(userId);
    }
  }
}

// Start keepalive interval (every 30s)
let keepaliveInterval: ReturnType<typeof setInterval> | null = null;

export function startKeepAlive(): void {
  if (keepaliveInterval) return;
  keepaliveInterval = setInterval(sendKeepAlive, 30_000);
  console.log('SSE keepalive started (every 30s)');
}

export function stopKeepAlive(): void {
  if (keepaliveInterval) {
    clearInterval(keepaliveInterval);
    keepaliveInterval = null;
  }
}

export function getClientCount(): number {
  return clients.size;
}