/**
 * NestJS backend client for BFF route handlers.
 *
 * The Next.js app is a pure frontend — the authoritative data source is the
 * NestJS REST API (progressive-autohub-backend, default http://localhost:5000).
 * Route handlers use `backendFetch` to proxy to it, and fall back to their
 * local implementations only when the backend is unreachable.
 *
 * The backend wraps successful responses in `{ success, data }` — this helper
 * unwraps `data` so callers receive the payload directly.
 */

export const BACKEND_URL =
  (process.env.NESTJS_API_URL ?? "http://localhost:5000").replace(/\/+$/, "");

export const isBackendConfigured = () =>
  Boolean(process.env.NESTJS_API_URL);

/** Error thrown when the backend rejects a request (status > 0) or is unreachable (status 0). */
export class BackendError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

export interface BackendFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** NestJS access token from the session — sent as `Authorization: Bearer <token>`. */
  token?: string | null;
  body?: unknown;
  timeoutMs?: number;
}

/**
 * Proxy a request to the NestJS API.
 *
 * `path` is relative to `/api`, e.g. `backendFetch("/vehicles")` calls
 * `{BACKEND_URL}/api/vehicles`. Returns the unwrapped `data` payload.
 * Throws `BackendError` with `status = 0` when the backend is unreachable.
 */
export async function backendFetch<T = unknown>(
  path: string,
  options: BackendFetchOptions = {},
): Promise<T> {
  // BACKEND_URL may already include `/api` (e.g. env NESTJS_API_URL=http://…:5000/api).
  // NestJS paths below are relative to /api, so only add `/api` when the origin lacks it.
  const origin = BACKEND_URL.endsWith("/api") ? BACKEND_URL : `${BACKEND_URL}/api`;
  const url = `${origin}${path.startsWith("/") ? path : `/${path}`}`;
  let res: Response;

  try {
    res = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(options.timeoutMs ?? 6_000),
      cache: "no-store",
    });
  } catch {
    throw new BackendError(0, "Backend unreachable");
  }

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON response body — leave json as null.
  }

  if (!res.ok) {
    const record = (json ?? {}) as Record<string, unknown>;
    const message =
      (record.message as string) ??
      (record.error as string) ??
      `Backend error (${res.status})`;
    throw new BackendError(
      res.status,
      typeof message === "string" ? message : JSON.stringify(message),
    );
  }

  const record = (json ?? {}) as Record<string, unknown>;
  if (record && typeof record === "object" && "data" in record) {
    return record.data as T;
  }
  return json as T;
}

/** True when an error means the backend couldn't be reached at all. */
export function isBackendUnreachable(err: unknown): boolean {
  return err instanceof BackendError && err.status === 0;
}