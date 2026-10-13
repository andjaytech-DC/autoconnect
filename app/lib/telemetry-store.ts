/**
 * Bounded in-memory error counters for the client-side failure beacon.
 *
 * The previous version keyed a plain object on `route|status|message`, where
 * every component was attacker-supplied. Each distinct message added a new
 * entry with no cap, no expiry and no rate limit, so an unauthenticated client
 * could grow the process heap without bound.
 *
 * Two changes close that off:
 *   - the aggregation key is restricted to `route|status|code`, so the key
 *     space is small and the message is stored once per key as a sample;
 *   - entries are capped and expire, and insertion beyond the cap evicts the
 *     oldest row.
 */

/** Hard cap on distinct aggregation keys. */
export const MAX_ENTRIES = 200;

/** Age after which an entry is dropped on the next sweep. */
export const TTL_MS = 60 * 60 * 1000; // 1 hour

/** Longest key component retained after aggregation. */
export const MAX_KEY_SEGMENT = 200;

export interface TelemetryEntry {
  count: number;
  /** First message seen for this key, truncated. */
  message: string;
  firstSeen: number;
  lastSeen: number;
}

export interface TelemetryStore {
  entries: Map<string, TelemetryEntry>;
  /** Total events recorded, including those dropped for a full store. */
  recorded: number;
  /** Total events discarded because the store was at capacity. */
  dropped: number;
}

export function createStore(): TelemetryStore {
  return { entries: new Map(), recorded: 0, dropped: 0 };
}

const store: TelemetryStore = createStore();

/**
 * True when a `route` label is a plain path/route name. Rejects anything with
 * whitespace, control characters or delimiters so a hostile value cannot
 * manufacture unbounded distinct keys.
 */
const KEY_SEGMENT = /^[A-Za-z0-9/_.:-]+$/;

export function isSafeKeySegment(value: string): boolean {
  return value.length > 0 && value.length <= MAX_KEY_SEGMENT && KEY_SEGMENT.test(value);
}

/** Drop expired entries. Runs on every record and every read. */
export function sweep(now: number = Date.now()): number {
  let removed = 0;
  for (const [key, entry] of store.entries) {
    if (now - entry.lastSeen > TTL_MS) {
      store.entries.delete(key);
      removed += 1;
    }
  }
  return removed;
}

export interface RecordInput {
  route: string;
  status?: number | null;
  code?: string | null;
  message?: string;
}

export interface RecordOutcome {
  key: string;
  /** Running count for `key` after this event. */
  count: number;
}

/**
 * Record one event. Returns the aggregation key and its running count, or
 * `null` when the input was rejected as malformed.
 */
export function recordError(
  input: RecordInput,
  now: number = Date.now(),
): RecordOutcome | null {
  const route = input.route ?? "";
  if (!isSafeKeySegment(route)) return null;

  const status =
    input.status === undefined || input.status === null ? "" : String(input.status);
  if (status !== "" && !/^\d{3}$/.test(status)) return null;

  const code = input.code ?? "";
  if (code !== "" && !/^[A-Za-z0-9_-]{1,50}$/.test(code)) return null;

  sweep(now);

  const key = `${route}|${status}|${code}`;
  const existing = store.entries.get(key);
  if (existing) {
    existing.count += 1;
    existing.lastSeen = now;
    store.recorded += 1;
    return { key, count: existing.count };
  }

  if (store.entries.size >= MAX_ENTRIES) {
    // Evict the least recently written entry rather than growing the map.
    let oldestKey: string | null = null;
    let oldestSeen = Number.POSITIVE_INFINITY;
    for (const [candidate, entry] of store.entries) {
      if (entry.lastSeen < oldestSeen) {
        oldestSeen = entry.lastSeen;
        oldestKey = candidate;
      }
    }
    if (oldestKey !== null) store.entries.delete(oldestKey);
    store.dropped += 1;
  }

  store.entries.set(key, {
    count: 1,
    message: (input.message ?? "").slice(0, MAX_KEY_SEGMENT),
    firstSeen: now,
    lastSeen: now,
  });
  store.recorded += 1;
  return { key, count: 1 };
}

export interface TelemetrySnapshot {
  errors: Array<{ key: string; count: number; message: string; lastSeen: number }>;
  recorded: number;
  dropped: number;
}

export function snapshot(now: number = Date.now()): TelemetrySnapshot {
  sweep(now);
  const errors = [...store.entries.entries()]
    .sort((a, b) => b[1].lastSeen - a[1].lastSeen)
    .map(([key, entry]) => ({
      key,
      count: entry.count,
      message: entry.message,
      lastSeen: entry.lastSeen,
    }));
  return { errors, recorded: store.recorded, dropped: store.dropped };
}

/** Test-only reset. */
export function resetTelemetryStore(): void {
  store.entries.clear();
  store.recorded = 0;
  store.dropped = 0;
}
