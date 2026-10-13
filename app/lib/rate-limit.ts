import { resolveClientIp } from "./client-ip";
import { RedisClient, isRedisError, parseRedisUrl, type RedisReply } from "./redis-client";

/**
 * Rate limiting for public write endpoints.
 *
 * Two layers, deliberately:
 *
 *   1. `rateLimit` — an in-process fixed-window counter. It is synchronous
 *      (callers get an answer without awaiting I/O) and is the floor: it always
 *      works, even with no network and no Redis. It only protects one instance,
 *      so on its own a horizontally-scaled deployment multiplies every budget
 *      by the number of instances.
 *
 *   2. `enforceRateLimit` — the entry point the routes use. When `REDIS_URL` is
 *      configured it counts in Redis with a single atomic Lua script, so the
 *      budget is shared across instances; on any Redis error it falls back to
 *      layer 1 for the duration of a short circuit-breaker window. Redis is
 *      therefore an accelerator, never a hard dependency, and a Redis outage
 *      degrades the limit to per-instance rather than refusing all traffic.
 *
 * The caller identity always comes from `resolveClientIp`, which only trusts
 * `x-forwarded-for` / `x-real-ip` behind an explicitly configured proxy
 * (see client-ip.ts). When the headers are not trustworthy every caller shares
 * one bucket per route key, which cannot be escaped by rotating a header.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Hard ceiling on in-process buckets. Without it, a flood from many distinct
 * addresses grows the map faster than stale entries are re-read and evicted.
 * 10k keys is a few hundred kB, which is cheap insurance on a long-lived
 * process.
 */
export const RATE_LIMIT_MAX_BUCKETS = 10_000;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** True when the caller's address is known (see client-ip.ts). */
  trustedIp: boolean;
  /** Seconds until the current window resets. */
  retryAfter: number;
}

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
  key?: string;
  /**
   * Extra bucket discriminator, for limits that must apply even when the
   * caller's address is unknown.
   *
   * The IP half of the bucket key collapses every untrusted caller into one
   * shared entry (see lib/client-ip.ts: a directly-exposed app must not trust
   * `x-forwarded-for`). That is the safe direction for most endpoints, but it
   * makes a plain per-IP limit useless in a production deployment that has no
   * `TRUST_PROXY_HEADERS` configured — the Nth request from *anyone* trips it.
   *
   * Passing an identifier the caller supplied (an email, a submitted slug)
   * gives a second, always-available axis: one shared bucket stops nobody, but
   * "5 quote requests per email address" holds regardless of who is asking.
   */
  identifier?: string;
}

/**
 * The single source of truth for what a limit counts against. Both layers key
 * on this, so switching between them never changes the identity being measured.
 */
function bucketKeyFor(
  ip: string,
  trusted: boolean,
  { key = "global", identifier }: RateLimitOptions,
): string {
  // The untrusted half is still the shared bucket; the identifier keeps the
  // limit meaningful without ever trusting client input.
  const discriminator = identifier
    ? `:${identifier.trim().toLowerCase().slice(0, 254)}`
    : "";
  return `${key}${discriminator}:${trusted ? ip : "unidentified"}`;
}

/** Evict stale buckets when the map is at capacity, then the oldest ones. */
function boundBuckets(now: number): void {
  if (buckets.size < RATE_LIMIT_MAX_BUCKETS) return;
  for (const [bucketKey, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(bucketKey);
  }
  if (buckets.size < RATE_LIMIT_MAX_BUCKETS) return;
  // No expired entries to reclaim: drop the shortest-lived 20%, so a burst of
  // one-shot callers cannot pin the map open. Evicting a batch (rather than a
  // single entry) means the sort runs once per 2k inserts, not per insert.
  const target = Math.floor(RATE_LIMIT_MAX_BUCKETS * 0.8);
  const oldestFirst = [...buckets.entries()].sort(
    (a, b) => a[1].resetAt - b[1].resetAt,
  );
  for (let i = 0; i < oldestFirst.length - target; i += 1) {
    buckets.delete(oldestFirst[i][0]);
  }
}

/**
 * In-process fixed-window counter. Synchronous by design — it never touches the
 * network, and it is what runs when there is no shared store.
 */
export function rateLimit(
  request: Request,
  {
    limit = 10,
    windowMs = 60_000,
    key = "global",
    identifier,
  }: RateLimitOptions = {},
): RateLimitResult {
  const { ip, trusted } = resolveClientIp(request);
  const bucketKey = bucketKeyFor(ip, trusted, { key, identifier });
  const now = Date.now();
  boundBuckets(now);

  const entry = buckets.get(bucketKey);
  if (!entry || entry.resetAt < now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, trustedIp: trusted, retryAfter: 0 };
  }

  entry.count += 1;
  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  if (entry.count > limit) {
    return { ok: false, remaining: 0, trustedIp: trusted, retryAfter };
  }
  return { ok: true, remaining: limit - entry.count, trustedIp: trusted, retryAfter };
}

/**
 * Fixed-window counter, evaluated atomically inside Redis.
 *
 * A plain `INCR` + separate `EXPIRE` from the client is two round trips and can
 * leave a key with no TTL if the process dies between them, which would then
 * never expire. Wrapping both in one script makes the pair atomic and guarantees
 * every key carries a TTL, so the keyspace is self-cleaning.
 */
const FIXED_WINDOW_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
`.trim();

function redisTimeoutMs(): number {
  const parsed = Number.parseInt(process.env.REDIS_CMD_TIMEOUT_MS ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1000;
}

function breakerCooldownMs(): number {
  const parsed = Number.parseInt(process.env.RATE_LIMIT_BREAKER_MS ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 30_000;
}

let sharedClientCache: RedisClient | null | undefined;
let sharedDownUntil = 0;

function sharedClient(): RedisClient | null {
  if (sharedClientCache !== undefined) return sharedClientCache;
  const target = parseRedisUrl(process.env.REDIS_URL);
  sharedClientCache = target
    ? new RedisClient({ target, timeoutMs: redisTimeoutMs() })
    : null;
  return sharedClientCache;
}

function openBreaker(error: unknown): void {
  sharedDownUntil = Date.now() + breakerCooldownMs();
  const message = error instanceof Error ? error.message : String(error);
  // One line per outage window, not per request: the breaker suppresses the
  // rest until the cooldown elapses.
  console.error(
    `[rate-limit] shared store unavailable, using in-process fallback: ${message}`,
  );
}

/**
 * Rate-limit `request`, preferring the shared store.
 *
 * Never throws: a Redis problem is logged once and the in-process limiter
 * answers instead. That is a deliberate fail-soft — turning a Redis outage into
 * a blanket 429 would let a non-security service outage take the site down.
 */
export async function enforceRateLimit(
  request: Request,
  options: RateLimitOptions = {},
): Promise<RateLimitResult> {
  const client = sharedClient();
  if (client && Date.now() >= sharedDownUntil) {
    const { ip, trusted } = resolveClientIp(request);
    const limit = options.limit ?? 10;
    const windowMs = options.windowMs ?? 60_000;
    const prefix = process.env.RATE_LIMIT_PREFIX ?? "rl:";
    const storeKey = `${prefix}${bucketKeyFor(ip, trusted, options)}`;
    try {
      const reply = await client.eval(FIXED_WINDOW_LUA, [storeKey], [windowMs]);
      if (isRedisError(reply)) throw new Error(reply.error);
      if (!Array.isArray(reply)) throw new Error("Unexpected EVAL reply");
      const count = Number((reply as RedisReply[])[0]);
      const ttl = Number((reply as RedisReply[])[1]);
      if (!Number.isFinite(count)) throw new Error("Unexpected EVAL counter");
      return {
        ok: count <= limit,
        remaining: Math.max(0, limit - count),
        trustedIp: trusted,
        retryAfter: count > limit ? Math.max(1, Math.ceil(ttl / 1000)) : 0,
      };
    } catch (error) {
      openBreaker(error);
    }
  }
  return rateLimit(request, options);
}

/** Drop every in-process bucket. Tests only — never called in request handling. */
export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * Forget the cached shared client and close the breaker. Tests only; production
 * reads `REDIS_URL` once.
 */
export function resetSharedRateLimitState(): void {
  sharedClientCache?.close();
  sharedClientCache = undefined;
  sharedDownUntil = 0;
}

/** Number of in-process buckets currently held. Tests only. */
export function rateLimitBucketCount(): number {
  return buckets.size;
}
