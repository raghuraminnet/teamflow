export declare class ApiError extends Error {
    status: number;
    constructor(status: number, message: string);
}
export declare const api: {
    get: <T>(path: string, token?: string | null) => Promise<T>;
    post: <T>(path: string, body?: unknown, token?: string | null) => Promise<T>;
    put: <T>(path: string, body?: unknown, token?: string | null) => Promise<T>;
    del: <T>(path: string, token?: string | null) => Promise<T>;
    login: (body: {
        email: string;
        password: string;
    }) => Promise<any>;
    register: (body: {
        name: string;
        email: string;
        password: string;
    }) => Promise<any>;
    refresh: (body: {
        refreshToken: string;
    }) => Promise<any>;
    getClients: (params?: {
        search?: string;
    }) => Promise<any>;
    createClient: (body: unknown) => Promise<any>;
    updateClient: (id: number, body: unknown) => Promise<any>;
    deleteClient: (id: number) => Promise<any>;
    getProjects: (params?: {
        clientId?: number;
        status?: string;
    }) => Promise<any>;
    createProject: (body: unknown) => Promise<any>;
    getProject: (id: number) => Promise<any>;
    updateProject: (id: number, body: unknown) => Promise<any>;
    deleteProject: (id: number) => Promise<any>;
    getTasks: (params?: {
        projectId?: number;
        assignedTo?: number;
        status?: string;
        priority?: string;
    }) => Promise<any>;
    createTask: (body: unknown) => Promise<any>;
    getTask: (id: number) => Promise<any>;
    updateTask: (id: number, body: unknown) => Promise<any>;
    deleteTask: (id: number) => Promise<any>;
    getComments: (taskId: number) => Promise<any>;
    addComment: (taskId: number, content: string) => Promise<any>;
    getWorkflows: () => Promise<any>;
    createWorkflow: (body: unknown) => Promise<any>;
    updateWorkflow: (id: number, body: unknown) => Promise<any>;
    deleteWorkflow: (id: number) => Promise<any>;
    runWorkflow: (id: number, body?: {
        projectId?: number;
    }) => Promise<any>;
    getWorkflowRuns: (id: number) => Promise<any>;
    getArticles: (params?: {
        q?: string;
        category?: string;
    }) => Promise<any>;
    createArticle: (body: unknown) => Promise<any>;
    getArticle: (id: number) => Promise<any>;
    updateArticle: (id: number, body: unknown) => Promise<any>;
    deleteArticle: (id: number) => Promise<any>;
    getActivity: () => Promise<any>;
    getProjectActivity: (projectId: number) => Promise<any>;
    getUsers: () => Promise<any>;
    createUser: (body: unknown) => Promise<any>;
    updateUser: (id: number, body: unknown) => Promise<any>;
    deleteUser: (id: number) => Promise<any>;
    getStats: () => Promise<any>;
};
//# sourceMappingURL=api.d.ts.map