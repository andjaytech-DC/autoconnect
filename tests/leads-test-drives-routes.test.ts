import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { resetRateLimits } from "../app/lib/rate-limit";
import { GET as leadsGET, POST as leadsPOST } from "../app/api/leads/route";
import { PATCH as leadPATCH, DELETE as leadDELETE } from "../app/api/leads/[id]/route";
import { GET as driveGET, POST as drivePOST } from "../app/api/test-drives/route";

/** Leads and test drives live in NestJS; the BFF validates, gates roles, forwards. */

const u = (id: string, role: SessionUser["role"], token?: string): SessionUser => ({
  id, username: role, email: `${role}@x.test`, name: role, role, ...(token ? { token } : {}),
});
const ADMIN = u("1", "ADMIN", "admin-token");
const CUSTOMER = u("7", "CUSTOMER", "cust-token");
const DEALER = u("20", "DEALER", "dealer-token");
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
  handler: (r: Request, c?: never) => Promise<Response>,
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

const LEAD = { vehicleId: 4, customerName: "Asha", customerPhone: "9876543210", customerEmail: "", message: "" };
const DRIVE = { vehicleId: 4, customerName: "Asha", customerPhone: "9876543210", preferredDate: "2026-12-01T10:00:00.000Z", preferredTime: "10:00 AM" };

// ── leads ──────────────────────────────────────────────────────────────────

test("POST /api/leads validates, drops empty optionals and forwards without a token", async () => {
  fakeBackend(() => ({ data: { id: 1 } }));
  assert.equal((await send(leadsPOST, undefined, { method: "POST", body: { ...LEAD, customerPhone: "12" } })).status, 400);
  assert.equal((await send(leadsPOST, undefined, { method: "POST", body: "{nope" })).status, 400);
  assert.equal(calls.length, 0);

  const ok = await send(leadsPOST, undefined, { method: "POST", body: LEAD });
  assert.equal(ok.status, 201);
  assert.deepEqual(calls[0].body, { vehicleId: 4, customerName: "Asha", customerPhone: "9876543210" });
  assert.equal(calls[0].auth, null);
});

test("POST /api/leads: unknown vehicle passes through, outage is 503 (no local fallback)", async () => {
  fakeBackend(() => ({ status: 404, message: "Vehicle not found." }));
  assert.equal((await send(leadsPOST, undefined, { method: "POST", body: LEAD })).status, 404);
  fakeBackend(() => "down");
  assert.equal((await send(leadsPOST, undefined, { method: "POST", body: LEAD })).status, 503);
});

test("GET /api/leads: admin only, with the admin's token and the status filter", async () => {
  fakeBackend(() => ({ data: [{ id: 1 }] }));
  assert.equal((await send(leadsGET, undefined)).status, 401);
  assert.equal((await send(leadsGET, CUSTOMER)).status, 403);
  assert.equal((await send(leadsGET, DEALER)).status, 403);
  assert.equal((await send(leadsGET, NO_TOKEN_ADMIN)).status, 401);
  assert.equal(calls.length, 0);

  const res = await send(leadsGET, ADMIN, { url: "https://example.test/api/leads?status=NEW" });
  assert.deepEqual(await res.json(), { leads: [{ id: 1 }], source: "backend" });
  assert.deepEqual([calls[0].path, calls[0].search, calls[0].auth], ["/leads", "?status=NEW", "Bearer admin-token"]);

  fakeBackend(() => "down");
  assert.equal((await send(leadsGET, ADMIN)).status, 503);
});

test("PATCH/DELETE /api/leads/[id]: admin only, id validated, 404 message kept", async () => {
  fakeBackend(() => ({ data: { id: 3 } }));
  assert.equal((await send(withId(leadPATCH, "3"), undefined, { method: "PATCH", body: {} })).status, 401);
  assert.equal((await send(withId(leadPATCH, "3"), DEALER, { method: "PATCH", body: {} })).status, 403);
  assert.equal((await send(withId(leadPATCH, "../x"), ADMIN, { method: "PATCH", body: {} })).status, 400);
  assert.equal((await send(withId(leadPATCH, "3"), ADMIN, { method: "PATCH", body: { status: "WON" } })).status, 400);
  assert.equal(calls.length, 0);

  assert.equal((await send(withId(leadPATCH, "3"), ADMIN, { method: "PATCH", body: { status: "CLOSED", notes: "done" } })).status, 200);
  assert.deepEqual([calls[0].method, calls[0].path, calls[0].auth], ["PATCH", "/leads/3", "Bearer admin-token"]);
  assert.deepEqual(calls[0].body, { status: "CLOSED", notes: "done" });

  assert.equal((await send(withId(leadDELETE, "3"), ADMIN, { method: "DELETE" })).status, 200);
  assert.deepEqual([calls[1].method, calls[1].path], ["DELETE", "/leads/3"]);

  fakeBackend(() => ({ status: 404, message: "Lead not found." }));
  const gone = await send(withId(leadDELETE, "9"), ADMIN, { method: "DELETE" });
  assert.equal(gone.status, 404);
  assert.equal((await gone.json()).error, "Lead not found");
});

// ── test drives ────────────────────────────────────────────────────────────

test("POST /api/test-drives: guest booking sends no token and no owner", async () => {
  fakeBackend(() => ({ data: { id: 1 } }));
  const res = await send(drivePOST, undefined, { method: "POST", body: DRIVE });
  assert.equal(res.status, 201);
  assert.equal(calls[0].auth, null);
  assert.equal("userId" in (calls[0].body as object), false);
});

test("POST /api/test-drives: a signed-in booking forwards the token, never a body userId", async () => {
  fakeBackend(() => ({ data: { id: 1 } }));
  const res = await send(drivePOST, CUSTOMER, { method: "POST", body: { ...DRIVE, userId: 999 } });
  assert.equal(res.status, 201);
  assert.equal(calls[0].auth, "Bearer cust-token");
  assert.deepEqual(Object.keys(calls[0].body as object).sort(), [
    "customerName", "customerPhone", "preferredDate", "preferredTime", "vehicleId",
  ]);
});

test("POST /api/test-drives: validation, refusal pass-through and outage", async () => {
  fakeBackend(() => ({ data: {} }));
  assert.equal((await send(drivePOST, undefined, { method: "POST", body: { ...DRIVE, preferredDate: "garbage!" } })).status, 400);
  assert.equal((await send(drivePOST, undefined, { method: "POST", body: { ...DRIVE, customerPhone: "1" } })).status, 400);
  assert.equal(calls.length, 0);

  fakeBackend(() => ({ status: 404, message: "Vehicle not found." }));
  assert.equal((await send(drivePOST, undefined, { method: "POST", body: DRIVE })).status, 404);
  fakeBackend(() => "down");
  assert.equal((await send(drivePOST, undefined, { method: "POST", body: DRIVE })).status, 503);
});

test("GET /api/test-drives: admin only, token forwarded, failures are visible", async () => {
  fakeBackend(() => ({ data: [{ id: 5 }] }));
  assert.equal((await send(driveGET, undefined)).status, 401);
  assert.equal((await send(driveGET, CUSTOMER)).status, 403);
  assert.equal((await send(driveGET, NO_TOKEN_ADMIN)).status, 401);
  const ok = await send(driveGET, ADMIN);
  assert.deepEqual(await ok.json(), { testDrives: [{ id: 5 }] });
  assert.equal(calls[0].auth, "Bearer admin-token");

  fakeBackend(() => ({ status: 401, message: "Unauthorized" }));
  assert.equal((await send(driveGET, ADMIN)).status, 401, "a rejected token is no longer shown as an empty list");
  fakeBackend(() => "down");
  assert.equal((await send(driveGET, ADMIN)).status, 503);
});
