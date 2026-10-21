import { getSession, setSession } from './session';

// Vite proxies /api/* to the Nest API in dev (see vite.config.ts).
const BASE_URL = '/api';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    // Nest errors look like { statusCode, message, error }.
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(', ');
    if (body.message) return body.message;
  } catch {
    // Not JSON, e.g. the dev proxy could not reach the API.
  }
  return res.statusText || `Request failed with status ${res.status}`;
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (session) headers.Authorization = `Bearer ${session.accessToken}`;

  const res = await fetch(BASE_URL + path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  // The token is no longer accepted: drop it, which sends the user to /login.
  if (res.status === 401) setSession(null);
  if (!res.ok) throw new ApiError(res.status, await readErrorMessage(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
