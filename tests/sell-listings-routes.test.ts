import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { resetRateLimits } from "../app/lib/rate-limit";
import { POST, GET } from "../app/api/sell-listings/route";
import { GET as itemGET, PATCH as itemPATCH } from "../app/api/sell-listings/[id]/route";

const CUSTOMER: SessionUser = { id: "7", username: "c", email: "c@x.test", name: "C", role: "CUSTOMER", token: "cust" };
const ADMIN: SessionUser = { id: "1", username: "a", email: "a@x.test", name: "A", role: "ADMIN", token: "admin-token" };

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

async function req(method: string, u?: SessionUser, body?: unknown, qs = ""): Promise<Request> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (u) headers.cookie = `${SESSION_COOKIE}=${await signSession(u)}`;
  return new Request(`https://example.test/api/sell-listings${qs}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => resetRateLimits());
afterEach(() => { globalThis.fetch = realFetch; });

const FORM = {
  ownerName: "Asha", phone: "+91 98765 43210", email: "",
  vehicleData: { make: "Hyundai", model: "Creta", year: 2020, mileage: 40000, city: "Pune", registration: "mh12ab1234" },
};

test("submit: normalised, anonymous, and sent to NestJS without an empty email", async () => {
  fakeBackend(() => ({ status: 201, data: { id: 4 } }));
  const res = await POST(await req("POST", undefined, FORM));
  assert.equal(res.status, 201);
  assert.deepEqual((await res.json()).data, { id: 4 });
  assert.equal(calls[0].path, "/seller-listings");
  assert.equal(calls[0].auth, null);
  assert.equal(calls[0].body.phone, "9876543210");
  assert.equal("email" in calls[0].body, false);
  assert.equal(
    (calls[0].body.vehicleData as Record<string, unknown>).registration,
    "MH12AB1234",
  );
  assert.deepEqual(calls[0].body.images, []);
});

test("submit: invalid input never reaches NestJS; outage is 503; backend 400 passes through", async () => {
  fakeBackend(() => ({ data: {} }));
  assert.equal((await POST(await req("POST", undefined, { ...FORM, phone: "12" }))).status, 400);
  assert.equal(calls.length, 0);
  fakeBackend(() => "down");
  assert.equal((await POST(await req("POST", undefined, FORM))).status, 503);
  fakeBackend(() => ({ status: 400, message: "Phone must be a valid 10-digit Indian mobile number" }));
  assert.equal((await POST(await req("POST", undefined, FORM))).status, 400);
});

test("admin list: 401 / 403 / token forwarded with the status filter", async () => {
  fakeBackend(() => ({ data: [{ id: 1 }] }));
  assert.equal((await GET(await req("GET"))).status, 401);
  assert.equal((await GET(await req("GET", CUSTOMER))).status, 403);
  assert.equal(calls.length, 0);
  const ok = await GET(await req("GET", ADMIN, undefined, "?status=PENDING"));
  assert.deepEqual((await ok.json()).listings, [{ id: 1 }]);
  assert.equal(calls[0].path, "/seller-listings?status=PENDING");
  assert.equal(calls[0].auth, "Bearer admin-token");
});

test("admin item: get and status change go to NestJS; bad ids and statuses are refused locally", async () => {
  fakeBackend(() => ({ data: { id: 3, status: "APPROVED" } }));
  assert.equal((await itemGET(await req("GET", CUSTOMER), ctx("3"))).status, 403);
  assert.equal((await itemPATCH(await req("PATCH", CUSTOMER, { status: "APPROVED" }), ctx("3"))).status, 403);
  assert.equal((await itemPATCH(await req("PATCH", ADMIN, { status: "NOPE" }), ctx("3"))).status, 400);
  assert.equal((await itemPATCH(await req("PATCH", ADMIN, { status: "APPROVED" }), ctx("abc"))).status, 404);
  assert.equal(calls.length, 0);

  assert.equal((await itemGET(await req("GET", ADMIN), ctx("3"))).status, 200);
  assert.equal(calls[0].path, "/seller-listings/3");
  const ok = await itemPATCH(await req("PATCH", ADMIN, { status: "APPROVED" }), ctx("3"));
  assert.equal(ok.status, 200);
  assert.equal(calls[1].path, "/seller-listings/3/status");
  assert.equal(calls[1].method, "PATCH");
  assert.deepEqual(calls[1].body, { status: "APPROVED" });

  fakeBackend(() => ({ status: 404, message: "Listing not found." }));
  assert.equal((await itemGET(await req("GET", ADMIN), ctx("9"))).status, 404);
});
