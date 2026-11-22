import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { resetRateLimits } from "../app/lib/rate-limit";
import { GET as carCheckGET } from "../app/api/car-check/route";
import { GET as challanGET } from "../app/api/challan/route";
import { GET as historyGET, POST as historyPOST } from "../app/api/vehicle-history/route";

/** Sample-data routes: honest "not available" stubs, plus the NestJS-backed vehicle history. */

const u = (id: string, role: SessionUser["role"], token?: string): SessionUser => ({
  id, username: role, email: `${role}@x.test`, name: role, role, ...(token ? { token } : {}),
});
const ADMIN = u("1", "ADMIN", "admin-token");
const CUSTOMER = u("7", "CUSTOMER", "cust-token");
const NO_TOKEN_ADMIN = u("2", "ADMIN");

interface Call { method: string; path: string; search: string; auth: string | null; body: unknown }
type Out = { status?: number; data?: unknown; message?: string } | "down";
const realFetch = globalThis.fetch;
let calls: Call[] = [];

function fakeBackend(r: (c: Call) => Out): void {
  calls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const call: Call = {
      method: init?.method ?? "GET",
      path: url.pathname.replace(/^\/api/, ""),
      search: url.search,
      auth: new Headers(init?.headers).get("authorization"),
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);
    const out = r(call);
    if (out === "down") throw new TypeError("fetch failed");
    const status = out.status ?? 200;
    return new Response(
      JSON.stringify(status >= 400 ? { message: out.message ?? "error" } : { success: true, data: out.data }),
      { status, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
}
beforeEach(() => resetRateLimits());
afterEach(() => { globalThis.fetch = realFetch; });

async function send(
  handler: (r: Request) => Promise<Response>,
  who: SessionUser | undefined,
  init: { method?: string; body?: unknown; url?: string } = {},
): Promise<Response> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (who) headers.cookie = `${SESSION_COOKIE}=${await signSession(who)}`;
  return handler(new Request(init.url ?? "https://example.test/api/x", {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
  }));
}
const withId = (h: (r: Request, c: { params: Promise<{ id: string }> }) => Promise<Response>, id: string) =>
  (r: Request) => h(r, { params: Promise.resolve({ id }) });


const rcUrl = (path: string, rc: string) => `https://example.test/api/${path}?rc=${encodeURIComponent(rc)}`;
const CHECK = { checkType: "OWNERSHIP", status: "PENDING" };

for (const [name, handler, source] of [
  ["car-check", carCheckGET, "not_found"],
  ["challan", challanGET, "coming_soon"],
] as const) {
  test(`${name}: normalises the plate, never fabricates a result, never calls the backend`, async () => {
    fakeBackend(() => ({ data: {} }));
    const res = await send(handler, undefined, { url: rcUrl(name, "mh 12-ab 1234") });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      found: false,
      source,
      rc: "MH12AB1234",
      message: (await send(handler, undefined, { url: rcUrl(name, "MH12AB1234") }).then((r) => r.json())).message,
    });
    assert.equal(calls.length, 0);
  });

  test(`${name}: rejects missing or malformed plates and rate-limits`, async () => {
    for (const bad of ["", "12345", "../../admin", "MH12AB12345678901"]) {
      assert.equal((await send(handler, undefined, { url: rcUrl(name, bad) })).status, 400, bad);
    }
    resetRateLimits();
    for (let i = 0; i < 30; i++) await send(handler, undefined, { url: rcUrl(name, "MH12AB1234") });
    assert.equal((await send(handler, undefined, { url: rcUrl(name, "MH12AB1234") })).status, 429);
  });
}

test("vehicle-history GET: validates the id, maps public fields, drops anything internal", async () => {
  fakeBackend(() => ({
    data: {
      vehicleId: 5,
      checks: [{ id: 1, checkType: "OWNERSHIP", status: "VERIFIED", source: "VAHAN", checkedAt: "2026-01-01", notes: "internal", createdById: 9 }],
    },
  }));
  for (const bad of ["abc", "-1", "1/../2", ""]) {
    assert.equal((await send(historyGET, undefined, { url: `https://example.test/api/vehicle-history?vehicleId=${bad}` })).status, 400, bad);
  }
  assert.equal(calls.length, 0);

  const res = await send(historyGET, undefined, { url: "https://example.test/api/vehicle-history?vehicleId=5" });
  const body = await res.json();
  assert.equal(calls[0].path, "/vehicle-history/vehicle/5");
  assert.equal(calls[0].auth, null);
  assert.equal(body.checks.length, 1);
  assert.equal(body.checks[0].pendingChallanCount, null);
  assert.ok(!("notes" in body.checks[0]) && !("createdById" in body.checks[0]));
});

test("vehicle-history GET: 404 passes through, outage is 503", async () => {
  fakeBackend(() => ({ status: 404, message: "Vehicle not found." }));
  assert.equal((await send(historyGET, undefined, { url: "https://example.test/api/vehicle-history?vehicleId=5" })).status, 404);
  fakeBackend(() => "down");
  assert.equal((await send(historyGET, undefined, { url: "https://example.test/api/vehicle-history?vehicleId=5" })).status, 503);
});

test("vehicle-history POST: only ADMIN/DEALER with a token; validated; forwarded with their token", async () => {
  fakeBackend(() => ({ data: { id: 1 } }));
  const url = "https://example.test/api/vehicle-history?vehicleId=5";
  assert.equal((await send(historyPOST, undefined, { method: "POST", url, body: CHECK })).status, 401);
  assert.equal((await send(historyPOST, CUSTOMER, { method: "POST", url, body: CHECK })).status, 403);
  assert.equal((await send(historyPOST, NO_TOKEN_ADMIN, { method: "POST", url, body: CHECK })).status, 401);
  assert.equal((await send(historyPOST, ADMIN, { method: "POST", url, body: { ...CHECK, status: "GREAT" } })).status, 400);
  assert.equal((await send(historyPOST, ADMIN, { method: "POST", url, body: "{nope" })).status, 400);
  assert.equal((await send(historyPOST, ADMIN, { method: "POST", url: "https://example.test/api/vehicle-history", body: CHECK })).status, 400);
  assert.equal(calls.length, 0);

  const ok = await send(historyPOST, ADMIN, { method: "POST", url, body: CHECK });
  assert.equal(ok.status, 201);
  assert.equal(calls[0].path, "/vehicle-history");
  assert.equal(calls[0].auth, "Bearer admin-token");
  assert.deepEqual(calls[0].body, { vehicleId: 5, ...CHECK });
});

test("vehicle-history POST: NestJS refusals (ownership 403, manual-VERIFIED 400) reach the caller", async () => {
  const dealer = u("3", "DEALER", "dealer-token");
  const url = "https://example.test/api/vehicle-history?vehicleId=5";
  fakeBackend(() => ({ status: 403, message: "You can only manage history for your own inventory." }));
  assert.equal((await send(historyPOST, dealer, { method: "POST", url, body: CHECK })).status, 403);
  fakeBackend(() => ({ status: 400, message: "A manually entered check cannot be marked VERIFIED." }));
  assert.equal((await send(historyPOST, dealer, { method: "POST", url, body: CHECK })).status, 400);
  fakeBackend(() => "down");
  assert.equal((await send(historyPOST, dealer, { method: "POST", url, body: CHECK })).status, 503);
});
