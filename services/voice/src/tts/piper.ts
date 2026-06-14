import fetch from 'node-fetch';

const PIPER_URL = process.env.PIPER_URL || 'http://piper:5000';
const PIPER_VOICE = process.env.PIPER_VOICE || 'en_US-amy-medium';

interface PiperRequest {
  text: string;
  voice?: string;
}

export async function synthesize(text: string): Promise<Buffer> {
  try {
    const response = await fetch(`${PIPER_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: PIPER_VOICE } as PiperRequest),
    });

    if (!response.ok) {
      throw new Error(`Piper HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.warn('[Piper] TTS unavailable:', (err as Error).message);
    throw err;
  }
}

export async function checkPiper(): Promise<boolean> {
  try {
    const response = await fetch(`${PIPER_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}