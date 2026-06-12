import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface TTSResult { audioFile: string; durationSecs: number; }

export class PiperTTS {
  constructor(private url: string, private voice: string, private outputDir = '/tmp/piper_audio') {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  }

  async speak(text: string): Promise<TTSResult> {
    const outputPath = path.join(this.outputDir, `${uuidv4()}.wav`);
    try {
      const r = await axios.post(`${this.url}/api/tts`, { text, voice: this.voice }, { responseType: 'arraybuffer', timeout: 15000 });
      fs.writeFileSync(outputPath, r.data);
      return { audioFile: outputPath, durationSecs: Math.max(1, Math.ceil(text.length / 3)) };
    } catch { throw new Error('Piper TTS failed'); }
  }

  async speakToBuffer(text: string): Promise<Buffer> {
    const { audioFile } = await this.speak(text);
    const buf = fs.readFileSync(audioFile); fs.unlinkSync(audioFile);
    return buf;
  }
}