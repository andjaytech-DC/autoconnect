import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { resetRateLimits } from "../app/lib/rate-limit";
import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { loadCustomerPortalData } from "../app/server/customer-portal";
import { PATCH as vehiclePATCH } from "../app/api/vehicles/[id]/route";

/**
 * Tenant isolation and customer privacy at the BFF boundary.
 *
 * NestJS owns the data and the ownership rules (covered by its own specs:
 * test-drives, leads, finance, vehicles.access). What belongs here is the
 * contract this app must keep:
 *
 *   1. the customer portal identifies the caller ONLY by the bearer token — it
 *      sends no user id, email or filter a client could vary;
 *   2. with no token it shows nothing, never everything;
 *   3. a failing section is reported, not rendered as an empty account;
 *   4. inventory writes are refused at the edge before NestJS is asked.
 *
 * No database is touched: NestJS is replaced by a fake `fetch`.
 */

interface Call { method: string; path: string; search: string; auth: string | null }
type Out = { status?: number; data?: unknown } | "down";
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
    };
    calls.push(call);
    const out = r(call);
    if (out === "down") throw new TypeError("fetch failed");
    const status = out.status ?? 200;
    return new Response(
      JSON.stringify(status >= 400 ? { message: "error" } : { success: true, data: out.data }),
      { status, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
}

beforeEach(() => resetRateLimits());
afterEach(() => { globalThis.fetch = realFetch; });

const DRIVE = {
  id: 1, vehicleId: 5, preferredDate: "2026-11-01T10:00:00.000Z", preferredTime: "10:00 AM",
  vehicle: { id: 5, title: "Nexon" },
};
const LEAD = { id: 2, vehicleId: 5, status: "NEW", message: "Is it available?", createdAt: "2026-10-01T00:00:00.000Z" };

const portalBackend = (c: Call): Out =>
  c.path === "/test-drives/mine" ? { data: [DRIVE] }
  : c.path === "/finance/applications/count" ? { data: { count: 2 } }
  : c.path === "/leads/mine" ? { data: [LEAD] }
  : { status: 404 };

test("the customer portal reads only the caller's own collections, identified by the token alone", async () => {
  fakeBackend(portalBackend);
  const data = await loadCustomerPortalData({ token: "cust-token" });

  assert.deepEqual(data.testDrives, [DRIVE]);
  assert.equal(data.financeApplicationCount, 2);
  assert.deepEqual(data.leads, [LEAD]);
  assert.equal(data.unavailable, false);

  assert.deepEqual(calls.map((c) => c.path).sort(), [
    "/finance/applications/count",
    "/leads/mine",
    "/test-drives/mine",
  ]);
  for (const c of calls) {
    assert.equal(c.auth, "Bearer cust-token");
    assert.equal(c.search, "", "no id, email or filter is sent for NestJS to trust");
    assert.equal(c.method, "GET");
  }
});

test("a portal session with no backend token sees nothing, not everything, and asks nothing", async () => {
  fakeBackend(portalBackend);
  const data = await loadCustomerPortalData({ token: undefined });
  assert.deepEqual(data.testDrives, []);
  assert.deepEqual(data.leads, []);
  assert.equal(data.financeApplicationCount, 0);
  assert.equal(data.unavailable, true);
  assert.equal(calls.length, 0);
});

test("one failing section is reported without losing the others", async () => {
  fakeBackend((c) => (c.path === "/leads/mine" ? { status: 500 } : portalBackend(c)));
  const data = await loadCustomerPortalData({ token: "cust-token" });
  assert.equal(data.testDrives.length, 1);
  assert.equal(data.financeApplicationCount, 2);
  assert.deepEqual(data.leads, []);
  assert.equal(data.unavailable, true);

  fakeBackend(() => "down");
  const down = await loadCustomerPortalData({ token: "cust-token" });
  assert.deepEqual(down.testDrives, []);
  assert.equal(down.unavailable, true);
});

// TestDrive ownership (linked from the verified token, guests stay anonymous, a
// body userId is ignored) is asserted in the NestJS test-drives.service.spec.ts.

const customer: SessionUser = {
  id: "9100001", username: "tenant-x", email: "tenant-x@example.test", name: "Tenant X", role: "CUSTOMER", token: "t",
};

test("PATCH /api/vehicles/[id] refuses anonymous and customer callers at the edge", async () => {
  fakeBackend(() => ({ data: {} }));
  const ctx = { params: Promise.resolve({ id: "1" }) };

  const anonRes = await vehiclePATCH(
    new Request("https://example.test/api/vehicles/1", { method: "PATCH", body: "{}", headers: { "content-type": "application/json" } }),
    ctx,
  );
  assert.equal(anonRes.status, 401, "anonymous → 401");

  const customerRes = await vehiclePATCH(
    new Request("https://example.test/api/vehicles/1", {
      method: "PATCH",
      body: "{}",
      headers: { "content-type": "application/json", cookie: `${SESSION_COOKIE}=${await signSession(customer)}` },
    }),
    ctx,
  );
  assert.equal(customerRes.status, 403, "a customer may never patch inventory");
  assert.equal(calls.length, 0, "neither reached NestJS");
});

// Dealer ownership, dealerId re-scoping and isFeatured are enforced by NestJS
// (VehiclesService.create/update) and covered by vehicles.access.spec.ts in the
// backend; the BFF contract is covered by vehicles-routes.test.ts.
