import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http';
import { initDatabase } from './db/client.js';
import { AsteriskAMI } from './asterisk/ami.js';
import { WhisperSTT } from './stt/stt.js';
import { PiperTTS } from './tts/tts.js';
import { LLMClient } from './llm/llm.js';
import { CampaignRunner } from './campaigns/runner.js';
import { createAgentRouter, createCampaignRouter, createCallLogsRouter } from './routes/agents.js';
import { db } from './db/client.js';
import { callLogs } from './db/schema.js';

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors()); app.use(helmet()); app.use(morgan('tiny'));
app.use(express.json({ limit: '10mb' }));

let ami: AsteriskAMI | null = null, stt: WhisperSTT | null = null;
let tts: PiperTTS | null = null, llm: LLMClient | null = null, runner: CampaignRunner | null = null;

function getServices() {
  if (!ami) {
    ami = new AsteriskAMI(process.env.ASTERISK_HOST || 'asterisk', parseInt(process.env.ASTERISK_PORT || '5038'), process.env.ASTERISK_USER || 'teamflow', process.env.ASTERISK_SECRET || 'secret');
    ami.connect().catch(e => console.warn('[Voice] Asterisk not connected:', (e as Error).message));
  }
  if (!stt) stt = new WhisperSTT(process.env.WHISPER_URL || 'http://whisper:9000', process.env.WHISPER_MODEL || 'base');
  if (!tts) tts = new PiperTTS(process.env.PIPER_URL || 'http://piper:5000', process.env.PIPER_VOICE || 'en_US-amy-medium');
  if (!llm) {
    llm = new LLMClient(
      (process.env.LLM_PROVIDER as 'ollama' | 'openai' | 'minimax') || 'minimax',
      process.env.OLLAMA_URL || 'http://ollama:11434', process.env.OLLAMA_MODEL || 'llama3.2:latest',
      process.env.OPENAI_API_KEY || '', process.env.OPENAI_MODEL || 'gpt-4o-mini',
      process.env.MINIMAX_API_KEY || '', process.env.MINIMAX_MODEL || 'MiniMax-Text-01'
    );
  }
  if (!runner) {
    runner = new CampaignRunner(ami, stt, tts, llm);
    runner.on('campaign_start', d => io.emit('campaign_start', d));
    runner.on('campaign_complete', d => io.emit('campaign_complete', d));
  }
  return { ami, stt, tts, llm, runner };
}

app.use('/agents', createAgentRouter());
app.use('/campaigns', createCampaignRouter());
app.use('/calls', createCallLogsRouter());

app.get('/stats/summary', async (_req, res) => {
  try {
    const all = await db.select().from(callLogs);
    const answered = all.filter(c => c.status === 'answered' || c.status === 'completed').length;
    res.json({ data: { totalCalls: all.length, answered, missed: all.filter(c => c.status === 'missed').length, avgDurationSecs: all.reduce((s,c) => s + (c.durationSecs||0), 0) / Math.max(1,all.length) } });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.get('/health', (_req, res) => {
  const s = getServices();
  res.json({ status: 'ok', asterisk: s.ami?.isConnected() ? 'connected' : 'disconnected' });
});

io.on('connection', socket => { console.log(`[Voice] Socket: ${socket.id}`); socket.on('subscribe_campaign', id => socket.join(`campaign:${id}`)); });

async function shutdown() { if (ami) await ami.logout(); server.close(); process.exit(0); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);

initDatabase().then(() => {
  console.log('[Voice] DB ready');
  server.listen(parseInt(process.env.PORT || '3002'), () => console.log('[Voice] Running on port', process.env.PORT || '3002'));
}).catch(e => { console.error('[Voice] Start failed:', (e as Error).message); process.exit(1); });
