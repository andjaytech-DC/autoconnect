import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { GET as meGET } from "../app/api/dealer/me/route";
import { GET as statsGET } from "../app/api/dealer/stats/route";
import { GET as vehiclesGET } from "../app/api/dealer/vehicles/route";
import { GET as leadsGET } from "../app/api/dealer/leads/route";
import { GET as testDrivesGET } from "../app/api/dealer/test-drives/route";
import { GET as financeGET } from "../app/api/dealer/finance/route";

/**
 * The dealer dashboard routes hold no data: NestJS resolves the dealership from
 * the token (owner, or active employee) and the BFF only gates roles and reshapes
 * the rows. Finance is owner-only.
 */

const u = (id: string, role: SessionUser["role"], token?: string): SessionUser => ({
  id, username: role, email: `${role}@x.test`, name: role, role, ...(token ? { token } : {}),
});
const OWNER = u("20", "DEALER", "owner-token");
const EMPLOYEE = u("21", "DEALER_EMPLOYEE", "emp-token");
const CUSTOMER = u("7", "CUSTOMER", "cust-token");
const ADMIN = u("1", "ADMIN", "admin-token");
const NO_TOKEN = u("22", "DEALER");

interface Call { path: string; auth: string | null }
type Out = { status?: number; data?: unknown; message?: string } | "down";
const realFetch = globalThis.fetch;
let calls: Call[] = [];

function fakeBackend(r: (c: Call) => Out): void {
  calls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const call: Call = { path: url.pathname.replace(/^\/api/, ""), auth: new Headers(init?.headers).get("authorization") };
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
afterEach(() => { globalThis.fetch = realFetch; });

async function get(handler: (r: Request) => Promise<Response>, who?: SessionUser): Promise<Response> {
  const headers: Record<string, string> = {};
  if (who) headers.cookie = `${SESSION_COOKIE}=${await signSession(who)}`;
  return handler(new Request("https://example.test/api/dealer/x", { headers }));
}

const STAFF_ROUTES: Array<[string, (r: Request) => Promise<Response>, string]> = [
  ["me", (r) => meGET(r), "/dealers/me"],
  ["stats", (r) => statsGET(r), "/dealers/me/stats"],
  ["vehicles", (r) => vehiclesGET(r), "/dealers/me/vehicles"],
  ["leads", (r) => leadsGET(r) as Promise<Response>, "/dealers/me/leads"],
  ["test-drives", (r) => testDrivesGET(r) as Promise<Response>, "/dealers/me/test-drives"],
];

for (const [name, handler, path] of STAFF_ROUTES) {
  test(`dealer/${name}: 401 anonymous, 403 customer/admin, owner and employee reach ${path}`, async () => {
    fakeBackend(() => ({ data: name === "stats" || name === "me" ? { id: 5, businessName: "D" } : [] }));
    assert.equal((await get(handler)).status, 401);
    assert.equal((await get(handler, CUSTOMER)).status, 403);
    assert.equal((await get(handler, ADMIN)).status, 403);
    assert.equal((await get(handler, NO_TOKEN)).status, 401, "a session with no backend token must sign in again");
    assert.equal(calls.length, 0, "nothing reaches NestJS for refused callers");

    assert.equal((await get(handler, OWNER)).status, 200);
    assert.equal((await get(handler, EMPLOYEE)).status, 200);
    assert.deepEqual(calls.map((c) => c.path), [path, path]);
    assert.deepEqual(calls.map((c) => c.auth), ["Bearer owner-token", "Bearer emp-token"]);
  });

  test(`dealer/${name}: backend down is 503, backend refusal passes through`, async () => {
    fakeBackend(() => "down");
    assert.equal((await get(handler, OWNER)).status, 503);
    fakeBackend(() => ({ status: 403, message: "No active employee profile." }));
    const res = await get(handler, EMPLOYEE);
    assert.equal(res.status, 403);
    assert.match((await res.json()).error, /employee profile/);
  });
}

test("dealer/me and dealer/vehicles reshape the backend rows", async () => {
  fakeBackend(() => ({ data: { id: 5, businessName: "D", city: "Pune", state: "MH", status: "APPROVED", phone: "9", ownerName: "Asha", email: "a@x.test" } }));
  assert.deepEqual((await (await get(meGET, OWNER)).json()).dealer, {
    id: 5, businessName: "D", city: "Pune", state: "MH", status: "APPROVED", ownerName: "Asha", email: "a@x.test", phone: "9",
  });

  fakeBackend(() => ({ data: [{ id: 1, title: "Seltos", price: 1, status: "AVAILABLE", listingStatus: "DRAFT", year: 2020, mileage: 1, fuel: "PETROL", transmission: "MANUAL", city: "Pune", isCertified: false, createdAt: "x", images: ["a.jpg"], brand: { name: "Kia" }, category: { name: "SUV" }, _count: { leads: 3, testDrives: 2 } }] }));
  const row = (await (await get(vehiclesGET, OWNER)).json()).vehicles[0];
  assert.equal(row.brand, "Kia");
  assert.equal(row.image, "a.jpg");
  assert.deepEqual(row._count, { leads: 3, testDrives: 2 });
  assert.equal(row.listingStatus, "DRAFT");
});

test("dealer/finance: owner only — employees are refused before NestJS is asked", async () => {
  fakeBackend(() => ({ data: [{ id: 1, panNumber: "XXXXXX234A" }] }));
  assert.equal((await get(financeGET)).status, 401);
  assert.equal((await get(financeGET, EMPLOYEE)).status, 403);
  assert.equal((await get(financeGET, CUSTOMER)).status, 403);
  assert.equal(calls.length, 0);
  const ok = await get(financeGET, OWNER);
  assert.equal(ok.status, 200);
  assert.deepEqual((await ok.json()).applications, [{ id: 1, panNumber: "XXXXXX234A" }]);
  assert.equal(calls[0].path, "/dealers/me/finance");
});

test("dealer/finance: backend down is 503", async () => {
  fakeBackend(() => "down");
  assert.equal((await get(financeGET, OWNER)).status, 503);
});
