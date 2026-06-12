import { api, ApiError } from './api';
import { useAuthStore } from './store';
export function apiClient() {
    async function get(path) {
        const token = useAuthStore.getState().accessToken;
        const data = await api.get(path, undefined, token);
        return data;
    }
    async function post(path, body) {
        const token = useAuthStore.getState().accessToken;
        const data = await api.post(path, body, token);
        return data;
    }
    async function put(path, body) {
        const token = useAuthStore.getState().accessToken;
        const data = await api.put(path, body, token);
        return data;
    }
    async function del(path) {
        const token = useAuthStore.getState().accessToken;
        const data = await api.del(path, token);
        return data;
    }
    return { get, post, put, del };
}
// Re-export for convenience
export { api, ApiError };
