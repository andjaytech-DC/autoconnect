import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { inFlightGetCount, nest } from "../app/lib/nest";

/**
 * The NestJS backend's global ThrottlerGuard allows 600 req/min (~10/s) and the
 * frontend fans out ~8 calls per page load with no sharing, so the 429 spam was
 * the frontend's own fan-out, not an attack.
 *
 * `nest()` now coalesces identical GETs that are in flight at the same time:
 * one backend request is issued and every caller awaits the same promise. The
 * entry is dropped as soon as it settles, so this is not a cache and never
 * serves a stale body.
 */

/** Path handed to `nest()`, which prefixes the configured API base. */
const PROBE_PATH = "/coalesce-probe";

/** Track how many real fetches escape, by stubbing globalThis.fetch. */
let fetches = 0;
/** Every pending response resolver; released together. */
let pending: Array<() => void> = [];
const realFetch = globalThis.fetch;

beforeEach(() => {
  fetches = 0;
  pending = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    fetches += 1;
    if (!String(input).includes(PROBE_PATH)) return realFetch(input as never);
    // Hold the response open until released, so overlap is deterministic.
    await new Promise<void>((resolve) => {
      pending.push(resolve);
    });
    return new Response(JSON.stringify({ success: true, data: { ok: true } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
});

/** Let every in-flight stub response complete. */
function release(): void {
  const resolvers = pending;
  pending = [];
  for (const resolve of resolvers) resolve();
}

test("identical concurrent GETs issue one backend request", async () => {
  const a = nest(PROBE_PATH, { query: { limit: 6, status: "AVAILABLE" } });
  const b = nest(PROBE_PATH, { query: { limit: 6, status: "AVAILABLE" } });
  const c = nest(PROBE_PATH, { query: { limit: 6, status: "AVAILABLE" } });

  // Let the microtasks run so the first call reaches fetch and registers.
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(fetches, 1, "three identical GETs must share one request");
  assert.equal(inFlightGetCount(), 1, "one entry is in flight");

  release();
  const [ra, rb, rc] = await Promise.all([a, b, c]);
  assert.deepEqual(ra, rb);
  assert.deepEqual(rb, rc);
  assert.equal(fetches, 1, "still one request after they all resolved");
  assert.equal(inFlightGetCount(), 0, "the entry is dropped once settled");
});

test("different queries are not shared", async () => {
  const a = nest(PROBE_PATH, { query: { limit: 6 } });
  const b = nest(PROBE_PATH, { query: { limit: 4 } });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(fetches, 2, "different filters are different requests");
  release();
  await Promise.all([a, b]);
});

test("a shared request is not reused after it settles", async () => {
  const first = nest(PROBE_PATH);
  release();
  await first;
  assert.equal(inFlightGetCount(), 0);

  const second = nest(PROBE_PATH);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(fetches, 2, "a settled request is not served from memory");
  release();
  await second;
});

test("a token changes the identity, so private reads are never shared", async () => {
  const anon = nest(PROBE_PATH);
  const authed = nest(PROBE_PATH, { token: "user-a-token" });
  const other = nest(PROBE_PATH, { token: "user-b-token" });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(fetches, 3, "each session gets its own request");
  release();
  await Promise.all([anon, authed, other]);
});

test("writes are never coalesced", async () => {
  const a = nest(PROBE_PATH, { method: "POST", body: { x: 1 } });
  const b = nest(PROBE_PATH, { method: "POST", body: { x: 1 } });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(fetches, 2, "two POSTs must both reach the backend");
  release();
  await Promise.all([a, b]);
});

test("a rejected shared request is not stuck in the map", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ message: "nope" }), {
      status: 429,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  await assert.rejects(() => nest(PROBE_PATH), /rate limited/i);
  assert.equal(inFlightGetCount(), 0, "a failed request must not be cached");
});

test.after(() => {
  globalThis.fetch = realFetch;
});
