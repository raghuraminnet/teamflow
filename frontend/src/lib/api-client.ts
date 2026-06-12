import { api, ApiError } from './api';
import { useAuthStore } from './store';

export function apiClient() {
  async function get<T>(path: string): Promise<T> {
    const token = useAuthStore.getState().accessToken;
    const data = await api.get(path, undefined, token);
    return data as T;
  }

  async function post<T>(path: string, body: unknown): Promise<T> {
    const token = useAuthStore.getState().accessToken;
    const data = await api.post(path, body, token);
    return data as T;
  }

  async function put<T>(path: string, body: unknown): Promise<T> {
    const token = useAuthStore.getState().accessToken;
    const data = await api.put(path, body, token);
    return data as T;
  }

  async function del<T>(path: string): Promise<T> {
    const token = useAuthStore.getState().accessToken;
    const data = await api.del(path, token);
    return data as T;
  }

  return { get, post, put, del };
}

// Re-export for convenience
export { api, ApiError };