/**
 * Failed-attempt throttling for credential login.
 *
 * `POST /api/auth/login` had no throttling of any kind — every other public
 * POST route in this app is rate limited, but the one endpoint that accepts a
 * password accepted an unlimited number of guesses. That is the single largest
 * exposure in the app: an attacker can work through a password list against a
 * known username at whatever speed the network allows.
 *
 * Two separate counters, because they stop different attacks:
 *
 *   per account — a targeted brute force against one username. This is the
 *     one that matters, and it is always on: it needs no trusted client
 *     address, so it works identically whether or not a proxy is in front.
 *
 *   per caller — credential stuffing, where an attacker tries one known
 *     password against many usernames. Only tracked when the caller's address
 *     is trustworthy (see lib/client-ip.ts). Collapsing every untrusted caller
 *     into a single bucket would let one shared NAT lock out an entire office,
 *     which trades a real attack for a self-inflicted outage.
 *
 * The generic limiter in lib/rate-limit.ts cannot express this: it counts every
 * request, while login must count only *failures* — otherwise five successful
 * sign-ins would lock a legitimate user out.
 */

/** Failed sign-ins allowed per account within the window. */
export const MAX_ATTEMPTS_PER_ACCOUNT = 5;

/** Failed sign-ins allowed per caller within the window. */
export const MAX_ATTEMPTS_PER_IP = 20;

/** How long a counter survives, and therefore how long a lockout lasts. */
export const WINDOW_MS = 15 * 60 * 1000;

interface AttemptLog {
  count: number;
  resetAt: number;
}

/** Account-keyed failure counts, keyed by lowercased username. */
const accountFailures = new Map<string, AttemptLog>();

/** Caller-keyed failure counts, keyed by resolved client IP. */
const ipFailures = new Map<string, AttemptLog>();

/**
 * Normalise an identifier so `Bobby`, `bobby ` and `BOBBY` cannot be used to
 * mint a fresh budget each.
 */
function normalize(value: string): string {
  return value.trim().toLowerCase().slice(0, 254);
}

function bucket(map: Map<string, AttemptLog>, key: string): AttemptLog {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || entry.resetAt <= now) {
    const fresh: AttemptLog = { count: 0, resetAt: now + WINDOW_MS };
    map.set(key, fresh);
    return fresh;
  }
  return entry;
}

function expire(map: Map<string, AttemptLog>, now: number): void {
  for (const [key, entry] of map) {
    if (entry.resetAt <= now) map.delete(key);
  }
}

export interface ThrottleCheck {
  allowed: boolean;
  /** Seconds until the caller may try again; 0 when not blocked. */
  retryAfter: number;
  /** Which counter blocked, for the log line. */
  scope: "account" | "ip" | null;
}

/**
 * Whether another attempt may be made. Read-only — recording a failure happens
 * in `recordFailure`, so an attempt that never ran (invalid JSON, validation
 * error) cannot exhaust the budget.
 */
export function checkLoginAllowed(
  username: string,
  clientIp: string,
): ThrottleCheck {
  const now = Date.now();
  expire(accountFailures, now);
  expire(ipFailures, now);

  // An untrusted address is never used as an IP bucket key: see the note about
  // shared NATs above.
  if (clientIp && clientIp !== "unidentified") {
    const ipEntry = bucket(ipFailures, clientIp);
    if (ipEntry.count >= MAX_ATTEMPTS_PER_IP) {
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((ipEntry.resetAt - now) / 1000)),
        scope: "ip",
      };
    }
  }

  const accountEntry = bucket(accountFailures, normalize(username));
  if (accountEntry.count >= MAX_ATTEMPTS_PER_ACCOUNT) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((accountEntry.resetAt - now) / 1000)),
      scope: "account",
    };
  }

  return { allowed: true, retryAfter: 0, scope: null };
}

/**
 * Record a failed attempt. Both counters are incremented even when one is
 * already over budget, so a burst is still attributed once the window rolls.
 */
export function recordLoginFailure(username: string, clientIp: string): void {
  const now = Date.now();
  expire(accountFailures, now);
  expire(ipFailures, now);

  const account = bucket(accountFailures, normalize(username));
  account.count += 1;

  if (clientIp && clientIp !== "unidentified") {
    const ip = bucket(ipFailures, clientIp);
    ip.count += 1;
  }
}

/**
 * Clear the counters for a successful sign-in, so ordinary use never
 * accumulates toward a lockout.
 */
export function clearLoginFailures(username: string, clientIp: string): void {
  accountFailures.delete(normalize(username));
  if (clientIp && clientIp !== "unidentified") ipFailures.delete(clientIp);
}

/** Test-only reset. */
export function resetLoginThrottle(): void {
  accountFailures.clear();
  ipFailures.clear();
}

/** Outstanding counters, for tests and observability. */
export function loginThrottleSize(): { accounts: number; ips: number } {
  return { accounts: accountFailures.size, ips: ipFailures.size };
}
