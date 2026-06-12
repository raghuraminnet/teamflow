import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const WHISPER_URL = process.env.WHISPER_URL || 'http://whisper:9001';
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'base';

interface WhisperResponse {
  text?: string;
  error?: string;
}

export async function sendAudio(audioBuffer: Buffer): Promise<string> {
  try {
    const formData = new FormData();
    const tempFile = path.join('/tmp', `whisper_${Date.now()}.wav`);
    fs.writeFileSync(tempFile, audioBuffer);
    formData.append('file', fs.createReadStream(tempFile) as any);
    formData.append('model', WHISPER_MODEL);

    const response = await fetch(`${WHISPER_URL}/inference`, {
      method: 'POST',
      body: formData,
    });

    fs.unlinkSync(tempFile);

    if (!response.ok) {
      throw new Error(`Whisper HTTP ${response.status}`);
    }

    const data = (await response.json()) as WhisperResponse;
    if (data.error) {
      throw new Error(data.error);
    }
    return data.text || '';
  } catch (err) {
    console.warn('[Whisper] STT unavailable:', (err as Error).message);
    throw err;
  }
}

export async function checkWhisper(): Promise<boolean> {
  try {
    const response = await fetch(`${WHISPER_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}