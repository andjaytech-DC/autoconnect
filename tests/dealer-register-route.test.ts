import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { resetRateLimits } from "../app/lib/rate-limit";
import { POST, GET, PATCH } from "../app/api/dealer/register/route";

const CUSTOMER: SessionUser = { id: "7", username: "c", email: "c@x.test", name: "C", role: "CUSTOMER", token: "cust" };
const ADMIN: SessionUser = { id: "1", username: "a", email: "a@x.test", name: "A", role: "ADMIN", token: "admin-token" };

interface Call { method: string; path: string; auth: string | null; body: unknown }
const realFetch = globalThis.fetch;
let calls: Call[] = [];

function fakeBackend(r: (c: Call) => { status?: number; data?: unknown; message?: string } | "down"): void {
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

async function req(method: string, user?: SessionUser, body?: unknown, qs = ""): Promise<Request> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (user) headers.cookie = `${SESSION_COOKIE}=${await signSession(user)}`;
  return new Request(`https://example.test/api/dealer/register${qs}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => resetRateLimits());
afterEach(() => { globalThis.fetch = realFetch; });

const FORM = {
  businessName: "AutoHub", ownerName: "Asha", phone: "+91 98765 43210", email: "Asha@Example.test",
  city: "Pune", state: "MH", address: "1 Main Rd", pincode: "411001", gstNumber: "27ABCDE1234F1Z5",
};

test("register: the form is normalised and only whitelisted fields reach NestJS", async () => {
  fakeBackend(() => ({ status: 201, data: { id: 5, status: "PENDING", extra: "x" } }));
  const res = await POST(await req("POST", undefined, FORM));
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), { data: { id: 5, status: "PENDING" } });
  assert.equal(calls[0].path, "/dealers/apply");
  assert.equal(calls[0].auth, null);
  assert.deepEqual(calls[0].body, {
    businessName: "AutoHub", ownerName: "Asha", phone: "9876543210", email: "asha@example.test",
    city: "Pune", state: "MH", address: "1 Main Rd", pincode: "411001", gstNumber: "27ABCDE1234F1Z5",
  });
});

test("register: invalid input never reaches the backend", async () => {
  fakeBackend(() => ({ data: {} }));
  const res = await POST(await req("POST", undefined, { ...FORM, phone: "123" }));
  assert.equal(res.status, 400);
  assert.equal(calls.length, 0);
});

test("register: duplicate phone (409) and outage (503) are reported honestly", async () => {
  fakeBackend(() => ({ status: 409, message: "A dealer with this phone number already exists" }));
  const dup = await POST(await req("POST", undefined, FORM));
  assert.equal(dup.status, 409);
  assert.match((await dup.json()).error, /already exists/);

  fakeBackend(() => "down");
  assert.equal((await POST(await req("POST", undefined, FORM))).status, 503);
});

test("admin list: 401 anonymous, 403 customer, admin reads the backend with its token", async () => {
  fakeBackend(() => ({ data: [{ id: 1 }] }));
  assert.equal((await GET(await req("GET"))).status, 401);
  assert.equal((await GET(await req("GET", CUSTOMER))).status, 403);
  assert.equal(calls.length, 0);
  const ok = await GET(await req("GET", ADMIN, undefined, "?status=PENDING"));
  assert.deepEqual((await ok.json()).dealers, [{ id: 1 }]);
  assert.equal(calls[0].path, "/dealers/admin/applications?status=PENDING");
  assert.equal(calls[0].auth, "Bearer admin-token");
});

test("approve: admin only, validated, and forwarded to the status endpoint", async () => {
  fakeBackend(() => ({ data: { id: 3, status: "APPROVED" } }));
  assert.equal((await PATCH(await req("PATCH", CUSTOMER, { id: 3, status: "APPROVED" }))).status, 403);
  assert.equal((await PATCH(await req("PATCH", ADMIN, { id: "3", status: "APPROVED" }))).status, 400);
  assert.equal((await PATCH(await req("PATCH", ADMIN, { id: 3, status: "PENDING" }))).status, 400);
  assert.equal(calls.length, 0);
  const ok = await PATCH(await req("PATCH", ADMIN, { id: 3, status: "APPROVED" }));
  assert.equal(ok.status, 200);
  assert.equal(calls[0].path, "/dealers/3/status");
  assert.deepEqual(calls[0].body, { status: "APPROVED" });
});
