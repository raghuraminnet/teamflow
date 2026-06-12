import net from 'net';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface AMIResponse { Response: string; ActionID?: string; Message?: string; [k: string]: string | undefined; }

export class AsteriskAMI extends EventEmitter {
  private socket: net.Socket | null = null;
  private connected = false;
  private pending = new Map<string, { resolve: (r: AMIResponse) => void; reject: (e: Error) => void }>();
  private host: string; private port: number; private user: string; private secret: string;

  constructor(host: string, port: number, user: string, secret: string) {
    super(); this.host = host; this.port = port; this.user = user; this.secret = secret;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection({ host: this.host, port: this.port }, () => {
        this.connected = true; this.login().then(resolve).catch(reject);
      });
      let buffer = '';
      this.socket.on('data', (chunk) => {
        buffer += chunk.toString();
        const parts = buffer.split('\r\n\r\n');
        for (let i = 0; i < parts.length - 1; i++) {
          const msg: Record<string,string> = {};
          for (const line of parts[i].split('\r\n')) {
            const idx = line.indexOf(':');
            if (idx > 0) msg[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
          }
          this.handleMessage(msg as AMIResponse);
        }
      });
      this.socket.on('error', (err) => { this.connected = false; this.emit('error', err); reject(err); });
      this.socket.on('close', () => { this.connected = false; this.emit('close'); });
    });
  }

  private handleMessage(msg: AMIResponse) {
    const aid = msg.ActionID;
    if (aid && this.pending.has(aid)) {
      const p = this.pending.get(aid)!; this.pending.delete(aid);
      msg.Response === 'Success' ? p.resolve(msg) : p.reject(new Error(msg.Message || 'AMI failed'));
    }
    if (msg.Event) this.emit(msg.Event, msg);
  }

  private send(action: string, params: Record<string,string> = {}): Promise<AMIResponse> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.connected) { reject(new Error('Not connected')); return; }
      const aid = `${this.host.slice(0,8)}-${Date.now()}`;
      const lines = [`Action: ${action}`, `ActionID: ${aid}`, ...Object.entries(params).map(([k,v]) => `${k}: ${v}`), ''];
      this.socket.write(lines.join('\r\n') + '\r\n');
      this.pending.set(aid, { resolve, reject });
      setTimeout(() => { if (this.pending.has(aid)) { this.pending.delete(aid); reject(new Error(`${action} timed out`)); } }, 10000);
    });
  }

  async login(): Promise<AMIResponse> { return this.send('Login', { Username: this.user, Secret: this.secret }); }
  async logout(): Promise<void> { if (this.connected) { await this.send('Logoff'); this.socket?.end(); this.connected = false; } }
  async originateCall(channel: string, exten: string, context: string, callerId?: string): Promise<string> {
    const params: Record<string,string> = { Channel: channel, Exten: exten, Context: context, Priority: '1' };
    if (callerId) params.CallerID = callerId;
    const r = await this.send('Originate', params);
    return r.ActionID || uuidv4();
  }
  async hangup(channel: string): Promise<AMIResponse> { return this.send('Hangup', { Channel: channel }); }
  isConnected() { return this.connected; }
}