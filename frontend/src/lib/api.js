const API_BASE = 'https://api.codeapp.site/api';
export class ApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
}
async function apiFetch(path, opts = {}, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token)
        headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, {
        method: opts.method ?? 'GET',
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
        throw new ApiError(res.status, data.error ?? 'Request failed');
    return data;
}
export const api = {
    // Generic
    get: (path, token) => apiFetch(path, { method: 'GET' }, token),
    post: (path, body, token) => apiFetch(path, { method: 'POST', body }, token),
    put: (path, body, token) => apiFetch(path, { method: 'PUT', body }, token),
    del: (path, token) => apiFetch(path, { method: 'DELETE' }, token),
    // Auth
    login: (body) => apiFetch('/auth/login', { method: 'POST', body }),
    register: (body) => apiFetch('/auth/register', { method: 'POST', body }),
    refresh: (body) => apiFetch('/auth/refresh', { method: 'POST', body }),
    // Clients
    getClients: (params) => apiFetch(`/clients${params?.search ? `?search=${encodeURIComponent(params.search)}` : ''}`),
    createClient: (body) => apiFetch('/clients', { method: 'POST', body }),
    updateClient: (id, body) => apiFetch(`/clients/${id}`, { method: 'PUT', body }),
    deleteClient: (id) => apiFetch(`/clients/${id}`, { method: 'DELETE' }),
    // Projects
    getProjects: (params) => {
        const q = new URLSearchParams();
        if (params?.clientId)
            q.set('clientId', String(params.clientId));
        if (params?.status)
            q.set('status', params.status);
        return apiFetch(`/projects${q.toString() ? `?${q}` : ''}`);
    },
    createProject: (body) => apiFetch('/projects', { method: 'POST', body }),
    getProject: (id) => apiFetch(`/projects/${id}`),
    updateProject: (id, body) => apiFetch(`/projects/${id}`, { method: 'PUT', body }),
    deleteProject: (id) => apiFetch(`/projects/${id}`, { method: 'DELETE' }),
    // Tasks
    getTasks: (params) => {
        const q = new URLSearchParams();
        if (params?.projectId)
            q.set('projectId', String(params.projectId));
        if (params?.assignedTo)
            q.set('assignedTo', String(params.assignedTo));
        if (params?.status)
            q.set('status', params.status);
        if (params?.priority)
            q.set('priority', params.priority);
        return apiFetch(`/tasks${q.toString() ? `?${q}` : ''}`);
    },
    createTask: (body) => apiFetch('/tasks', { method: 'POST', body }),
    getTask: (id) => apiFetch(`/tasks/${id}`),
    updateTask: (id, body) => apiFetch(`/tasks/${id}`, { method: 'PUT', body }),
    deleteTask: (id) => apiFetch(`/tasks/${id}`, { method: 'DELETE' }),
    getComments: (taskId) => apiFetch(`/tasks/${taskId}/comments`),
    addComment: (taskId, content) => apiFetch(`/tasks/${taskId}/comments`, { method: 'POST', body: { content } }),
    // Workflows
    getWorkflows: () => apiFetch('/workflows'),
    createWorkflow: (body) => apiFetch('/workflows', { method: 'POST', body }),
    updateWorkflow: (id, body) => apiFetch(`/workflows/${id}`, { method: 'PUT', body }),
    deleteWorkflow: (id) => apiFetch(`/workflows/${id}`, { method: 'DELETE' }),
    runWorkflow: (id, body) => apiFetch(`/workflows/${id}/run`, { method: 'POST', body }),
    getWorkflowRuns: (id) => apiFetch(`/workflows/${id}/runs`),
    // KB
    getArticles: (params) => {
        const q = new URLSearchParams();
        if (params?.q)
            q.set('q', params.q);
        if (params?.category)
            q.set('category', params.category);
        return apiFetch(`/kb${q.toString() ? `?${q}` : ''}`);
    },
    createArticle: (body) => apiFetch('/kb', { method: 'POST', body }),
    getArticle: (id) => apiFetch(`/kb/${id}`),
    updateArticle: (id, body) => apiFetch(`/kb/${id}`, { method: 'PUT', body }),
    deleteArticle: (id) => apiFetch(`/kb/${id}`, { method: 'DELETE' }),
    // Activity
    getActivity: () => apiFetch('/activity'),
    getProjectActivity: (projectId) => apiFetch(`/activity/project/${projectId}`),
    // Admin
    getUsers: () => apiFetch('/admin/users'),
    createUser: (body) => apiFetch('/admin/users', { method: 'POST', body }),
    updateUser: (id, body) => apiFetch(`/admin/users/${id}`, { method: 'PUT', body }),
    deleteUser: (id) => apiFetch(`/admin/users/${id}`, { method: 'DELETE' }),
    getStats: () => apiFetch('/admin/stats'),
};
