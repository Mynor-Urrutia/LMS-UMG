const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...fetchOptions } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    ...fetchOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 204) return undefined as T;

  let data: unknown;
  try { data = await res.json(); } catch { data = null; }

  if (!res.ok) {
    const msg = (data as { message?: string })?.message ?? res.statusText;
    throw new ApiError(res.status, typeof msg === 'string' ? msg : 'Request failed', data);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, token?: string, init?: RequestInit) =>
    request<T>(path, { method: 'GET', token, ...init }),

  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), token }),

  patch: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body), token }),

  delete: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'DELETE', token }),

  upload: async <T>(path: string, formData: FormData, token?: string): Promise<T> => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.status === 204) return undefined as T;
    let data: unknown;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) {
      const msg = (data as { message?: string })?.message ?? res.statusText;
      throw new ApiError(res.status, typeof msg === 'string' ? msg : 'Request failed', data);
    }
    return data as T;
  },
};
