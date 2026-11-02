export type ApiEnvelope<T> = { success: boolean; message: string; data: T; errors?: Array<{ message?: string; path?: string } | string>; meta?: unknown };
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;
export const tokenStore = { get: () => accessToken, set: (token: string | null) => { accessToken = token; } };

function safeMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
    const details = 'errors' in body && Array.isArray(body.errors)
      ? body.errors.map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'message' in item && typeof item.message === 'string') {
          const field = 'field' in item && typeof item.field === 'string' ? `${item.field}: ` : '';
          return `${field}${item.message}`;
        }
        return '';
      }).filter(Boolean)
      : [];
    return details.length ? `${body.message}: ${details.join('; ')}` : body.message;
  }
  return fallback;
}
async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !(init.body instanceof Blob)) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('Accept', 'application/json');
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include', cache: 'no-store', redirect: 'error' });
  const body: unknown = await response.json().catch(() => null);
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, init, false);
    accessToken = null;
  }
  if (!response.ok) {
    const error = new Error(safeMessage(body, `Request failed (${response.status})`)) as Error & { status?: number; errors?: unknown };
    error.status = response.status;
    error.errors = body && typeof body === 'object' && 'errors' in body ? body.errors : undefined;
    throw error;
  }
  return body as ApiEnvelope<T>;
}
async function requestBlob(path: string, retry = true): Promise<Blob> {
  const headers = new Headers({ Accept: 'application/pdf' });
  if (accessToken) headers.set('Authorization', `******`);
  const response = await fetch(`${API_BASE}${path}`, { headers, credentials: 'include', cache: 'no-store', redirect: 'error' });
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return requestBlob(path, false);
    accessToken = null;
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const error = new Error(safeMessage(body, `Request failed (${response.status})`)) as Error & { status?: number; errors?: unknown };
    error.status = response.status;
    error.errors = body && typeof body === 'object' && 'errors' in body ? body.errors : undefined;
    throw error;
  }
  return response.blob();
}
export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const result = await request<{ accessToken?: string }>('/auth/refresh-token', { method: 'POST' }, false);
      accessToken = result.data?.accessToken ?? null;
      return Boolean(accessToken);
    } catch { accessToken = null; return false; }
    finally { refreshPromise = null; }
  })();
  return refreshPromise;
}
export const api = {
  get: <T,>(path: string) => request<T>(path),
  getBlob: (path: string) => requestBlob(path),
  post: <T,>(path: string, data?: unknown) => request<T>(path, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) }),
  put: <T,>(path: string, body: Blob, contentType: string) => request<T>(path, { method: 'PUT', body, headers: { 'Content-Type': contentType } }),
  patch: <T,>(path: string, data: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),
};
