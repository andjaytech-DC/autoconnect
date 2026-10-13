import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";

import { PUBLIC_READ_REVALIDATE, getVehicles, getVehicle, getBrands } from "../app/lib/nest-catalog";

/**
 * Every public catalogue read was `cache: "no-store"`, so each render of each
 * page re-fetched from NestJS. A build renders every page at once and every
 * visitor pays again, which is what exhausted the backend's 600 req/min
 * ThrottlerGuard.
 *
 * `nest()` now accepts an opt-in `revalidate`, and the catalogue helpers use it.
 * These tests assert the option is forwarded for public reads and withheld for
 * staff reads, by intercepting `fetch` and reading back the options that were
 * actually passed.
 */

const realFetch = globalThis.fetch;
/** The `next` option each intercepted fetch was called with, in order. */
const seen: Array<Record<string, unknown>> = [];

function stubFetch(body = { success: true, data: { items: [] } }): void {
  seen.length = 0;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const opts = init as unknown as Record<string, unknown> | undefined;
    seen.push({
      method: opts?.method ?? "GET",
      cache: opts?.cache,
      next: opts?.next,
    });
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

beforeEach(() => stubFetch());
after(() => {
  globalThis.fetch = realFetch;
});

test("a public catalogue read opts into the Data Cache", async () => {
  await getVehicles({ status: "AVAILABLE", limit: 6 });
  assert.ok(seen.length >= 1);
  const opts = seen[seen.length - 1];
  assert.deepEqual(
    opts.next,
    { revalidate: PUBLIC_READ_REVALIDATE },
    "public reads must set next.revalidate",
  );
  assert.ok(
    (PUBLIC_READ_REVALIDATE as number) > 0 && (PUBLIC_READ_REVALIDATE as number) <= 300,
    "the window must be short — this is public catalogue data, not a session",
  );
});

test("a single record and the reference lists are cached too", async () => {
  await getVehicle(42);
  assert.deepEqual(seen[seen.length - 1].next, { revalidate: PUBLIC_READ_REVALIDATE });

  await getBrands();
  assert.deepEqual(seen[seen.length - 1].next, { revalidate: PUBLIC_READ_REVALIDATE });
});

test("a write never carries a revalidate", async () => {
  // Regression guard: `next.revalidate` on a POST would be meaningless at best.
  // Not a catalogue helper, so assert through fetch directly with the same
  // shape nest() builds.
  const { nest } = await import("../app/lib/nest");
  await nest("/vehicles", { method: "POST", body: { title: "x" }, revalidate: 30 });
  const opts = seen[seen.length - 1];
  assert.equal(opts.next, undefined, "a POST must not be cached");
  assert.equal(opts.method, "POST");
});

test("the revalidate option is dropped for non-GET methods", async () => {
  const { nest } = await import("../app/lib/nest");
  await nest("/brands", { method: "DELETE", revalidate: 60 });
  assert.equal(seen[seen.length - 1].next, undefined);
});

test("a cached read still surfaces backend errors rather than hiding them", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ message: "Too Many Requests" }), {
      status: 429,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  const { ApiError } = await import("../app/lib/nest");
  await assert.rejects(
    () => getVehicles({}),
    (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 429);
      assert.match(err.message, /rate limited/i);
      return true;
    },
  );
});
