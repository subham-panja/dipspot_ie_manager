export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export async function fetchJson<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    let msg = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(errorBody);
      msg = parsed.error || parsed.message || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return res.json();
}

