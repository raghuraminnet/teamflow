const BASE = '/api';

export async function apiFetch(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || `API ${res.status}`);
  }
  return res.json();
}

export const voiceApi = {
  agents: {
    list: (t: string) => apiFetch('/voice/agents', t),
    get: (t: string, id: number) => apiFetch(`/voice/agents/${id}`, t),
    create: (t: string, d: unknown) => apiFetch('/voice/agents', t, { method: 'POST', body: JSON.stringify(d) }),
    update: (t: string, id: number, d: unknown) => apiFetch(`/voice/agents/${id}`, t, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (t: string, id: number) => apiFetch(`/voice/agents/${id}`, t, { method: 'DELETE' }),
    test: (t: string, id: number, phone: string) => apiFetch(`/voice/agents/${id}/test`, t, { method: 'POST', body: JSON.stringify({ phone }) }),
  },
  campaigns: {
    list: (t: string) => apiFetch('/voice/campaigns', t),
    get: (t: string, id: number) => apiFetch(`/voice/campaigns/${id}`, t),
    create: (t: string, d: unknown) => apiFetch('/voice/campaigns', t, { method: 'POST', body: JSON.stringify(d) }),
    run: (t: string, id: number) => apiFetch(`/voice/campaigns/${id}/run`, t, { method: 'POST' }),
    stop: (t: string, id: number) => apiFetch(`/voice/campaigns/${id}/stop`, t, { method: 'POST' }),
  },
  calls: {
    list: (t: string, params?: { limit?: number }) => apiFetch(`/voice/calls${params?.limit ? `?limit=${params.limit}` : ''}`, t),
    get: (t: string, id: number) => apiFetch(`/voice/calls/${id}`, t),
  },
  stats: { summary: (t: string) => apiFetch('/voice/stats/summary', t) },
};
