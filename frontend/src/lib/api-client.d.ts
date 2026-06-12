import { api, ApiError } from './api';
export declare function apiClient(): {
    get: <T>(path: string) => Promise<T>;
    post: <T>(path: string, body: unknown) => Promise<T>;
    put: <T>(path: string, body: unknown) => Promise<T>;
    del: <T>(path: string) => Promise<T>;
};
export { api, ApiError };
//# sourceMappingURL=api-client.d.ts.map