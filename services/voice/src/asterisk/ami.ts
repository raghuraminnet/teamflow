import { EventEmitter } from 'events';
import net from 'net';

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

interface AMIResponse {
  Response: string;
  ActionID?: string;
  [key: string]: string | undefined;
}

interface AMIEvent {
  Event: string;
  [key: string]: string;
}

export class AMIClient extends EventEmitter {
  private socket?: net.Socket;
  private connected = false;
  private reconnectAttempts = 0;
  private host: string;
  private port: number;
  private user: string;
  private secret: string;
  private pending: Map<string, { resolve: (v: AMIResponse) => void; reject: (e: Error) => void }> = new Map();
  private buffer = '';
  private actionId = 0;
  private destroyed = false;

  constructor() {
    super();
    this.host = process.env.ASTERISK_HOST || 'asterisk';
    this.port = parseInt(process.env.ASTERISK_PORT || '5038', 10);
    this.user = process.env.ASTERISK_MANAGER_USER || 'teamflow';
    this.secret = process.env.ASTERISK_MANAGER_SECRET || '';
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(this.port, this.host);
      this.socket.setEncoding('utf-8');

      this.socket.on('connect', () => {
        this.sendRaw(`Action: Login\r\nActionID: ${++this.actionId}\r\nUsername: ${this.user}\r\nSecret: ${this.secret}\r\nEvent: On\n\r\n`);
        this.connected = true;
        this.reconnectAttempts = 0;
      });

      this.socket.on('data', (chunk: string) => {
        this.buffer += chunk;
        this.processBuffer();
      });

      this.socket.on('close', () => {
        this.connected = false;
        if (!this.destroyed) {
          this.scheduleReconnect();
        }
      });

      this.socket.on('error', (err: Error) => {
        console.error('[AMI] Socket error:', err.message);
        if (!this.connected) {
          reject(err);
        }
      });
    });
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_MS
    );
    this.reconnectAttempts++;
    console.warn(`[AMI] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => {
      this.connect().catch(() => {});
    }, delay);
  }

  private processBuffer(): void {
    const lines = (this.buffer as any).split(/\r?\n/);
    while (lines.length > 0) {
      const blankIdx = lines.findIndex((l: string) => l.trim() === '');
      if (blankIdx === -1) break;
      const rawEvent = lines.splice(0, blankIdx);
      lines.shift(); // remove blank line
      if (rawEvent.length === 0) continue;

      const event = Object.create(null);
      for (const line of rawEvent) {
        const idx = line.indexOf(': ');
        if (idx < 0) continue;
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 2);
        event[key] = val;
      }

      const actionId = event['ActionID'];
      if (actionId && this.pending.has(actionId)) {
        const { resolve } = this.pending.get(actionId)!;
        this.pending.delete(actionId);
        resolve(event as AMIResponse);
      }

      const eventName = event['Event'];
      if (eventName === 'FullyBooted') {
        console.info('[AMI] Asterisk fully booted');
      } else if (eventName === 'Newchannel') {
        this.emit('call-start', event);
      } else if (eventName === 'Hangup') {
        this.emit('call-end', event);
      } else if (eventName === 'DTMF') {
        this.emit('dtmf', event);
      } else if (eventName === 'HangupRequest') {
        this.emit('hangup', event);
      }

      this.emit('event', event as AMIEvent);
    }
    this.buffer = lines.join('\n');
  }

  private sendRaw(data: string): void {
    if (this.socket && this.connected) {
      this.socket.write(data);
    }
  }

  private async send(command: Record<string, string>): Promise<AMIResponse> {
    if (!this.connected || !this.socket) {
      throw new Error('AMI not connected');
    }
    const actionId = String(++this.actionId);
    const fields = { ...command, ActionID: actionId };
    const packet =
      Object.entries(fields)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n') + '\r\n\r\n';

    return new Promise((resolve, reject) => {
      this.pending.set(actionId, { resolve, reject });
      this.sendRaw(packet);
      setTimeout(() => {
        if (this.pending.has(actionId)) {
          this.pending.delete(actionId);
          reject(new Error('AMI timeout'));
        }
      }, 10000);
    });
  }

  async ping(): Promise<AMIResponse> {
    try {
      return await this.send({ Action: 'Ping' });
    } catch {
      throw new Error('AMI ping failed');
    }
  }

  async originate(channel: string, extension: string, context: string): Promise<AMIResponse> {
    try {
      return await this.send({
        Action: 'Originate',
        Channel: channel,
        Exten: extension,
        Context: context,
        Priority: '1',
        Async: 'yes',
      });
    } catch (err) {
      throw new Error(`AMI originate failed: ${(err as Error).message}`);
    }
  }

  async hangup(channel: string): Promise<AMIResponse> {
    try {
      return await this.send({ Action: 'Hangup', Channel: channel });
    } catch {
      throw new Error('AMI hangup failed');
    }
  }

  async getStatus(): Promise<AMIResponse> {
    try {
      return await this.send({ Action: 'Status' });
    } catch {
      throw new Error('AMI getStatus failed');
    }
  }

  destroy(): void {
    this.destroyed = true;
    if (this.socket) {
      this.socket.destroy();
      this.socket = undefined;
    }
  }
}

export const ami = new AMIClient();

export async function pingAMI(): Promise<boolean> {
  try {
    await ami.ping();
    return true;
  } catch {
    return false;
  }
}