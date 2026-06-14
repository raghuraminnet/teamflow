import fetch from 'node-fetch';
import { synthesize } from '../tts/piper.js';
import { sendAudio } from '../stt/whisper.js';
import { generate } from '../llm/bridge.js';
import { ami } from '../asterisk/ami.js';

export interface VoiceAgent {
  id: number;
  name: string;
  description?: string;
  type: string;
  steps: AgentStep[];
  prompt?: string;
  voice_id?: string;
  llm_model?: string;
}

export interface AgentStep {
  type: 'speak' | 'collect' | 'condition' | 'task_update' | 'delay' | 'transfer' | 'end' | 'llm';
  text?: string;
  prompt?: string;
  keywords?: string[];
  duration_ms?: number;
  task_id?: number;
  status?: string;
  url?: string;
  timeout_secs?: number;
}

export interface Contact {
  id: number;
  name: string;
  phone: string;
  variables?: Record<string, string>;
}

export interface CallResult {
  transcript: string;
  summary: string;
  steps_ran: string[];
  status: 'completed' | 'failed' | 'no_answer';
  metadata?: Record<string, unknown>;
}

async function speakStep(step: AgentStep, amiClient: typeof ami): Promise<void> {
  const text = step.text || '';
  try {
    const audio = await synthesize(text);
    // In a real integration, we'd stream this to Asterisk via AMI or a side channel
    // Here we log it; the Asterisk channel would play it back
    console.info(`[Executor] Speaking: ${text.slice(0, 50)}...`);
    // Simulate playback time based on text length
    await new Promise((r) => setTimeout(r, Math.max(500, text.length * 40)));
  } catch (err) {
    console.warn('[Executor] Speak step failed:', (err as Error).message);
  }
}

async function collectStep(step: AgentStep): Promise<string> {
  const timeoutSecs = step.timeout_secs || 10;
  console.info(`[Executor] Collecting speech (timeout: ${timeoutSecs}s)...`);
  // In a real implementation, this would:
  // 1. Send a prompt via Asterisk to play a beep or tone
  // 2. Stream audio from Asterisk
  // 3. Send chunks to Whisper as they arrive
  // For now, simulate a short wait and return empty
  await new Promise((r) => setTimeout(r, timeoutSecs * 1000));
  return '';
}

function conditionStep(step: AgentStep, response: string): string {
  const keywords = step.keywords || [];
  const lower = response.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) {
      return kw;
    }
  }
  return '';
}

async function taskUpdateStep(step: AgentStep): Promise<void> {
  if (!step.task_id) return;
  const tfApiUrl = process.env.TF_API_URL || 'http://teamflow-api:3001';
  try {
    await fetch(`${tfApiUrl}/api/tasks/${step.task_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: step.status }),
    });
    console.info(`[Executor] Task ${step.task_id} updated to ${step.status}`);
  } catch (err) {
    console.warn('[Executor] Task update failed:', (err as Error).message);
  }
}

function delayStep(step: AgentStep): Promise<void> {
  const ms = step.duration_ms || 1000;
  return new Promise((r) => setTimeout(r, ms));
}

async function transferStep(step: AgentStep): Promise<void> {
  if (!step.url) return;
  try {
    await fetch(step.url, { method: 'POST' });
    console.info(`[Executor] Transfer alert sent to ${step.url}`);
  } catch (err) {
    console.warn('[Executor] Transfer webhook failed:', (err as Error).message);
  }
}

function endStep(): void {
  console.info('[Executor] Call ending');
}

async function llmStep(step: AgentStep): Promise<string> {
  const prompt = step.prompt || '';
  try {
    return await generate(prompt);
  } catch (err) {
    console.warn('[Executor] LLM step failed:', (err as Error).message);
    return '';
  }
}

export async function executeAgent(
  callId: string,
  agent: VoiceAgent,
  contact: Contact
): Promise<CallResult> {
  const steps_ran: string[] = [];
  const transcriptParts: string[] = [];
  let currentResponse = '';

  for (const step of agent.steps) {
    steps_ran.push(step.type);
    console.info(`[Executor] Call ${callId} — step: ${step.type}`);

    try {
      switch (step.type) {
        case 'speak':
          await speakStep(step, ami);
          break;

        case 'collect':
          currentResponse = await collectStep(step);
          transcriptParts.push(currentResponse);
          break;

        case 'condition':
          const matched = conditionStep(step, currentResponse);
          console.info(`[Executor] Condition matched: "${matched}"`);
          break;

        case 'task_update':
          await taskUpdateStep(step);
          break;

        case 'delay':
          await delayStep(step);
          break;

        case 'transfer':
          await transferStep(step);
          break;

        case 'end':
          endStep();
          break;

        case 'llm':
          const llmOutput = await llmStep(step);
          if (llmOutput) {
            await speakStep({ type: 'speak', text: llmOutput }, ami);
          }
          break;

        default:
          console.warn(`[Executor] Unknown step type: ${(step as any).type}`);
      }
    } catch (err) {
      console.error(`[Executor] Step ${step.type} error:`, (err as Error).message);
    }
  }

  const transcript = transcriptParts.join('\n');
  let summary = '';
  if (agent.prompt && transcript) {
    try {
      summary = await generate(`Summarize this call transcript: ${transcript}`, [
        { role: 'system', content: agent.prompt },
      ]);
    } catch {
      summary = transcript.slice(0, 200);
    }
  }

  return {
    transcript,
    summary,
    steps_ran,
    status: 'completed',
    metadata: {
      contact_id: contact.id,
      agent_id: agent.id,
    },
  };
}