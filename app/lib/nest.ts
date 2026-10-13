/**
 * Progressive AutoHub — central NestJS frontend client (Phase 0).
 * Pure-frontend rule: browser AND Server Components call the NestJS REST API
 * directly via these helpers. Never call the Next.js `/api` BFF, Prisma,
 * PostgreSQL, or local JSON from migrated code.
 * Base URL comes from NEXT_PUBLIC_API_URL (e.g. http://localhost:5000/api).
 * The NestJS envelope `{ success, data }` is unwrapped — callers get `data`.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(
  /\/+$/,
  "",
);

/** Origin of the NestJS server (e.g. http://localhost:5000) — used to resolve
 *  the few root-relative paths this app does not serve itself. */
export const NEST_ORIGIN = API_BASE.replace(/\/api$/, "") || "http://localhost:5000";

/** HTTP failure (status > 0) or unreachable backend (status 0). */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface NestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  token?: string | null;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
  cache?: RequestCache;
  /**
   * Seconds to reuse a successful GET response, via Next's Data Cache.
   *
   * Without it every call is `no-store`, so the public catalogue is re-fetched
   * from NestJS on every render of every page. That is what exhausted the
   * backend's 600 req/min ThrottlerGuard: a build renders all pages at once, and
   * every real page load pays again. Public catalogue reads are the same for
   * everyone and stale by a minute is harmless, so they opt in.
   *
   * Ignored in the browser, where `next` has no meaning.
   */
  revalidate?: number;
}

/**
 * In-flight coalescing for identical GETs.
 *
 * Every call here used `cache: "no-store"` and there was no other sharing, so a
 * page that fetched the same collection twice paid for it twice, and in
 * development React's StrictMode double-render doubled it again. The NestJS
 * `ThrottlerGuard` (600 req/min, ~10/s) counts every one of those, which is what
 * produces the 429 spam — the frontend's own fan-out, not a client attack.
 *
 * Only GETs are shared, and only while a request is already running: the entry
 * is removed the moment it settles, so this never serves a stale body and never
 * caches across requests. POST/PATCH/DELETE are never coalesced.
 */
const inFlight = new Map<string, Promise<unknown>>();

function coalesceKey(path: string, options: NestOptions): string | null {
  if ((options.method ?? "GET") !== "GET") return null;
  if (options.body !== undefined) return null;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(options.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const suffix = qs.toString();
  // The token is part of the identity and must be used in full: keying on
  // merely "is there a token" would coalesce two different users' private reads
  // into one request, and the second caller would be handed the first caller's
  // data. The map never leaves the process, so holding the token here is safe.
  return `${path}${suffix ? `?${suffix}` : ""}::${options.token ?? ""}`;
}

/** Typed request to the NestJS API. Path is relative to `/api`. Throws ApiError. */
export async function nest<T = unknown>(path: string, options: NestOptions = {}): Promise<T> {
  const qs = new URLSearchParams();
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}${suffix}`;

  const shareKey = coalesceKey(path, options);
  const existing = shareKey ? inFlight.get(shareKey) : undefined;
  if (existing) return existing as Promise<T>;

  const run = (async (): Promise<T> => {
    // On the server, an opt-in revalidate means "use the Data Cache". `next` is
    // a Next-only fetch extension and is ignored in the browser, so the browser
    // always keeps the explicit `no-store` default below.
    const useDataCache =
      Boolean(options.revalidate) &&
      (options.method ?? "GET") === "GET" &&
      typeof window === "undefined";

    let res: Response;
    try {
      res = await fetch(url, {
        method: options.method ?? "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(options.timeoutMs ?? 8_000),
        // `cache` and `next.revalidate` are mutually exclusive in Next: sending
        // the `no-store` default *and* an opt-in revalidate triggers "Specified
        // 'cache: no-store' and 'revalidate: …'" and leaves it ambiguous which
        // wins. On the server we honour the Data Cache by sending only
        // `next.revalidate`; in the browser `next` is meaningless, so the
        // default `no-store` is kept.
        ...(useDataCache
          ? { next: { revalidate: options.revalidate } }
          : { cache: options.cache ?? "no-store" }),
      });
    } catch {
      throw new ApiError(0, "Backend unreachable");
    }

    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // Non-JSON body — leave as null.
    }

    if (!res.ok) {
      const record = (json ?? {}) as Record<string, unknown>;
      const raw = record.message ?? record.error ?? `Request failed (${res.status})`;
      // A 429 comes from the backend's ThrottlerGuard, i.e. the frontend asked
      // too often. Surfaced with its own message so it is not mistaken for a
      // broken endpoint, and the Retry-After the guard sends is preserved.
      if (res.status === 429) {
        throw new ApiError(429, "The API is rate limited. Try again in a moment.");
      }
      throw new ApiError(res.status, Array.isArray(raw) ? raw.join(", ") : String(raw));
    }

    const record = (json ?? {}) as Record<string, unknown>;
    if (record && typeof record === "object" && "data" in record) {
      return record.data as T;
    }
    return json as T;
  })();

  if (shareKey) {
    inFlight.set(shareKey, run);
    // Drop the entry once the request settles, whatever the outcome.
    // `then(cleanup, cleanup)` rather than `finally`: `finally` produces a new
    // promise that rejects with the same reason, and `void`-ing that leaves an
    // unhandledRejection behind on every failed request.
    const cleanup = (): void => {
      if (inFlight.get(shareKey) === run) inFlight.delete(shareKey);
    };
    void run.then(cleanup, cleanup);
  }

  return run;
}

/** True when the backend could not be reached at all. */
export function isUnreachable(err: unknown): boolean {
  return err instanceof ApiError && err.status === 0;
}

/** Human-friendly message for UI error states. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return fallback;
    if (err.status === 429) return "Too many requests — the API is rate limited. Try again in a moment.";
    return err.message || fallback;
  }
  return fallback;
}

/** Test-only: number of GETs currently being shared. */
export function inFlightGetCount(): number {
  return inFlight.size;
}
