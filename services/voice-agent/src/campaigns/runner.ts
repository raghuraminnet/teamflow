import { EventEmitter } from 'events';
import { AsteriskAMI } from '../asterisk/ami.js';
import { WhisperSTT } from '../stt/stt.js';
import { PiperTTS } from '../tts/tts.js';
import { LLMClient } from '../llm/llm.js';
import { AgentFlow } from '../agents/flow.js';
import { db } from '../db/client.js';
import { callLogs } from '../db/schema.js';
import { v4 as uuidv4 } from 'uuid';

export interface CampaignJob {
  id: number; agentId: number; name: string;
  contacts: Array<{ name: string; phone: string; variables: Record<string,string> }>;
  agentSteps: Array<unknown>; agentPrompt: string; voiceId: string; llmModel: string;
}

export class CampaignRunner extends EventEmitter {
  private flows = new Map<string, AgentFlow>();

  constructor(private ami: AsteriskAMI | null, private stt: WhisperSTT, private tts: PiperTTS, private llm: LLMClient) {
    super();
    if (this.ami) this.ami.on('Hangup', () => {});
  }

  async startCampaign(job: CampaignJob) {
    this.emit('campaign_start', { campaignId: job.id });
    for (const contact of job.contacts) {
      const callId = uuidv4();
      await db.insert(callLogs).values({
        campaignId: job.id, agentId: job.agentId, direction: 'outbound',
        toNumber: contact.phone,
        fromNumber: process.env.VOICE_DID || '0000',
        status: 'queued', startedAt: new Date(),
        metadata: { callId, contactName: contact.name },
      });
      try {
        const channel = `SIP/${contact.phone}@outbound`;
        if (!this.ami) { console.warn('[Campaign] No AMI — skipping outbound call'); return; }
        await this.ami.originateCall(channel, contact.phone, 'teamflow-outbound',
          `TeamFlow AI <${process.env.VOICE_DID || '0000'}>`);
      } catch (err) {
        console.error('[Campaign] Call failed:', (err as Error).message);
      }
    }
    this.emit('campaign_complete', { campaignId: job.id });
  }
}
