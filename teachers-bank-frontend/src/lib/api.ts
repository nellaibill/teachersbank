// src/lib/api.ts
import { getAuthToken } from '@/context/AuthContext';

const PHP_BASE = 'https://iiplrgscbse.com/teachers-bank-api-v2/index.php';

export async function apiFetch<T = any>(
  route: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: object,
  params?: Record<string, string | number | undefined>
): Promise<{ success: boolean; message: string; data: T }> {

  const qs = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
  }

  const token = getAuthToken();
  const url   = `${PHP_BASE}/${route}${qs.toString() ? '?' + qs.toString() : ''}`;

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type':  'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });

  const json = await res.json();

  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok && !json.success) {
    throw new Error(json.message || 'API error');
  }
  return json;
}

export const teachersApi = {
  list:   (params?: Record<string, any>) => apiFetch('api/teachers', 'GET', undefined, params),
  get:    (id: number)                   => apiFetch(`api/teachers/${id}`),
  create: (data: object)                 => apiFetch('api/teachers', 'POST', data),
  import: (rows: object[])               => apiFetch('api/teachers', 'POST', { rows }),
  update: (id: number, data: object)     => apiFetch(`api/teachers/${id}`, 'PUT', data),
  delete: (id: number)                   => apiFetch(`api/teachers/${id}`, 'DELETE'),
};

export const dispatchApi = {
  list:   (params?: Record<string, any>) => apiFetch('api/dispatch', 'GET', undefined, params),
  get:    (id: number)                   => apiFetch(`api/dispatch/${id}`),
  scan:   (barcode: string, dispatch_date: string) => apiFetch('api/dispatch', 'POST', { barcode, dispatch_date }),
  update: (id: number, data: object)     => apiFetch(`api/dispatch/${id}`, 'PUT', data),
};

export const followupsApi = {
  list:   (params?: Record<string, any>) => apiFetch('api/followups', 'GET', undefined, params),
  get:    (id: number)                   => apiFetch(`api/followups/${id}`),
  create: (data: object)                 => apiFetch('api/followups', 'POST', data),
  update: (id: number, data: object)     => apiFetch(`api/followups/${id}`, 'PUT', data),
};

export const reportsApi = {
  get: (type: string, params?: Record<string, any>) =>
    apiFetch('api/reports', 'GET', undefined, { type, ...params }),
};

export const usersApi = {
  list:   ()                         => apiFetch('api/users'),
  get:    (id: number)               => apiFetch(`api/users/${id}`),
  create: (data: object)             => apiFetch('api/users', 'POST', data),
  update: (id: number, data: object) => apiFetch(`api/users/${id}`, 'PUT', data),
  delete: (id: number)               => apiFetch(`api/users/${id}`, 'DELETE'),
};

export const backupApi = {
  download: async () => {
    const token = getAuthToken();
    const urlsToTry = [
      `${PHP_BASE}/api/backup`,
      'https://iiplrgscbse.com/teachers-bank-api/index.php/api/backup',
    ];

    let finalBlob: Blob | null = null;
    let finalFilename = '';
    let lastError = 'Failed to download backup';
    for (const urlToTry of urlsToTry) {
      const res = await fetch(urlToTry, {
        method: 'GET',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        try {
          const json = await res.json();
          lastError = json.message || 'Failed to download backup';
        } catch {
          lastError = 'Failed to download backup';
        }
        continue;
      }

      const contentType = (res.headers.get('content-type') || '').toLowerCase();

      // If endpoint returns the API info JSON, this base is not serving backup correctly.
      if (contentType.includes('application/json')) {
        try {
          const json = await res.json();
          lastError = json.message || 'Backup endpoint returned JSON instead of SQL dump';
        } catch {
          lastError = 'Backup endpoint returned JSON instead of SQL dump';
        }
        continue;
      }

      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);

      finalBlob = blob;
      finalFilename = match?.[1] || `teachers_bank_backup_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.sql`;
      break;
    }

    if (!finalBlob) {
      throw new Error(lastError);
    }

    const url = URL.createObjectURL(finalBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
