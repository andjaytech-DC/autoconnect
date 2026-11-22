import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { resetRateLimits } from "../app/lib/rate-limit";
import { POST as financePOST, GET as financeGET } from "../app/api/finance-applications/route";
import { POST as loanPOST } from "../app/api/loan/new/route";
import { GET as ordersGET } from "../app/api/orders/route";
import {
  GET as bookingsGET,
  POST as bookingsPOST,
  PATCH as bookingsPATCH,
} from "../app/api/bookings/route";

/**
 * Finance, loan, orders and bookings hold no data in Next.js any more: every
 * request is answered by NestJS. These tests replace `fetch` with a fake
 * backend and check the contract in both directions — what the BFF sends (the
 * backend's ValidationPipe rejects unknown fields) and what it does when the
 * backend is slow, down or says no.
 */

const CUSTOMER: SessionUser = {
  id: "7", username: "c", email: "c@x.test", name: "C", role: "CUSTOMER", token: "cust-token",
};
const ADMIN: SessionUser = {
  id: "1", username: "a", email: "a@x.test", name: "A", role: "ADMIN", token: "admin-token",
};

interface Call { method: string; path: string; auth: string | null; body: unknown }
type Responder = (call: Call) => { status?: number; data?: unknown; message?: string } | "down";

const realFetch = globalThis.fetch;
let calls: Call[] = [];

function fakeBackend(responder: Responder): void {
  calls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const headers = new Headers(init?.headers);
    const call: Call = {
      method: init?.method ?? "GET",
      path: url.pathname.replace(/^\/api/, ""),
      auth: headers.get("authorization"),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    const out = responder(call);
    if (out === "down") throw new TypeError("fetch failed");
    const status = out.status ?? 200;
    const payload = status >= 400 ? { message: out.message ?? "error" } : { success: true, data: out.data };
    return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

async function cookieFor(user: SessionUser): Promise<string> {
  return `${SESSION_COOKIE}=${await signSession(user)}`;
}

async function request(
  method: string,
  path: string,
  user?: SessionUser,
  body?: unknown,
): Promise<Request> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (user) headers.cookie = await cookieFor(user);
  return new Request(`https://example.test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => resetRateLimits());
afterEach(() => {
  globalThis.fetch = realFetch;
});

const FORM = {
  applicantName: "Asha Rao",
  phone: "9876543210",
  email: "asha@example.test",
  monthlyIncome: 90000,
  employmentType: "SALARIED",
  loanAmount: 700000,
  tenureMonths: 60,
  downPayment: 100000,
  vehicleId: 12,
};

// ── finance applications ───────────────────────────────────────────────

test("finance: a guest is asked to sign in and nothing is sent to the backend", async () => {
  fakeBackend(() => ({ data: {} }));
  const res = await financePOST(await request("POST", "/api/finance-applications", undefined, FORM));
  assert.equal(res.status, 401);
  assert.equal(calls.length, 0);
});

test("finance: only fields the backend accepts are forwarded, then the application is submitted", async () => {
  fakeBackend((c) =>
    c.path === "/finance/applications"
      ? { status: 201, data: { id: 41, referenceNo: "FA000041", status: "DRAFT" } }
      : { data: { id: 41, referenceNo: "FA000041", status: "SUBMITTED" } },
  );
  const res = await financePOST(await request("POST", "/api/finance-applications", CUSTOMER, FORM));
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.data.referenceNo, "FA000041");
  assert.equal(body.data.id, 41);

  assert.equal(calls.length, 2);
  assert.equal(calls[0].path, "/finance/applications");
  assert.equal(calls[0].auth, "Bearer cust-token");
  // The backend uses whitelist + forbidNonWhitelisted: any extra key is a 400.
  assert.deepEqual(Object.keys(calls[0].body as object).sort(), [
    "downPayment", "loanAmount", "monthlyIncome", "tenureMonths", "vehicleId",
  ]);
  assert.equal(calls[1].path, "/finance/applications/41/submit");
  assert.equal(calls[1].method, "POST");
});

test("finance: a backend that is down is a 503, not a silent local save", async () => {
  fakeBackend(() => "down");
  const res = await financePOST(await request("POST", "/api/finance-applications", CUSTOMER, FORM));
  assert.equal(res.status, 503);
});

test("finance: a backend validation error is passed through", async () => {
  fakeBackend(() => ({ status: 400, message: "tenureMonths must not be less than 1" }));
  const res = await financePOST(await request("POST", "/api/finance-applications", CUSTOMER, FORM));
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /tenureMonths/);
});

test("finance: a backend crash is reported as 502 without leaking its message", async () => {
  fakeBackend(() => ({ status: 500, message: "PrismaClientKnownRequestError at line 1" }));
  const res = await financePOST(await request("POST", "/api/finance-applications", CUSTOMER, FORM));
  assert.equal(res.status, 502);
  assert.doesNotMatch(JSON.stringify(await res.json()), /Prisma/);
});

test("finance admin list: customers are refused, admins read the backend admin route", async () => {
  fakeBackend(() => ({ data: [{ id: 1, referenceNo: "FA000001" }] }));
  const denied = await financeGET(await request("GET", "/api/finance-applications", CUSTOMER));
  assert.equal(denied.status, 403);
  assert.equal(calls.length, 0);

  const ok = await financeGET(await request("GET", "/api/finance-applications", ADMIN));
  assert.equal(ok.status, 200);
  assert.deepEqual((await ok.json()).applications, [{ id: 1, referenceNo: "FA000001" }]);
  assert.equal(calls[0].path, "/finance/admin/applications");
  assert.equal(calls[0].auth, "Bearer admin-token");
});

// ── loan ───────────────────────────────────────────────────────────────

test("loan: years become months and the reference is returned as the application id", async () => {
  fakeBackend((c) =>
    c.path.endsWith("/submit")
      ? { data: { id: 9, referenceNo: "FA000009", status: "SUBMITTED" } }
      : { status: 201, data: { id: 9, referenceNo: "FA000009", status: "DRAFT" } },
  );
  const res = await loanPOST(
    await request("POST", "/api/loan/new", CUSTOMER, { carId: 5, amount: 600000, tenureYears: 3, monthlyIncome: 80000 }),
  );
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.applicationId, "FA000009");
  assert.equal(body.status, "SUBMITTED");
  assert.deepEqual(calls[0].body, { vehicleId: 5, loanAmount: 600000, tenureMonths: 36, monthlyIncome: 80000 });
});

test("loan: anonymous is 401 and invalid input never reaches the backend", async () => {
  fakeBackend(() => ({ data: {} }));
  const anon = await loanPOST(await request("POST", "/api/loan/new", undefined, { carId: 5, amount: 600000, tenureYears: 3 }));
  assert.equal(anon.status, 401);
  const bad = await loanPOST(await request("POST", "/api/loan/new", CUSTOMER, { carId: 5, amount: 10, tenureYears: 3 }));
  assert.equal(bad.status, 400);
  assert.equal(calls.length, 0);
});

// ── orders ─────────────────────────────────────────────────────────────

test("orders: purchases and loan applications are merged newest first", async () => {
  fakeBackend((c) =>
    c.path === "/orders"
      ? { data: [{ id: 3, itemType: "VEHICLE", itemId: 5, totalPrice: 900000, status: "PLACED", createdAt: "2026-10-01T00:00:00Z" }] }
      : { data: [{ id: 9, referenceNo: "FA000009", vehicleId: 5, loanAmount: 600000, status: "APPROVED", createdAt: "2026-10-20T00:00:00Z" }] },
  );
  const res = await ordersGET(await request("GET", "/api/orders", CUSTOMER));
  assert.equal(res.status, 200);
  const { orders } = await res.json();
  assert.deepEqual(orders.map((o: { id: string }) => o.id), ["FA000009", "3"]);
  assert.equal(orders[0].type, "FINANCE");
  assert.equal(orders[0].status, "APPROVED");
  assert.equal(orders[1].type, "PURCHASE");
  assert.equal(orders[1].status, "PENDING");
});

test("orders: backend down is a 503 and anonymous is 401", async () => {
  fakeBackend(() => "down");
  assert.equal((await ordersGET(await request("GET", "/api/orders", CUSTOMER))).status, 503);
  assert.equal((await ordersGET(await request("GET", "/api/orders"))).status, 401);
});

// ── bookings ───────────────────────────────────────────────────────────

test("bookings: list reads the caller's own bookings from the backend", async () => {
  fakeBackend(() => ({
    data: [{ id: 2, vehicleId: 5, bookingDate: "2026-11-02T14:30:00.000Z", status: "PENDING", createdAt: "x", vehicle: { title: "Seltos" } }],
  }));
  const res = await bookingsGET(await request("GET", "/api/bookings", CUSTOMER));
  assert.equal(res.status, 200);
  assert.equal(calls[0].path, "/bookings/user/7");
  const { bookings } = await res.json();
  assert.equal(bookings[0].date, "2026-11-02");
  assert.equal(bookings[0].slot, "02:30 PM", "the slot is read back as UTC, independent of the server timezone");
  assert.equal(bookings[0].vehicleName, "Seltos");
});

test("bookings: backend down is a 503 for every verb", async () => {
  fakeBackend(() => "down");
  assert.equal((await bookingsGET(await request("GET", "/api/bookings", CUSTOMER))).status, 503);
  assert.equal(
    (await bookingsPOST(await request("POST", "/api/bookings", CUSTOMER, { carId: 5, date: "2030-01-01", slot: "10:30 AM" }))).status,
    503,
  );
  assert.equal(
    (await bookingsPATCH(await request("PATCH", "/api/bookings", CUSTOMER, { bookingId: "4" }))).status,
    503,
  );
});

test("bookings: create resolves the dealer from the vehicle and sends the slot as the booking time", async () => {
  fakeBackend((c) =>
    c.path === "/vehicles/5"
      ? { data: { id: 5, dealer: { id: 3 } } }
      : { status: 201, data: { id: 8, vehicleId: 5, bookingDate: (c.body as { bookingDate: string }).bookingDate, status: "PENDING", createdAt: "x" } },
  );
  const res = await bookingsPOST(await request("POST", "/api/bookings", CUSTOMER, { carId: 5, date: "2030-01-01", slot: "10:30 AM" }));
  assert.equal(res.status, 201);
  const post = calls.find((c) => c.path === "/bookings")!;
  assert.deepEqual(post.body, {
    vehicleId: 5, customerId: 7, dealerId: 3,
    bookingDate: "2030-01-01T10:30:00.000Z", notes: "Time slot: 10:30 AM",
  });
  assert.equal((await res.json()).booking.slot, "10:30 AM");
});

test("bookings: an unknown vehicle is a 400 and creates nothing", async () => {
  fakeBackend((c) => (c.path === "/vehicles/99" ? { status: 404, message: "Vehicle not found" } : { data: {} }));
  const res = await bookingsPOST(await request("POST", "/api/bookings", CUSTOMER, { carId: 99, date: "2030-01-01", slot: "10:30 AM" }));
  assert.equal(res.status, 400);
  assert.equal(calls.some((c) => c.path === "/bookings"), false);
});

test("bookings: cancel uses the dedicated cancel endpoint and rejects non-numeric ids", async () => {
  fakeBackend(() => ({ data: { id: 4, vehicleId: 5, bookingDate: "2030-01-01T10:30:00.000Z", status: "CANCELLED", createdAt: "x" } }));
  const ok = await bookingsPATCH(await request("PATCH", "/api/bookings", CUSTOMER, { bookingId: "4" }));
  assert.equal(ok.status, 200);
  assert.equal(calls[0].path, "/bookings/4/cancel");
  assert.equal(calls[0].method, "PATCH");
  assert.equal((await ok.json()).booking.status, "CANCELLED");

  const bad = await bookingsPATCH(await request("PATCH", "/api/bookings", CUSTOMER, { bookingId: "bkg_123" }));
  assert.equal(bad.status, 400);
  assert.equal(calls.length, 1);
});

test("bookings: a refusal from the backend is shown, not replaced by a local cancel", async () => {
  fakeBackend(() => ({ status: 403, message: "You may only cancel your own bookings." }));
  const res = await bookingsPATCH(await request("PATCH", "/api/bookings", CUSTOMER, { bookingId: "4" }));
  assert.equal(res.status, 403);
});
