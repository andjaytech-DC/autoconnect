# Rate limiting — operation notes

The rate limiter (`app/lib/rate-limit.ts`) is two layers:

1. **In-process** (`rateLimit`) — a fixed-window counter living in the Node
   process. Always available, synchronous, zero configuration. It protects a
   single instance.
2. **Shared** (`enforceRateLimit`) — what the API routes call. When a Redis
   endpoint is configured it counts in Redis with one atomic Lua script, so
   every app instance shares the same budget. When Redis is absent or failing
   it silently falls back to layer 1.

Redis is **optional**. Nothing in the app requires it to boot, and no route
fails because it is down.

## Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `REDIS_URL` | *(unset)* | `redis://` or `rediss://` endpoint. Unset (or empty/malformed) → shared limiting is disabled and the in-process limiter is used. |
| `RATE_LIMIT_PREFIX` | `rl:` | Keyspace prefix for all shared counters. Set a distinct value per environment so a shared Redis never mixes staging with production budgets. |
| `REDIS_CMD_TIMEOUT_MS` | `1000` | Per-command socket timeout. A command that exceeds it counts as a Redis failure (fallback + breaker). |
| `RATE_LIMIT_BREAKER_MS` | `30000` | After a Redis failure the shared store is skipped for this long. Prevents a slow/hung Redis from adding latency to every request. |
| `TRUST_PROXY_HEADERS` | unset → dev on / prod off | Whether `x-forwarded-for` / `x-real-ip` are trusted to identify a caller (see `app/lib/client-ip.ts`). This controls rate-limit bucket identity. |

### Example configurations

```bash
# Single instance, no Redis — nothing to do, the in-process limiter runs.
# (default)

# Distributed deployment, self-hosted Redis on the same network
REDIS_URL=redis://redis.internal:6379/0
RATE_LIMIT_PREFIX=autoconnect-prod:

# Managed Redis over TLS (Upstash, ElastiCache in-transit encryption, …)
REDIS_URL=rediss://default:SECRET@eu-central-1…upstash.io:6379
RATE_LIMIT_PREFIX=autoconnect-prod:

# Any of these requires the proxy header trust flag in front of a load balancer,
# otherwise every caller shares one bucket by design (see client-ip.ts)
TRUST_PROXY_HEADERS=true
TRUSTED_PROXIES=10.0.0.0/8
```

### Deploy steps

1. Provision a Redis instance (self-hosted, ElastiCache, Upstash, MemoryDB,
   …). A single node is enough; the limiter uses one `EVAL` per request, so an
   average replica pays for itself at roughly the same cost as API traffic.
2. Set `REDIS_URL` (and `RATE_LIMIT_PREFIX`) in the app environment, before
   first deploy if possible; budgets only count from when the variable is set.
3. Apply the same configuration to every instance — that is the point: each one
   enforces the *shared* budget.
4. No code change, no restart beyond the normal deploy.

### Cost

- One TCP connection per app instance (kept open), not one per request.
- One `EVAL` round-trip per limited request (~sub-millisecond on a same-VPC
  Redis).
- Writes are TTL-bound: each new key gets `PEXPIRE windowMs`, so storage stays
  proportional to distinct callers in the current window, not total callers.
- The in-process fallback store is capped at 10 000 buckets.

### Outage behaviour

- **Redis down / unreachable:** the failing command is logged once and the
  breaker skips Redis for `RATE_LIMIT_BREAKER_MS`; every request is answered by
  the in-process limiter during that window. Limits degrade to per-instance,
  they do not disappear or block everyone. This is deliberate fail-soft: a
  Redis outage should not become a site-wide denial of service.
- **Redis slow (latency > `REDIS_CMD_TIMEOUT_MS`):** same as above — treated as
  down, breaker engages.
- **Redis recovers:** the next request after the cooldown tries the shared
  store again; the breaker re-opens only on another failure.

### Security notes

- Keys are namespaced (`RATE_LIMIT_PREFIX`) and include both the route key and,
  when trusted, the caller address. Identifiers from the request (emails,
  phones) are normalised and truncated to 254 chars before use.
- If the deployment is directly exposed (no trusted proxy), every caller shares
  one bucket per route by design — see `app/lib/client-ip.ts` for why trusting
  `x-forwarded-for` unconditionally would be worse. Endpoints that must be
  bounded even then use an `identifier` axis (e.g. one finance application per
  phone number).