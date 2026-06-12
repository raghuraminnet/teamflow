import axios from 'axios';

export interface LLMMessage { role: 'system' | 'user' | 'assistant'; content: string; }
export type LLMProvider = 'ollama' | 'openai' | 'minimax';

export class LLMClient {
  constructor(
    private provider: LLMProvider = 'minimax',
    private ollamaUrl = 'http://localhost:11434',
    private ollamaModel = 'llama3.2:latest',
    private openaiApiKey = '',
    private openaiModel = 'gpt-4o-mini',
    private minimaxApiKey = '',
    private minimaxModel = 'MiniMax-Text-01'
  ) {}

  async chat(messages: LLMMessage[]): Promise<string> {
    if (this.provider === 'ollama') return this.ollama(messages);
    if (this.provider === 'minimax') return this.minimax(messages);
    return this.openai(messages);
  }

  private async ollama(m: LLMMessage[]) {
    const r = await axios.post(`${this.ollamaUrl}/api/chat`, { model: this.ollamaModel, messages: m, stream: false }, { timeout: 30000 });
    return r.data.message?.content || '';
  }
  private async openai(m: LLMMessage[]) {
    const r = await axios.post('https://api.openai.com/v1/chat/completions', { model: this.openaiModel, messages: m }, { headers: { Authorization: `Bearer ${this.openaiApiKey}`, 'Content-Type': 'application/json' }, timeout: 30000 });
    return r.data.choices?.[0]?.message?.content || '';
  }
  private async minimax(m: LLMMessage[]) {
    const r = await axios.post('https://api.minimax.chat/v1/text/chatcompletion_v2', { model: this.minimaxModel, messages: m }, { headers: { Authorization: `Bearer ${this.minimaxApiKey}`, 'Content-Type': 'application/json' }, timeout: 30000 });
    return r.data.choices?.[0]?.message?.content || '';
  }

  async generateResponse(system: string, transcript: string, history: LLMMessage[] = []): Promise<string> {
    return this.chat([{ role:'system', content:system }, ...history, { role:'user', content:transcript }]);
  }

  async summarizeCall(conversation: string, duration: number): Promise<string> {
    const prompt = `Summarize this phone call in 2-3 sentences. Focus on key decisions and action items.\nDuration: ${Math.floor(duration/60)} min\n\nTranscript:\n${conversation}`;
    return this.chat([{ role:'system', content:'You are a call summary assistant.' }, { role:'user', content:prompt }]);
  }
}