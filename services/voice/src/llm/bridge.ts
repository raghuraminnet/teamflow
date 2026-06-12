import fetch from 'node-fetch';

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'ollama';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function generate(prompt: string, history?: Message[]): Promise<string> {
  if (LLM_PROVIDER === 'openai') {
    return generateOpenAI(prompt, history);
  }
  return generateOllama(prompt, history);
}

async function generateOllama(prompt: string, history?: Message[]): Promise<string> {
  try {
    const messages: Message[] = history
      ? [...history, { role: 'user', content: prompt }]
      : [{ role: 'user', content: prompt }];

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    const data = await response.json() as { response?: string; error?: string };
    if (data.error) {
      throw new Error(data.error);
    }
    return data.response || '';
  } catch (err) {
    console.warn('[LLM] Ollama unavailable:', (err as Error).message);
    throw err;
  }
}

async function generateOpenAI(prompt: string, history?: Message[]): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  try {
    const messages: Message[] = history
      ? [...history, { role: 'user', content: prompt }]
      : [{ role: 'user', content: prompt }];

    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI HTTP ${response.status}`);
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content || '';
  } catch (err) {
    console.warn('[LLM] OpenAI unavailable:', (err as Error).message);
    throw err;
  }
}

export async function checkLLM(): Promise<boolean> {
  try {
    if (LLM_PROVIDER === 'openai') {
      return !!OPENAI_API_KEY;
    }
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}