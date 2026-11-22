import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { resetRateLimits } from "../app/lib/rate-limit";
import { GET as inspGET, POST as inspPOST } from "../app/api/inspections/route";
import { PATCH as inspPATCH } from "../app/api/inspections/[id]/route";
import { GET as insGET, POST as insPOST } from "../app/api/insurance/route";
import { GET as insIdGET, PATCH as insIdPATCH } from "../app/api/insurance/[id]/route";

/** Inspections and insurance enquiries live in NestJS; the BFF validates, gates and forwards. */

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

const INSPECTION = {
  customerName: "Asha", customerPhone: "9876543210", inspectionType: "FULL",
  location: "Pune", preferredDate: "2026-12-01", preferredTime: "10:00 AM",
};
const ENQUIRY = { customerName: "Rahul", phone: "+91 98765 43210", coverType: "RENEWAL", email: "", registrationNo: "", message: "", consent: true };

// ── inspections ────────────────────────────────────────────────────────────

test("POST /api/inspections: validates, forwards an ISO date with no token", async () => {
  fakeBackend(() => ({ data: { id: 1 } }));
  assert.equal((await send(inspPOST, undefined, { method: "POST", body: { ...INSPECTION, inspectionType: "MAGIC" } })).status, 400);
  assert.equal((await send(inspPOST, undefined, { method: "POST", body: "{nope" })).status, 400);
  assert.equal(calls.length, 0);

  const res = await send(inspPOST, undefined, { method: "POST", body: INSPECTION });
  assert.equal(res.status, 201);
  assert.equal(calls[0].path, "/inspections");
  assert.equal(calls[0].auth, null);
  assert.equal((calls[0].body as { preferredDate: string }).preferredDate, "2026-12-01T00:00:00.000Z");
});

test("POST /api/inspections: backend refusal passes through, outage is 503", async () => {
  fakeBackend(() => ({ status: 404, message: "Vehicle not found." }));
  assert.equal((await send(inspPOST, undefined, { method: "POST", body: { ...INSPECTION, vehicleId: 9 } })).status, 404);
  fakeBackend(() => "down");
  assert.equal((await send(inspPOST, undefined, { method: "POST", body: INSPECTION })).status, 503);
});

test("GET /api/inspections: admin only, token and status forwarded", async () => {
  fakeBackend(() => ({ data: [{ id: 1 }] }));
  assert.equal((await send(inspGET, undefined)).status, 401);
  assert.equal((await send(inspGET, CUSTOMER)).status, 403);
  assert.equal((await send(inspGET, NO_TOKEN_ADMIN)).status, 401);
  assert.equal(calls.length, 0);
  const res = await send(inspGET, ADMIN, { url: "https://example.test/api/inspections?status=SCHEDULED" });
  assert.deepEqual(await res.json(), { inspections: [{ id: 1 }] });
  assert.deepEqual([calls[0].path, calls[0].search, calls[0].auth], ["/inspections", "?status=SCHEDULED", "Bearer admin-token"]);
});

test("PATCH /api/inspections/[id]: admin only, id and body validated, forwarded", async () => {
  fakeBackend(() => ({ data: { id: 4 } }));
  assert.equal((await send(withId(inspPATCH, "4"), undefined, { method: "PATCH", body: {} })).status, 401);
  assert.equal((await send(withId(inspPATCH, "4"), CUSTOMER, { method: "PATCH", body: {} })).status, 403);
  assert.equal((await send(withId(inspPATCH, "../x"), ADMIN, { method: "PATCH", body: {} })).status, 400);
  assert.equal((await send(withId(inspPATCH, "4"), ADMIN, { method: "PATCH", body: { status: "DONE" } })).status, 400);
  assert.equal(calls.length, 0);

  assert.equal((await send(withId(inspPATCH, "4"), ADMIN, { method: "PATCH", body: { status: "SCHEDULED" } })).status, 200);
  assert.deepEqual([calls[0].method, calls[0].path, calls[0].auth], ["PATCH", "/inspections/4", "Bearer admin-token"]);

  fakeBackend(() => ({ status: 404, message: "Inspection not found." }));
  assert.equal((await send(withId(inspPATCH, "99"), ADMIN, { method: "PATCH", body: { notes: "x" } })).status, 404);
});

// ── insurance enquiries ────────────────────────────────────────────────────

test("POST /api/insurance: normalises the phone, drops empty optionals, needs consent, guests send no token", async () => {
  fakeBackend(() => ({ data: { id: 1 } }));
  assert.equal((await send(insPOST, undefined, { method: "POST", body: { ...ENQUIRY, phone: "12" } })).status, 400);
  // Consent is mandatory and cannot be defaulted or faked with a string.
  const { consent: _omit, ...noConsent } = ENQUIRY;
  void _omit;
  assert.equal((await send(insPOST, undefined, { method: "POST", body: noConsent })).status, 400);
  assert.equal((await send(insPOST, undefined, { method: "POST", body: { ...ENQUIRY, consent: false } })).status, 400);
  assert.equal((await send(insPOST, undefined, { method: "POST", body: { ...ENQUIRY, consent: "true" } })).status, 400);
  assert.equal(calls.length, 0);

  const res = await send(insPOST, undefined, { method: "POST", body: ENQUIRY });
  assert.equal(res.status, 201);
  assert.equal(calls[0].path, "/insurance-enquiries");
  assert.deepEqual(calls[0].body, { customerName: "Rahul", phone: "9876543210", coverType: "RENEWAL", consent: true });
  assert.equal(calls[0].auth, null);
});

test("POST /api/insurance: a backend outage is a 503, and a refusal passes through", async () => {
  fakeBackend(() => "down");
  assert.equal((await send(insPOST, undefined, { method: "POST", body: ENQUIRY })).status, 503);
  fakeBackend(() => ({ status: 404, message: "Vehicle not found." }));
  assert.equal((await send(insPOST, undefined, { method: "POST", body: { ...ENQUIRY, vehicleId: 3 } })).status, 404);
});

test("GET /api/insurance: admin only, keeps pagination meta", async () => {
  fakeBackend(() => ({ data: [{ id: 2 }] }));
  assert.equal((await send(insGET, undefined)).status, 401);
  assert.equal((await send(insGET, CUSTOMER)).status, 403);
  assert.equal((await send(insGET, NO_TOKEN_ADMIN)).status, 401);
  const res = await send(insGET, ADMIN);
  assert.deepEqual(await res.json(), { enquiries: [{ id: 2 }], meta: null });
  assert.equal(calls[0].path, "/insurance-enquiries");
  assert.equal(calls[0].auth, "Bearer admin-token");
});

test("GET and PATCH /api/insurance/[id]: admin only, id validated, 404 passes through", async () => {
  fakeBackend(() => ({ data: { id: 6 } }));
  assert.equal((await send(withId(insIdGET, "6"), undefined)).status, 401);
  assert.equal((await send(withId(insIdGET, "6"), CUSTOMER)).status, 403);
  assert.equal((await send(withId(insIdGET, "abc"), ADMIN)).status, 400);
  assert.equal((await send(withId(insIdPATCH, "6"), ADMIN, { method: "PATCH", body: { status: "LOST" } })).status, 400);
  // The old status vocabulary is gone.
  assert.equal((await send(withId(insIdPATCH, "6"), ADMIN, { method: "PATCH", body: { status: "NEW" } })).status, 400);
  assert.equal((await send(withId(insIdPATCH, "6"), ADMIN, { method: "PATCH", body: { status: "CONTACTED" } })).status, 400);
  assert.equal(calls.length, 0);

  assert.deepEqual(await (await send(withId(insIdGET, "6"), ADMIN)).json(), { data: { id: 6 } });
  assert.equal(calls[0].path, "/insurance-enquiries/6");
  assert.equal((await send(withId(insIdPATCH, "6"), ADMIN, { method: "PATCH", body: { status: "UNDER_REVIEW" } })).status, 200);
  assert.deepEqual([calls[1].method, calls[1].path, calls[1].body], ["PATCH", "/insurance-enquiries/6", { status: "UNDER_REVIEW" }]);

  fakeBackend(() => ({ status: 404, message: "Enquiry not found." }));
  assert.equal((await send(withId(insIdGET, "7"), ADMIN)).status, 404);
});
