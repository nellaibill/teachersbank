// src/lib/api.ts
// All requests go through Next.js /api/proxy/* route (eliminates CORS).
// The proxy server-side calls: PHP_BASE/api/teachers?page=1
// Browser calls:               /api/proxy/api/teachers?page=1  (same origin ✅)

const PROXY = '/api/proxy'; // relative — always same origin, no CORS

export async function apiFetch<T = any>(
  route: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: object,
  params?: Record<string, string | number | undefined>
): Promise<{ success: boolean; message: string; data: T }> {

  // Build query string
  const qs = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
  }

  // e.g. /api/proxy/api/teachers?page=1&limit=20
  const queryString = qs.toString();
  const url = `${PROXY}/${route}${queryString ? '?' + queryString : ''}`;

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });

  const json = await res.json();
  if (!res.ok && !json.success) {
    throw new Error(json.message || 'API error');
  }
  return json;
}

// ── Teachers ──────────────────────────────────────────────────────────────────
export const teachersApi = {
  list:   (params?: Record<string, any>) => apiFetch('api/teachers', 'GET', undefined, params),
  get:    (id: number)     => apiFetch(`api/teachers/${id}`),
  create: (data: object)   => apiFetch('api/teachers', 'POST', data),
  update: (id: number, data: object) => apiFetch(`api/teachers/${id}`, 'PUT', data),
  delete: (id: number)     => apiFetch(`api/teachers/${id}`, 'DELETE'),
};

// ── Dispatch ──────────────────────────────────────────────────────────────────
export const dispatchApi = {
  list:   (params?: Record<string, any>) => apiFetch('api/dispatch', 'GET', undefined, params),
  get:    (id: number)     => apiFetch(`api/dispatch/${id}`),
  scan:   (barcode: string, dispatch_date: string) => apiFetch('api/dispatch', 'POST', { barcode, dispatch_date }),
  update: (id: number, data: object) => apiFetch(`api/dispatch/${id}`, 'PUT', data),
};

// ── Followups ─────────────────────────────────────────────────────────────────
export const followupsApi = {
  list:   (params?: Record<string, any>) => apiFetch('api/followups', 'GET', undefined, params),
  get:    (id: number)     => apiFetch(`api/followups/${id}`),
  create: (data: object)   => apiFetch('api/followups', 'POST', data),
  update: (id: number, data: object) => apiFetch(`api/followups/${id}`, 'PUT', data),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsApi = {
  get: (type: string, params?: Record<string, any>) =>
    apiFetch('api/reports', 'GET', undefined, { type, ...params }),
};