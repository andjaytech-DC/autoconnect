import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { GET as listGET, POST as createPOST } from "../app/api/vehicles/route";
import { GET as detailGET, PATCH as detailPATCH, DELETE as detailDELETE } from "../app/api/vehicles/[id]/route";

/**
 * Vehicle routes hold no data and make no ownership decisions of their own:
 * NestJS answers every request and enforces dealership ownership from the token.
 * These tests fake the backend and check what is sent, what is refused at the
 * edge, and what happens when the backend is down or says no.
 */

const user = (id: string, role: SessionUser["role"], token?: string): SessionUser => ({
  id, username: role.toLowerCase(), email: `${role}@x.test`, name: role, role, ...(token ? { token } : {}),
});
const CUSTOMER = user("7", "CUSTOMER", "cust-token");
const DEALER = user("20", "DEALER", "dealer-token");
const EMPLOYEE = user("21", "DEALER_EMPLOYEE", "emp-token");
const ADMIN = user("1", "ADMIN", "admin-token");

interface Call { method: string; path: string; auth: string | null; body: Record<string, unknown> }
type Out = { status?: number; data?: unknown; message?: string } | "down";
const realFetch = globalThis.fetch;
let calls: Call[] = [];

function fakeBackend(r: (c: Call) => Out): void {
  calls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const call: Call = {
      method: init?.method ?? "GET",
      path: url.pathname.replace(/^\/api/, "") + url.search,
      auth: new Headers(init?.headers).get("authorization"),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
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

async function req(method: string, path: string, u?: SessionUser, body?: unknown): Promise<Request> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (u) headers.cookie = `${SESSION_COOKIE}=${await signSession(u)}`;
  return new Request(`https://example.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

afterEach(() => { globalThis.fetch = realFetch; });
beforeEach(() => { calls = []; });

const LIST = { items: [{ id: 1, title: "Seltos", price: 1, year: 2020, mileage: 1, fuel: "PETROL", transmission: "MANUAL", color: "r", images: ["a.jpg"], status: "AVAILABLE", city: "Pune", isCertified: false, createdAt: "2026-01-01T00:00:00Z", brand: { id: 1, name: "Kia" } }], meta: { total: 1, page: 1, limit: 50, totalPages: 1, hasNextPage: false, hasPrevPage: false } };

// ── list ───────────────────────────────────────────────────────────────

test("list: public request reads published stock from NestJS, anonymously", async () => {
  fakeBackend(() => ({ data: LIST }));
  const res = await listGET(await req("GET", "/api/vehicles?fuel=PETROL&minYear=2018&maxMileage=50000&model=Seltos"));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).vehicles[0].name, "Seltos");
  assert.equal(calls[0].auth, null);
  const q = new URL("http://x" + calls[0].path).searchParams;
  assert.equal(calls[0].path.startsWith("/vehicles?"), true);
  assert.equal(q.get("minYear"), "2018");
  assert.equal(q.get("maxMileage"), "50000");
  assert.equal(q.get("search"), "Seltos", "model is searched, not silently dropped");
});

test("list: backend down is a 503, never a second database", async () => {
  fakeBackend(() => "down");
  assert.equal((await listGET(await req("GET", "/api/vehicles"))).status, 503);
});

test("list: drafts come only from the staff endpoint, only for admin/dealer", async () => {
  fakeBackend(() => ({ data: LIST }));
  await listGET(await req("GET", "/api/vehicles?includeDrafts=1", DEALER));
  assert.ok(calls[0].path.startsWith("/vehicles/admin/all"));
  assert.equal(calls[0].auth, "Bearer dealer-token");

  for (const who of [undefined, CUSTOMER]) {
    calls = [];
    await listGET(await req("GET", "/api/vehicles?includeDrafts=1", who));
    assert.ok(calls[0].path.startsWith("/vehicles?"), "public endpoint");
    assert.equal(calls[0].auth, null, "no token is sent for a public read");
  }
});

// ── create ─────────────────────────────────────────────────────────────

const NEW = { title: "Seltos", price: 900000, year: 2022, mileage: 100, fuel: "PETROL", transmission: "MANUAL", color: "Red", city: "Pune", brandId: 1, categoryId: 2, registrationNumber: "MH12AB1234" };

test("create: anonymous 401, customer 403, employee 403 — nothing reaches NestJS", async () => {
  fakeBackend(() => ({ data: {} }));
  assert.equal((await createPOST(await req("POST", "/api/vehicles", undefined, NEW))).status, 401);
  assert.equal((await createPOST(await req("POST", "/api/vehicles", CUSTOMER, NEW))).status, 403);
  assert.equal((await createPOST(await req("POST", "/api/vehicles", EMPLOYEE, NEW))).status, 403);
  assert.equal(calls.length, 0);
});

test("create: a dealer's dealerId and isFeatured never leave Next.js", async () => {
  fakeBackend(() => ({ status: 201, data: { id: 5 } }));
  const res = await createPOST(await req("POST", "/api/vehicles", DEALER, { ...NEW, dealerId: 99, isFeatured: true }));
  assert.equal(res.status, 201);
  assert.equal(calls[0].path, "/vehicles");
  assert.equal(calls[0].auth, "Bearer dealer-token");
  assert.equal("dealerId" in calls[0].body, false);
  assert.equal(calls[0].body.isFeatured, undefined);
  assert.deepEqual(calls[0].body.images, [], "no images when none supplied");
});

test("create: an admin must name the dealership and may feature", async () => {
  fakeBackend(() => ({ status: 201, data: { id: 5 } }));
  assert.equal((await createPOST(await req("POST", "/api/vehicles", ADMIN, NEW))).status, 400);
  assert.equal(calls.length, 0);
  const ok = await createPOST(await req("POST", "/api/vehicles", ADMIN, { ...NEW, dealerId: 3, isFeatured: true }));
  assert.equal(ok.status, 201);
  assert.equal(calls[0].body.dealerId, 3);
  assert.equal(calls[0].body.isFeatured, true);
});

test("create: malformed payloads are refused before NestJS, backend refusals pass through", async () => {
  fakeBackend(() => ({ status: 403, message: "No dealer profile is linked to your account." }));
  const bad = await createPOST(await req("POST", "/api/vehicles", DEALER, { title: "", brandId: "abc", categoryId: null, price: -1 }));
  assert.equal(bad.status, 400);
  assert.equal(calls.length, 0);
  const refused = await createPOST(await req("POST", "/api/vehicles", DEALER, NEW));
  assert.equal(refused.status, 403);
  assert.match((await refused.json()).error, /dealer profile/);
});

// ── detail ─────────────────────────────────────────────────────────────

test("detail: 404, outage and token forwarding", async () => {
  fakeBackend((c) => (c.path.startsWith("/vehicles/9") ? { status: 404, message: "Vehicle not found." } : { data: LIST }));
  assert.equal((await detailGET(await req("GET", "/api/vehicles/9"), ctx("9"))).status, 404);

  fakeBackend(() => "down");
  assert.equal((await detailGET(await req("GET", "/api/vehicles/9"), ctx("9"))).status, 503);

  fakeBackend((c) => ({ data: c.path === "/vehicles/1" ? { ...LIST.items[0], dealer: { id: 2, businessName: "D" } } : LIST }));
  const res = await detailGET(await req("GET", "/api/vehicles/1", DEALER), ctx("1"));
  assert.equal(res.status, 200);
  assert.equal(calls[0].auth, "Bearer dealer-token", "lets NestJS show the owner's own draft");
  assert.equal((await res.json()).vehicle.name, "Seltos");
  assert.equal((await detailGET(await req("GET", "/api/vehicles/x"), ctx("x"))).status, 400);
});

// ── patch ──────────────────────────────────────────────────────────────

test("patch: anonymous 401, customer 403, employee 403", async () => {
  fakeBackend(() => ({ data: {} }));
  assert.equal((await detailPATCH(await req("PATCH", "/api/vehicles/1", undefined, {}), ctx("1"))).status, 401);
  assert.equal((await detailPATCH(await req("PATCH", "/api/vehicles/1", CUSTOMER, {}), ctx("1"))).status, 403);
  assert.equal((await detailPATCH(await req("PATCH", "/api/vehicles/1", EMPLOYEE, {}), ctx("1"))).status, 403);
  assert.equal(calls.length, 0);
});

test("patch: a dealer's tenancy, featuring and premium fields are dropped; ownership is NestJS's call", async () => {
  fakeBackend(() => ({ data: { id: 1 } }));
  const res = await detailPATCH(
    await req("PATCH", "/api/vehicles/1", DEALER, { title: "Renamed", dealerId: 9, isFeatured: true, premium: { isPremium: true } }),
    ctx("1"),
  );
  assert.equal(res.status, 200);
  assert.equal(calls.length, 1, "no premium call for a dealer");
  assert.deepEqual(calls[0].body, { title: "Renamed" });

  fakeBackend(() => ({ status: 403, message: "You do not own this vehicle." }));
  const other = await detailPATCH(await req("PATCH", "/api/vehicles/2", DEALER, { title: "x" }), ctx("2"));
  assert.equal(other.status, 403);
});

test("patch: an admin's reassignment and premium settings are forwarded; a failed status change is reported", async () => {
  fakeBackend(() => ({ data: { id: 1 } }));
  const ok = await detailPATCH(
    await req("PATCH", "/api/vehicles/1", ADMIN, { dealerId: 4, isFeatured: true, status: "SOLD", premium: { isPremium: true } }),
    ctx("1"),
  );
  assert.equal(ok.status, 200);
  assert.deepEqual(calls.map((c) => c.path), ["/vehicles/1", "/vehicles/1/status", "/premium-vehicles/admin/vehicles/1"]);
  assert.equal(calls[0].body.dealerId, 4);

  fakeBackend((c) => (c.path.endsWith("/status") ? { status: 400, message: "bad status" } : { data: {} }));
  const failed = await detailPATCH(await req("PATCH", "/api/vehicles/1", ADMIN, { status: "SOLD" }), ctx("1"));
  assert.equal(failed.status, 400);
  assert.match((await failed.json()).error, /status was not/);
});

test("patch: backend down is a 503", async () => {
  fakeBackend(() => "down");
  assert.equal((await detailPATCH(await req("PATCH", "/api/vehicles/1", ADMIN, { title: "x" }), ctx("1"))).status, 503);
});

// ── delete ─────────────────────────────────────────────────────────────

test("delete: customers refused, dealers go to NestJS with their token", async () => {
  fakeBackend(() => ({ data: {} }));
  assert.equal((await detailDELETE(await req("DELETE", "/api/vehicles/1", CUSTOMER), ctx("1"))).status, 403);
  assert.equal(calls.length, 0);
  const ok = await detailDELETE(await req("DELETE", "/api/vehicles/1", DEALER), ctx("1"));
  assert.equal(ok.status, 200);
  assert.equal(calls[0].method, "DELETE");
  assert.equal(calls[0].auth, "Bearer dealer-token");

  fakeBackend(() => ({ status: 403, message: "You do not own this vehicle." }));
  assert.equal((await detailDELETE(await req("DELETE", "/api/vehicles/2", DEALER), ctx("2"))).status, 403);
});
