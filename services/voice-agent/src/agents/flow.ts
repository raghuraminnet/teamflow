import { EventEmitter } from 'events';
import { AsteriskAMI } from '../asterisk/ami.js';
import { WhisperSTT } from '../stt/stt.js';
import { PiperTTS } from '../tts/tts.js';
import { LLMClient, type LLMMessage } from '../llm/llm.js';
import type { AgentStep } from '../db/schema.js';

export interface FlowContext {
  callId: string; channel: string; direction: 'inbound' | 'outbound';
  fromNumber: string; toNumber: string; agentId: number; campaignId?: number;
  contact?: Record<string,string>; steps: AgentStep[]; prompt?: string;
  history: LLMMessage[];
}

export class AgentFlow extends EventEmitter {
  private currentIndex = 0;
  private startTime = Date.now();
  private transcript = '';
  private stopped = false;

  constructor(
    private ami: AsteriskAMI,
    private stt: WhisperSTT,
    private tts: PiperTTS,
    private llm: LLMClient,
    private ctx: FlowContext
  ) { super(); }

  async start() {
    this.emit('start', { callId: this.ctx.callId });
    await this.runNext();
  }

  stop() {
    this.stopped = true;
    this.ami.hangup(this.ctx.channel).catch(() => {});
  }

  private async runNext() {
    if (this.stopped || this.currentIndex >= this.ctx.steps.length) {
      return this.endCall();
    }
    const step = this.ctx.steps[this.currentIndex++];
    try {
      switch (step.type) {
        case 'speak': await this.doSpeak(step); break;
        case 'collect': await this.doCollect(step); break;
        case 'condition': await this.doCondition(step); break;
        case 'transfer': await this.doTransfer(step); break;
        case 'task_update': await this.doTaskUpdate(step); break;
        case 'delay': await this.doDelay(step); break;
        case 'end': await this.endCall(); break;
      }
    } catch (err) {
      this.transcript += `\n[ERROR: ${(err as Error).message}]`;
      this.emit('step_error', { stepId: step.id, error: (err as Error).message });
      await this.endCall();
    }
  }

  private async doSpeak(step: AgentStep) {
    const msg = (step.config?.message as string) || '';
    await this.tts.speakToBuffer(msg);
    this.transcript += `\nAGENT: ${msg}`;
    this.emit('step', { stepId: step.id, stepType: 'speak', response: msg });
    await this.runNext();
  }

  private async doCollect(step: AgentStep) {
    const prompt = (step.config?.prompt as string) || 'Please speak.';
    await this.tts.speakToBuffer(prompt);
    this.emit('step', { stepId: step.id, stepType: 'collect', transcript: '[awaiting speech]' });
    await this.runNext();
  }

  private async doCondition(step: AgentStep) {
    const conditions = step.branchConditions || [];
    const last = this.transcript.slice(-500);
    const response = await this.llm.chat([
      { role:'system', content: `Route this call. Branches: ${JSON.stringify(conditions)}. Respond with the keyword.` },
      { role:'user', content: last }
    ]);
    const matched = conditions.find(c => response.toLowerCase().includes(c.keyword.toLowerCase()));
    if (matched) {
      const idx = this.ctx.steps.findIndex(s => s.id === matched.nextStepId);
      if (idx >= 0) this.currentIndex = idx;
    }
    this.emit('step', { stepId: step.id, stepType: 'condition', response });
    await this.runNext();
  }

  private async doTransfer(step: AgentStep) {
    const to = (step.config?.transferTo as string) || '';
    const announce = (step.config?.announce as string) || 'Transferring your call.';
    if (announce) await this.tts.speakToBuffer(announce);
    this.transcript += `\n[TRANSFERRED to ${to}]`;
    this.emit('step', { stepId: step.id, stepType: 'transfer', response: to });
    this.stopped = true;
  }

  private async doTaskUpdate(step: AgentStep) {
    const taskId = step.config?.taskId as string;
    const updateData = step.config?.updateData as Record<string,string>;
    if (taskId && updateData) this.transcript += `\n[TASK UPDATE: ${taskId} → ${JSON.stringify(updateData)}]`;
    this.emit('step', { stepId: step.id, stepType: 'task_update', response: taskId });
    await this.runNext();
  }

  private async doDelay(step: AgentStep) {
    const ms = (step.config?.delayMs as number) || 1000;
    await new Promise(r => setTimeout(r, ms));
    await this.runNext();
  }

  private async endCall() {
    const durationSecs = Math.floor((Date.now() - this.startTime) / 1000);
    const summary = await this.llm.summarizeCall(this.transcript, durationSecs);
    this.emit('end', { callId: this.ctx.callId, durationSecs, transcript: this.transcript, summary });
  }
}
