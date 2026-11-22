import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { resetRateLimits } from "../app/lib/rate-limit";
import { GET as providersGET } from "../app/api/services/providers/route";
import { GET as bookingsGET } from "../app/api/services/bookings/route";
import { GET as bookingGET, PATCH as bookingPATCH } from "../app/api/services/bookings/[id]/route";
import { GET as categoriesGET } from "../app/api/services/categories/route";
import { GET as myBookingsGET, POST as myBookingsPOST } from "../app/api/service-bookings/route";
import { GET as myBookingGET } from "../app/api/service-bookings/[id]/route";
import { POST as myCancelPOST } from "../app/api/service-bookings/[id]/cancel/route";
import { GET as adminProvidersGET, POST as adminProvidersPOST } from "../app/api/admin/service-providers/route";
import { PATCH as adminProviderPATCH } from "../app/api/admin/service-providers/[id]/route";
import { GET as adminCategoriesGET, POST as adminCategoriesPOST } from "../app/api/admin/service-categories/route";
import { PATCH as adminCategoryPATCH } from "../app/api/admin/service-categories/[id]/route";

/** Service providers and bookings live in NestJS; the BFF validates, gates and forwards. */

const u = (id: string, role: SessionUser["role"], token?: string): SessionUser => ({
  id, username: role, email: `${role}@x.test`, name: role, role, ...(token ? { token } : {}),
});
const ADMIN = u("1", "ADMIN", "admin-token");
const CUSTOMER = u("7", "CUSTOMER", "cust-token");
const NO_TOKEN_ADMIN = u("2", "ADMIN");

interface Call { method: string; path: string; search: string; auth: string | null; body: unknown }
type Out = { status?: number; data?: unknown; meta?: unknown; message?: string } | "down";
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
      JSON.stringify(
        status >= 400
          ? { message: out.message ?? "error" }
          : { success: true, data: out.data, ...(out.meta !== undefined ? { meta: out.meta } : {}) },
      ),
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

const BOOKING = {
  providerId: 2, categoryCode: "AC", customerName: "Asha", customerPhone: "9876543210",
  preferredDate: "2026-12-01", preferredTime: "10:00",
};

test("providers: anonymous call sends no token; a signed-in call forwards it; contact masking is NestJS's job", async () => {
  fakeBackend(() => ({ data: { providers: [{ id: 1, phone: null }], contactAvailable: false, pagination: { page: 1, limit: 24 } } }));
  const anon = await send(providersGET, undefined, { url: "https://example.test/api/services/providers?city=Pune&limit=10&evil=1" });
  assert.deepEqual(await anon.json(), { providers: [{ id: 1, phone: null }], contactAvailable: false, pagination: { page: 1, limit: 24 } });
  assert.equal(calls[0].auth, null);
  assert.equal(calls[0].path, "/service-providers");
  assert.equal(calls[0].search, "?city=Pune&limit=10", "only known filters are forwarded");

  await send(providersGET, CUSTOMER);
  assert.equal(calls[1].auth, "Bearer cust-token");
});

test("providers: outage is 503 and the rate limit applies", async () => {
  fakeBackend(() => "down");
  assert.equal((await send(providersGET, undefined)).status, 503);
  fakeBackend(() => ({ data: { providers: [], contactAvailable: false, pagination: { page: 1, limit: 24 } } }));
  for (let i = 0; i < 60; i++) await send(providersGET, undefined);
  assert.equal((await send(providersGET, undefined)).status, 429);
});


// ───────────────────────── customer booking routes ─────────────────────────

test("customer booking POST: requires sign-in, validates, forwards the TOKEN (not a body owner)", async () => {
  fakeBackend(() => ({ data: { id: 1 } }));
  // Anonymous: refused before any backend call (no unauthenticated writes via the BFF).
  assert.equal((await send(myBookingsPOST, undefined, { method: "POST", body: BOOKING })).status, 401);
  assert.equal(calls.length, 0);

  assert.equal((await send(myBookingsPOST, CUSTOMER, { method: "POST", body: { ...BOOKING, providerId: 0 } })).status, 400);
  assert.equal((await send(myBookingsPOST, CUSTOMER, { method: "POST", body: { ...BOOKING, preferredTime: "10:00 AM" } })).status, 400);
  assert.equal((await send(myBookingsPOST, CUSTOMER, { method: "POST", body: { ...BOOKING, categoryCode: "ac" } })).status, 400);
  assert.equal((await send(myBookingsPOST, CUSTOMER, { method: "POST", body: "{nope" })).status, 400);
  assert.equal(calls.length, 0, "invalid requests never reach NestJS");

  const ok = await send(myBookingsPOST, CUSTOMER, {
    method: "POST",
    body: { ...BOOKING, userId: 999, status: "COMPLETED", notes: "rattle" },
  });
  assert.equal(ok.status, 201);
  assert.equal(calls[0].path, "/service-bookings");
  assert.equal(calls[0].auth, "Bearer cust-token");
  const sent = calls[0].body as Record<string, unknown>;
  assert.equal(sent.notes, "rattle");
  assert.ok(!("userId" in sent) && !("status" in sent), "owner and status can never be supplied by the client");

  fakeBackend(() => ({ status: 400, message: "This provider does not offer ac servicing." }));
  const refused = await send(myBookingsPOST, CUSTOMER, { method: "POST", body: BOOKING });
  assert.equal(refused.status, 400);
  assert.match(JSON.stringify(await refused.json()), /does not offer/);
  fakeBackend(() => "down");
  assert.equal((await send(myBookingsPOST, CUSTOMER, { method: "POST", body: BOOKING })).status, 503);
});

test("customer booking POST: rate limited", async () => {
  fakeBackend(() => ({ data: { id: 1 } }));
  for (let i = 0; i < 8; i++) await send(myBookingsPOST, CUSTOMER, { method: "POST", body: BOOKING });
  assert.equal((await send(myBookingsPOST, CUSTOMER, { method: "POST", body: BOOKING })).status, 429);
});

test("my bookings: sign-in required; list, detail and cancel all use the caller's token", async () => {
  fakeBackend(() => ({ data: [{ id: 1 }] }));
  assert.equal((await send(myBookingsGET, undefined)).status, 401);
  assert.equal((await send(withId(myBookingGET, "1"), undefined)).status, 401);
  assert.equal((await send(withId(myCancelPOST, "1"), undefined, { method: "POST" })).status, 401);
  assert.equal(calls.length, 0);

  assert.deepEqual(await (await send(myBookingsGET, CUSTOMER)).json(), { bookings: [{ id: 1 }] });
  assert.deepEqual([calls[0].path, calls[0].auth], ["/service-bookings/mine", "Bearer cust-token"]);

  fakeBackend(() => ({ data: { id: 5, timeline: [] } }));
  assert.equal((await send(withId(myBookingGET, "5"), CUSTOMER)).status, 200);
  assert.deepEqual([calls[0].path, calls[0].auth], ["/service-bookings/mine/5", "Bearer cust-token"]);

  fakeBackend(() => ({ data: { id: 5, status: "CANCELLED" } }));
  assert.equal((await send(withId(myCancelPOST, "5"), CUSTOMER, { method: "POST" })).status, 200);
  assert.deepEqual([calls[0].method, calls[0].path], ["PATCH", "/service-bookings/mine/5/cancel"]);
});

test("my bookings: ids are validated, and a foreign id surfaces as the backend's 404", async () => {
  fakeBackend(() => ({ data: {} }));
  for (const bad of ["../x", "1;drop", "0", "-3", "1.5"]) {
    assert.equal((await send(withId(myBookingGET, bad), CUSTOMER)).status, 400, bad);
    assert.equal((await send(withId(myCancelPOST, bad), CUSTOMER, { method: "POST" })).status, 400, bad);
  }
  assert.equal(calls.length, 0);
  fakeBackend(() => ({ status: 404, message: "Booking not found." }));
  assert.equal((await send(withId(myBookingGET, "9"), CUSTOMER)).status, 404);
  fakeBackend(() => ({ status: 400, message: "This booking can no longer be cancelled online. Please contact the provider." }));
  assert.equal((await send(withId(myCancelPOST, "9"), CUSTOMER, { method: "POST" })).status, 400);
});

// ───────────────────────── catalogue ─────────────────────────

test("categories: public, rate limited, no invented fallback when the backend is down", async () => {
  fakeBackend(() => ({ data: [{ code: "AC", bookable: true }] }));
  assert.deepEqual(await (await send(categoriesGET, undefined)).json(), { categories: [{ code: "AC", bookable: true }] });
  assert.deepEqual([calls[0].path, calls[0].auth], ["/services/categories", null]);
  fakeBackend(() => "down");
  assert.equal((await send(categoriesGET, undefined)).status, 503);
  fakeBackend(() => ({ data: [] }));
  for (let i = 0; i < 60; i++) await send(categoriesGET, undefined);
  assert.equal((await send(categoriesGET, undefined)).status, 429);
});

// ───────────────────────── admin ─────────────────────────

test("bookings GET: admin only, forwards only whitelisted filters, keeps pagination meta", async () => {
  fakeBackend(() => ({ data: [{ id: 1 }], meta: { total: 1, counts: { REQUESTED: 1 } } }));
  assert.equal((await send(bookingsGET, undefined)).status, 401);
  assert.equal((await send(bookingsGET, CUSTOMER)).status, 403);
  assert.equal((await send(bookingsGET, NO_TOKEN_ADMIN)).status, 401);
  assert.equal(calls.length, 0);

  const res = await send(bookingsGET, ADMIN, {
    url: "https://example.test/api/services/bookings?status=CONFIRMED&providerId=2&q=%20mh12%20&page=2&limit=500&evil=1&status2=x",
  });
  assert.deepEqual(await res.json(), { bookings: [{ id: 1 }], meta: { total: 1, counts: { REQUESTED: 1 } } });
  assert.equal(calls[0].auth, "Bearer admin-token");
  const q = new URLSearchParams(calls[0].search);
  assert.deepEqual(Object.fromEntries(q), { status: "CONFIRMED", providerId: "2", q: "mh12", page: "2", limit: "100" });

  // Junk filter values are dropped, not forwarded.
  await send(bookingsGET, ADMIN, { url: "https://example.test/api/services/bookings?status=PENDING&providerId=x;y&page=-1" });
  assert.equal(calls[1].search, "");
});

test("bookings [id]: admin only, id validated, status OR provider forwarded", async () => {
  fakeBackend(() => ({ data: { id: 3 } }));
  assert.equal((await send(withId(bookingGET, "3"), undefined)).status, 401);
  assert.equal((await send(withId(bookingGET, "3"), CUSTOMER)).status, 403);
  assert.equal((await send(withId(bookingGET, "../x"), ADMIN)).status, 400);
  const patch = (body: unknown) => send(withId(bookingPATCH, "3"), ADMIN, { method: "PATCH", body });
  assert.equal((await patch({ status: "DONE" })).status, 400);
  assert.equal((await patch({ status: "PENDING" })).status, 400, "the old status vocabulary is gone");
  assert.equal((await patch({})).status, 400, "nothing to change");
  assert.equal(calls.length, 0);

  assert.deepEqual(await (await send(withId(bookingGET, "3"), ADMIN)).json(), { data: { id: 3 } });
  assert.equal(calls[0].path, "/service-bookings/3");
  assert.equal((await patch({ status: "ASSIGNED" })).status, 200);
  assert.deepEqual([calls[1].method, calls[1].path, calls[1].body], ["PATCH", "/service-bookings/3", { status: "ASSIGNED" }]);
  assert.equal((await patch({ providerId: "7" })).status, 200);
  assert.deepEqual(calls[2].body, { providerId: 7 });

  // The workflow itself is enforced by NestJS and its message reaches the admin.
  fakeBackend(() => ({ status: 400, message: "A booking that is REQUESTED can only move to: CONFIRMED, CANCELLED." }));
  const refused = await patch({ status: "COMPLETED" });
  assert.equal(refused.status, 400);
  assert.match(JSON.stringify(await refused.json()), /can only move to/);

  fakeBackend(() => ({ status: 404, message: "Booking not found." }));
  assert.equal((await send(withId(bookingGET, "9"), ADMIN)).status, 404);
});

test("admin providers: admin only, validated, and forwarded to NestJS", async () => {
  fakeBackend(() => ({ data: [{ id: 1, openBookings: 2 }] }));
  assert.equal((await send(adminProvidersGET, undefined)).status, 401);
  assert.equal((await send(adminProvidersGET, CUSTOMER)).status, 403);
  assert.equal(calls.length, 0);
  assert.deepEqual(await (await send(adminProvidersGET, ADMIN)).json(), { providers: [{ id: 1, openBookings: 2 }] });
  assert.equal(calls[0].path, "/service-providers/admin");

  const P = { name: "Quick Fix", phone: "011-2345678", city: "Pune", services: ["AC"] };
  const post = (body: unknown, who: SessionUser | undefined = ADMIN) => send(adminProvidersPOST, who, { method: "POST", body });
  assert.equal((await post(P, CUSTOMER)).status, 403);
  assert.equal((await post({ ...P, services: [] })).status, 400);
  assert.equal((await post({ ...P, services: ["ac"] })).status, 400);
  assert.equal((await post({ ...P, phone: "abc" })).status, 400);
  assert.equal((await post({ ...P, status: "DELETED" })).status, 400);
  assert.equal(calls.length, 1, "only the GET reached the backend");

  fakeBackend(() => ({ data: { id: 5 } }));
  assert.equal((await post({ ...P, email: "" })).status, 201);
  assert.deepEqual([calls[0].method, calls[0].path], ["POST", "/service-providers"]);
  assert.ok(!("email" in (calls[0].body as object)), "an empty email is dropped, not sent");

  fakeBackend(() => ({ status: 400, message: "Unknown service categories: TELEPORT." }));
  assert.equal((await post({ ...P, services: ["TELEPORT"] })).status, 400);

  fakeBackend(() => ({ data: { id: 5 } }));
  const patch = (id: string, body: unknown, who: SessionUser | undefined = ADMIN) =>
    send(withId(adminProviderPATCH, id), who, { method: "PATCH", body });
  assert.equal((await patch("5", { status: "INACTIVE" }, CUSTOMER)).status, 403);
  assert.equal((await patch("../x", { status: "INACTIVE" })).status, 400);
  assert.equal((await patch("5", { status: "GONE" })).status, 400);
  assert.equal((await patch("5", { status: "INACTIVE" })).status, 200);
  const last = calls[calls.length - 1];
  assert.deepEqual([last.method, last.path, last.body], ["PATCH", "/service-providers/5", { status: "INACTIVE" }]);
});

test("admin categories: admin only; the code is validated and cannot be edited", async () => {
  fakeBackend(() => ({ data: [{ id: 1, code: "AC", providerCount: 2 }] }));
  assert.equal((await send(adminCategoriesGET, CUSTOMER)).status, 403);
  assert.deepEqual(await (await send(adminCategoriesGET, ADMIN)).json(), { categories: [{ id: 1, code: "AC", providerCount: 2 }] });
  assert.equal(calls[0].path, "/services/admin/categories");

  const post = (body: unknown, who: SessionUser | undefined = ADMIN) => send(adminCategoriesPOST, who, { method: "POST", body });
  assert.equal((await post({ code: "GLASS", name: "Glass" }, CUSTOMER)).status, 403);
  assert.equal((await post({ code: "glass", name: "Glass" })).status, 400);
  assert.equal((await post({ code: "GLASS" })).status, 400);
  fakeBackend(() => ({ data: { id: 9 } }));
  assert.equal((await post({ code: "GLASS", name: "Glass", sortOrder: "5" })).status, 201);
  assert.deepEqual(calls[0].body, { code: "GLASS", name: "Glass", sortOrder: 5 });

  const patch = (body: unknown, who: SessionUser | undefined = ADMIN) =>
    send(withId(adminCategoryPATCH, "9"), who, { method: "PATCH", body });
  assert.equal((await patch({ isActive: false }, CUSTOMER)).status, 403);
  assert.equal((await patch({ isActive: "no" })).status, 400);
  assert.equal((await patch({ isActive: false, code: "HACK" })).status, 200);
  assert.deepEqual(calls[calls.length - 1].body, { isActive: false }, "an attempted code change is stripped");
});
