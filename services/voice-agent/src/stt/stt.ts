import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

export interface STTResult { text: string; language?: string; duration?: number; }

export class WhisperSTT {
  constructor(private url: string, private model: string = 'base') {}

  async transcribe(audioBuffer: Buffer, mimeType = 'audio/wav'): Promise<STTResult> {
    const form = new FormData();
    const ext = { 'audio/wav':'wav','audio/mp3':'mp3','audio/mpeg':'mp3','audio/ogg':'ogg','audio/webm':'webm' }[mimeType] || 'wav';
    form.append('file', audioBuffer, { filename: `audio.${ext}`, contentType: mimeType });
    form.append('model', this.model); form.append('response', 'json');
    try {
      const r = await axios.post(`${this.url}/inference`, form, { headers: form.getHeaders(), timeout: 30000 });
      return { text: r.data.text || '', language: r.data.language, duration: r.data.duration };
    } catch { throw new Error(`STT failed`); }
  }

  async transcribeFile(filePath: string): Promise<STTResult> { return this.transcribe(fs.readFileSync(filePath)); }
}