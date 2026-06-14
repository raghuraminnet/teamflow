// src/calls/voice-bridge.ts
// Connects the AI voice pipeline to WebRTC rooms — no external APIs

import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { WhisperSTT } from '../stt/stt.js';
import { PiperTTS } from '../tts/tts.js';
import { LLMClient } from '../llm/llm.js';
import { AgentFlow, type FlowContext } from '../agents/flow.js';
import { db } from '../db/client.js';
import { callLogs } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface VoiceBridgeConfig {
  webrtcGatewayUrl: string;
  whisperUrl: string;
  piperUrl: string;
  llmProvider: 'ollama' | 'openai' | 'minimax';
  ollamaUrl: string;
  ollamaModel: string;
  openaiApiKey: string;
  minimaxApiKey: string;
  minimaxModel: string;
}

export interface IncomingCall {
  roomId: string;
  agentId: number;
  campaignId?: number;
  callerSocketId: string;
  callerPeerId: string;
}

export class VoiceBridge extends EventEmitter {
  private socket: Socket | null = null;
  private agentSocket: Socket | null = null;
  private connected = false;
  private pendingCalls = new Map<string, IncomingCall>();

  constructor(private config: VoiceBridgeConfig) { super(); }

  connect() {
    if (this.connected) return;

    // ── Agent-side socket (AI joins rooms as the voice agent) ──
    this.agentSocket = io(this.config.webrtcGatewayUrl, {
      path: '/webrtc',
      reconnection: true,
      reconnectionDelay: 3000,
    });

    this.agentSocket.on('connect', () => {
      console.log('[VoiceBridge] Agent socket connected');
      this.connected = true;
      this.emit('connected');
    });

    this.agentSocket.on('disconnect', () => {
      console.log('[VoiceBridge] Agent socket disconnected');
      this.connected = false;
      this.emit('disconnected');
    });

    // ── Incoming call requests from browser callers ───────────
    this.agentSocket.on('agent-call-request', async (data: IncomingCall) => {
      console.log('[VoiceBridge] Incoming call:', data);
      this.pendingCalls.set(data.roomId, data);
      this.emit('call-request', data);
    });

    this.agentSocket.on('room-active', async (data: { roomId: string }) => {
      const call = this.pendingCalls.get(data.roomId);
      if (call) {
        this.pendingCalls.delete(data.roomId);
        this.emit('call-active', call);
      }
    });
  }

  disconnect() {
    this.agentSocket?.disconnect();
    this.socket?.disconnect();
    this.connected = false;
  }

  async acceptAndHandleCall(call: IncomingCall, agentConfig: {
    agentId: number;
    steps: unknown[];
    prompt: string;
    voiceId: string;
    llmProvider: string;
    llmModel: string;
  }) {
    if (!this.agentSocket?.connected) {
      throw new Error('Agent socket not connected to WebRTC gateway');
    }

    const agentPeerId = `agent-${uuidv4().slice(0, 8)}`;
    const roomId = call.roomId;

    // Join as the AI agent side
    this.agentSocket.emit('agent-join', {
      agentId: agentConfig.agentId,
      roomId,
      agentPeerId,
    }, async (response: { success?: boolean; error?: string }) => {
      if (response.error) {
        console.error('[VoiceBridge] agent-join failed:', response.error);
        return;
      }
      console.log('[VoiceBridge] Joined room as agent:', roomId);

      // Initialize AI services
      const stt = new WhisperSTT(this.config.whisperUrl);
      const tts = new PiperTTS(this.config.piperUrl, agentConfig.voiceId);
      const llm = new LLMClient(
        agentConfig.llmProvider as 'ollama' | 'openai' | 'minimax',
        this.config.ollamaUrl,
        this.config.ollamaModel,
        this.config.openaiApiKey,
        '',
        this.config.minimaxApiKey,
        this.config.minimaxModel
      );

      // Create call log entry
      const [callLog] = await db.insert(callLogs).values({
        agentId: agentConfig.agentId,
        campaignId: call.campaignId,
        direction: 'inbound',
        fromNumber: 'web caller',
        toNumber: `room:${roomId.slice(0, 8)}`,
        status: 'ringing',
        startedAt: new Date(),
        metadata: { roomId, callerPeerId: call.callerPeerId },
      }).returning();

      // Set up flow context
      const ctx: FlowContext = {
        callId: uuidv4(),
        channel: `webrtc:${roomId}`,
        direction: 'inbound',
        fromNumber: 'web caller',
        toNumber: `room:${roomId.slice(0, 8)}`,
        agentId: agentConfig.agentId,
        campaignId: call.campaignId,
        steps: agentConfig.steps as any[],
        prompt: agentConfig.prompt,
        history: [],
      };

      const flow = new AgentFlow(ami!, stt, tts, llm, ctx);

      flow.on('step', ({ stepId, stepType, response }) => {
        console.log(`[Flow] Step ${stepId} (${stepType}):`, response);
        this.emit('flow-step', { callLogId: callLog.id, stepId, stepType, response });
      });

      flow.on('end', async ({ callId, durationSecs, transcript, summary }) => {
        console.log(`[Flow] Call ended. Duration: ${durationSecs}s`);
        // Update call log
        await db.update(callLogs)
          .set({
            status: 'completed',
            durationSecs,
            transcript,
            summary,
            endedAt: new Date(),
          })
          .where(eq(callLogs.id, callLog.id));

        // Hangup
        this.agentSocket?.emit('hangup', { roomId });
        this.emit('call-ended', { callLogId: callLog.id, durationSecs, summary });
      });

      flow.on('step_error', async ({ stepId, error }) => {
        await db.update(callLogs)
          .set({ status: 'failed', transcript: `Error: ${error}`, endedAt: new Date() })
          .where(eq(callLogs.id, callLog.id));
        this.emit('call-ended', { callLogId: callLog.id, error });
      });

      // Start the flow
      flow.start();
    });
  }

  // For outbound campaigns — initiate call from agent side
  async initiateOutboundCall(opts: {
    agentId: number;
    campaignId: number;
    agentSteps: unknown[];
    agentPrompt: string;
    voiceId: string;
    llmProvider: string;
    llmModel: string;
    roomId: string;
  }) {
    const agentPeerId = `agent-outbound-${uuidv4().slice(0, 8)}`;

    if (!this.agentSocket?.connected) throw new Error('Not connected');

    return new Promise<void>((resolve, reject) => {
      this.agentSocket!.emit('agent-join', {
        agentId: opts.agentId,
        roomId: opts.roomId,
        agentPeerId,
      }, (response: { success?: boolean; error?: string }) => {
        if (response.error) { reject(new Error(response.error)); return; }
        resolve();
      });
    });
  }

  isConnected() { return this.connected; }
}

// ── Mock AMI stub (no Asterisk needed for WebRTC) ──────────────
class MockAMI {
  async hangup(_channel: string) { return {}; }
  isConnected() { return true; }
}

let ami: any = new MockAMI();