const BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Auto-inject token from Zustand localStorage
  try {
    const raw = localStorage.getItem('teamflow-auth');
    if (raw) {
      const stored = JSON.parse(raw);
      const token = stored.state?.accessToken ?? stored.accessToken;
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (_) {}

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Request failed');
  return data;
}

export const api = {
  // Generic
  get: (path: string) => apiFetch(path, { method: 'GET' }),
  post: (path: string, body: unknown) => apiFetch(path, { method: 'POST', body }),
  put: (path: string, body: unknown) => apiFetch(path, { method: 'PUT', body }),
  del: (path: string) => apiFetch(path, { method: 'DELETE' }),
  // Auth
  login: (body: { email: string; password: string }) => apiFetch('/auth/login', { method: 'POST', body }),
  register: (body: unknown) => apiFetch('/auth/register', { method: 'POST', body }),
  refresh: (body: unknown) => apiFetch('/auth/refresh', { method: 'POST', body }),
  // Clients
  getClients: (params?: { search?: string }) => apiFetch(`/clients${params?.search ? `?search=${encodeURIComponent(params.search)}` : ''}`),
  createClient: (body: unknown) => apiFetch('/clients', { method: 'POST', body }),
  updateClient: (id: number, body: unknown) => apiFetch(`/clients/${id}`, { method: 'PUT', body }),
  deleteClient: (id: number) => apiFetch(`/clients/${id}`, { method: 'DELETE' }),
  // Projects
  getProjects: (params?: { clientId?: number; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.clientId) q.set('clientId', String(params.clientId));
    if (params?.status) q.set('status', params.status);
    return apiFetch(`/projects${q.toString() ? `?${q}` : ''}`);
  },
  createProject: (body: unknown) => apiFetch('/projects', { method: 'POST', body }),
  getProject: (id: number) => apiFetch(`/projects/${id}`),
  updateProject: (id: number, body: unknown) => apiFetch(`/projects/${id}`, { method: 'PUT', body }),
  deleteProject: (id: number) => apiFetch(`/projects/${id}`, { method: 'DELETE' }),
  // Tasks
  getTasks: (params?: { projectId?: number; assignedTo?: number; status?: string; priority?: string }) => {
    const q = new URLSearchParams();
    if (params?.projectId) q.set('projectId', String(params.projectId));
    if (params?.assignedTo) q.set('assignedTo', String(params.assignedTo));
    if (params?.status) q.set('status', params.status);
    if (params?.priority) q.set('priority', params.priority);
    return apiFetch(`/tasks${q.toString() ? `?${q}` : ''}`);
  },
  createTask: (body: unknown) => apiFetch('/tasks', { method: 'POST', body }),
  getTask: (id: number) => apiFetch(`/tasks/${id}`),
  updateTask: (id: number, body: unknown) => apiFetch(`/tasks/${id}`, { method: 'PUT', body }),
  deleteTask: (id: number) => apiFetch(`/tasks/${id}`, { method: 'DELETE' }),
  getComments: (taskId: number) => apiFetch(`/tasks/${taskId}/comments`),
  addComment: (taskId: number, content: string) => apiFetch(`/tasks/${taskId}/comments`, { method: 'POST', body: { content } }),
  // Workflows
  getWorkflows: () => apiFetch('/workflows'),
  createWorkflow: (body: unknown) => apiFetch('/workflows', { method: 'POST', body }),
  updateWorkflow: (id: number, body: unknown) => apiFetch(`/workflows/${id}`, { method: 'PUT', body }),
  deleteWorkflow: (id: number) => apiFetch(`/workflows/${id}`, { method: 'DELETE' }),
  runWorkflow: (id: number, body: unknown) => apiFetch(`/workflows/${id}/run`, { method: 'POST', body }),
  getWorkflowRuns: (id: number) => apiFetch(`/workflows/${id}/runs`),
  // KB
  getArticles: (params?: { q?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.q) q.set('q', params.q);
    if (params?.category) q.set('category', params.category);
    return apiFetch(`/kb${q.toString() ? `?${q}` : ''}`);
  },
  createArticle: (body: unknown) => apiFetch('/kb', { method: 'POST', body }),
  getArticle: (id: number) => apiFetch(`/kb/${id}`),
  updateArticle: (id: number, body: unknown) => apiFetch(`/kb/${id}`, { method: 'PUT', body }),
  deleteArticle: (id: number) => apiFetch(`/kb/${id}`, { method: 'DELETE' }),
  // Activity
  getActivity: () => apiFetch('/activity'),
  getProjectActivity: (projectId: number) => apiFetch(`/activity/project/${projectId}`),
  // Admin
  getUsers: () => apiFetch('/admin/users'),
  createUser: (body: unknown) => apiFetch('/admin/users', { method: 'POST', body }),
  updateUser: (id: number, body: unknown) => apiFetch(`/admin/users/${id}`, { method: 'PUT', body }),
  deleteUser: (id: number) => apiFetch(`/admin/users/${id}`, { method: 'DELETE' }),
  getStats: () => apiFetch('/admin/stats'),
};

export const voiceApi = {
  agents: {
    list: () => apiFetch('/voice/agents'),
    get: (id: number) => apiFetch(`/voice/agents/${id}`),
    create: (d: unknown) => apiFetch('/voice/agents', { method: 'POST', body: d }),
    update: (id: number, d: unknown) => apiFetch(`/voice/agents/${id}`, { method: 'PUT', body: d }),
    delete: (id: number) => apiFetch(`/voice/agents/${id}`, { method: 'DELETE' }),
    test: (id: number, phone: string) => apiFetch(`/voice/agents/${id}/test`, { method: 'POST', body: { phone } }),
  },
  campaigns: {
    list: () => apiFetch('/voice/campaigns'),
    get: (id: number) => apiFetch(`/voice/campaigns/${id}`),
    create: (d: unknown) => apiFetch('/voice/campaigns', { method: 'POST', body: d }),
    run: (id: number) => apiFetch(`/voice/campaigns/${id}/run`, { method: 'POST' }),
    stop: (id: number) => apiFetch(`/voice/campaigns/${id}/stop`, { method: 'POST' }),
  },
  calls: {
    list: (params?: { limit?: number }) => apiFetch(`/voice/calls${params?.limit ? `?limit=${params.limit}` : ''}`),
    get: (id: number) => apiFetch(`/voice/calls/${id}`),
  },
  stats: { summary: () => apiFetch('/voice/stats/summary') },
};
