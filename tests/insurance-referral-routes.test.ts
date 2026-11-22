import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { resetRateLimits } from "../app/lib/rate-limit";
import { adminListQuery } from "../app/lib/insurance-query";
import { GET as insGET, POST as insPOST } from "../app/api/insurance/route";
import { POST as notePOST } from "../app/api/insurance/[id]/notes/route";
import { GET as mineGET } from "../app/api/insurance/mine/route";
import { GET as mineOneGET } from "../app/api/insurance/mine/[id]/route";
import { POST as followUpPOST } from "../app/api/insurance/mine/[id]/follow-up/route";
import { POST as respondPOST } from "../app/api/insurance/mine/[id]/respond/route";
import { POST as closePOST } from "../app/api/insurance/mine/[id]/close/route";
import { GET as partnersGET } from "../app/api/insurance/partners/route";
import { GET as reportGET } from "../app/api/insurance/report/route";
import { GET as exportGET } from "../app/api/insurance/export/route";
import { GET as adminPartnersGET, POST as adminPartnersPOST } from "../app/api/admin/insurance-partners/route";
import { PATCH as adminPartnerPATCH } from "../app/api/admin/insurance-partners/[id]/route";

/**
 * The insurance flow is a REFERRAL workflow: NestJS owns the rules and the data; the
 * BFF validates, gates and forwards. These tests pin the gates — who may call what, and
 * that the client can never supply an owner, a status, a partner or a quote.
 */

const u = (id: string, role: SessionUser["role"], token?: string): SessionUser => ({
  id, username: role, email: `${role}@x.test`, name: role, role, ...(token ? { token } : {}),
});
const ADMIN = u("1", "ADMIN", "admin-token");
const CUSTOMER = u("7", "CUSTOMER", "cust-token");
const NO_TOKEN_ADMIN = u("2", "ADMIN");

interface Call { method: string; path: string; search: string; auth: string | null; body: unknown }
type Out = { status?: number; data?: unknown; meta?: unknown; message?: string; text?: string } | "down";
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
    if (out.text !== undefined) return new Response(out.text, { status, headers: { "content-type": "text/csv" } });
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

const ENQ = { customerName: "Asha", phone: "98765 43210", coverType: "COMPREHENSIVE", consent: true };

// ───────────────────────── submitting an enquiry ─────────────────────────

test("enquiry POST: a signed-in visitor's TOKEN is forwarded; nothing in the body can name an owner, status, partner or quote", async () => {
  fakeBackend(() => ({ data: { id: 1, referenceNo: "INQ000001" } }));
  const res = await send(insPOST, CUSTOMER, {
    method: "POST",
    body: { ...ENQ, userId: 999, status: "ACCEPTED", partnerId: 5, quoteAmount: 1, referenceNo: "INQ999999" },
  });
  assert.equal(res.status, 201);
  assert.equal(calls[0].auth, "Bearer cust-token");
  const sent = calls[0].body as Record<string, unknown>;
  for (const forbidden of ["userId", "status", "partnerId", "quoteAmount", "referenceNo"]) {
    assert.ok(!(forbidden in sent), `${forbidden} must be stripped`);
  }
  assert.equal(sent.phone, "9876543210", "phone is normalised");
  assert.equal(sent.consent, true);
});

test("enquiry POST: structured vehicle fields are validated and blanks are dropped", async () => {
  fakeBackend(() => ({ data: { id: 1 } }));
  const ok = await send(insPOST, undefined, {
    method: "POST",
    body: {
      ...ENQ, email: "", city: " Pune ", registrationYear: "2019", vehicleId: "3",
      policyExpiry: "2026-12-31", existingInsurance: "EXPIRED", contactPreference: "WHATSAPP", hadClaim: true,
      vehicleMake: "Honda", message: "",
    },
  });
  assert.equal(ok.status, 201);
  const sent = calls[0].body as Record<string, unknown>;
  assert.equal(sent.city, "Pune");
  assert.equal(sent.registrationYear, 2019);
  assert.equal(sent.vehicleId, 3);
  assert.ok(!("email" in sent) && !("message" in sent), "empty optionals are dropped");

  for (const bad of [
    { coverType: "POLICY_ISSUED" },
    { existingInsurance: "MAYBE" },
    { contactPreference: "FAX" },
    { registrationYear: 1900 },
    { policyExpiry: "next week" },
    { email: "nope" },
  ]) {
    resetRateLimits();
    assert.equal((await send(insPOST, undefined, { method: "POST", body: { ...ENQ, ...bad } })).status, 400, JSON.stringify(bad));
  }
});

// ───────────────────────── customer tracking ─────────────────────────

test("my enquiries: sign-in required; list, detail, follow-up, respond and close all use the caller's token", async () => {
  fakeBackend(() => ({ data: [{ id: 1 }] }));
  assert.equal((await send(mineGET, undefined)).status, 401);
  assert.equal((await send(withId(mineOneGET, "1"), undefined)).status, 401);
  assert.equal((await send(withId(followUpPOST, "1"), undefined, { method: "POST", body: { message: "hi" } })).status, 401);
  assert.equal((await send(withId(respondPOST, "1"), undefined, { method: "POST", body: { decision: "ACCEPT" } })).status, 401);
  assert.equal((await send(withId(closePOST, "1"), undefined, { method: "POST" })).status, 401);
  assert.equal(calls.length, 0);

  assert.deepEqual(await (await send(mineGET, CUSTOMER)).json(), { enquiries: [{ id: 1 }] });
  assert.deepEqual([calls[0].path, calls[0].auth], ["/insurance-enquiries/mine", "Bearer cust-token"]);

  fakeBackend(() => ({ data: { id: 5, timeline: [] } }));
  assert.equal((await send(withId(mineOneGET, "5"), CUSTOMER)).status, 200);
  assert.deepEqual([calls[0].path, calls[0].auth], ["/insurance-enquiries/mine/5", "Bearer cust-token"]);

  fakeBackend(() => ({ data: {} }));
  assert.equal((await send(withId(followUpPOST, "5"), CUSTOMER, { method: "POST", body: { message: "please call" } })).status, 201);
  assert.deepEqual([calls[0].method, calls[0].path, calls[0].body], ["POST", "/insurance-enquiries/mine/5/follow-up", { message: "please call" }]);

  assert.equal((await send(withId(respondPOST, "5"), CUSTOMER, { method: "POST", body: { decision: "ACCEPT" } })).status, 200);
  assert.deepEqual([calls[1].method, calls[1].path, calls[1].body], ["PATCH", "/insurance-enquiries/mine/5/respond", { decision: "ACCEPT" }]);

  assert.equal((await send(withId(closePOST, "5"), CUSTOMER, { method: "POST" })).status, 200);
  assert.deepEqual([calls[2].method, calls[2].path], ["PATCH", "/insurance-enquiries/mine/5/close"]);
});

test("my enquiries: ids and bodies are validated; a foreign id surfaces as the backend's 404", async () => {
  fakeBackend(() => ({ data: {} }));
  for (const bad of ["../x", "1;drop", "0", "-3", "1.5"]) {
    assert.equal((await send(withId(mineOneGET, bad), CUSTOMER)).status, 400, bad);
    assert.equal((await send(withId(closePOST, bad), CUSTOMER, { method: "POST" })).status, 400, bad);
  }
  assert.equal((await send(withId(respondPOST, "5"), CUSTOMER, { method: "POST", body: { decision: "MAYBE" } })).status, 400);
  assert.equal((await send(withId(followUpPOST, "5"), CUSTOMER, { method: "POST", body: { message: "" } })).status, 400);
  assert.equal((await send(withId(followUpPOST, "5"), CUSTOMER, { method: "POST", body: { message: "x".repeat(501) } })).status, 400);
  assert.equal(calls.length, 0, "nothing invalid reaches NestJS");

  fakeBackend(() => ({ status: 404, message: "Enquiry not found." }));
  assert.equal((await send(withId(mineOneGET, "9"), CUSTOMER)).status, 404);
  assert.equal((await send(withId(respondPOST, "9"), CUSTOMER, { method: "POST", body: { decision: "DECLINE" } })).status, 404);
  fakeBackend(() => ({ status: 400, message: "There is no quote to respond to yet." }));
  const refused = await send(withId(respondPOST, "9"), CUSTOMER, { method: "POST", body: { decision: "ACCEPT" } });
  assert.equal(refused.status, 400);
  assert.match(JSON.stringify(await refused.json()), /no quote to respond to/);
});

test("follow-up is rate limited", async () => {
  fakeBackend(() => ({ data: {} }));
  for (let i = 0; i < 6; i++) await send(withId(followUpPOST, "5"), CUSTOMER, { method: "POST", body: { message: "hi" } });
  assert.equal((await send(withId(followUpPOST, "5"), CUSTOMER, { method: "POST", body: { message: "hi" } })).status, 429);
});

// ───────────────────────── partners (public + admin) ─────────────────────────

test("public partners: no token sent, rate limited, and no invented list when empty or down", async () => {
  fakeBackend(() => ({ data: [{ id: 1, name: "Acme", licenceNote: "Reg. 123" }] }));
  assert.deepEqual(await (await send(partnersGET, undefined)).json(), { partners: [{ id: 1, name: "Acme", licenceNote: "Reg. 123" }] });
  assert.deepEqual([calls[0].path, calls[0].auth], ["/insurance-partners", null]);

  fakeBackend(() => ({ data: [] }));
  assert.deepEqual(await (await send(partnersGET, undefined)).json(), { partners: [] });
  fakeBackend(() => "down");
  assert.equal((await send(partnersGET, undefined)).status, 503);

  fakeBackend(() => ({ data: [] }));
  for (let i = 0; i < 60; i++) await send(partnersGET, undefined);
  assert.equal((await send(partnersGET, undefined)).status, 429);
});

test("admin partners: admin only, validated, and the licence note is passed through verbatim", async () => {
  fakeBackend(() => ({ data: [{ id: 1, openEnquiries: 2 }] }));
  assert.equal((await send(adminPartnersGET, undefined)).status, 401);
  assert.equal((await send(adminPartnersGET, CUSTOMER)).status, 403);
  assert.equal(calls.length, 0);
  assert.deepEqual(await (await send(adminPartnersGET, ADMIN)).json(), { partners: [{ id: 1, openEnquiries: 2 }] });
  assert.equal(calls[0].path, "/insurance-partners/admin");

  const P = { name: "Acme", phone: "011-2345678", products: ["COMPREHENSIVE"], licenceNote: "IRDAI-registered broker, reg. no. TEST-1" };
  const post = (body: unknown, who: SessionUser | undefined = ADMIN) => send(adminPartnersPOST, who, { method: "POST", body });
  assert.equal((await post(P, CUSTOMER)).status, 403);
  for (const bad of [
    { products: [] }, { products: ["LIFE"] }, { phone: "abc" }, { email: "nope" },
    { website: "javascript:alert(1)" }, { website: "acme.test" }, { status: "DELETED" },
  ]) {
    assert.equal((await post({ ...P, ...bad })).status, 400, JSON.stringify(bad));
  }
  assert.equal(calls.length, 1, "only the GET reached the backend");

  fakeBackend(() => ({ data: { id: 5 } }));
  assert.equal((await post({ ...P, website: "https://acme.test", email: "" })).status, 201);
  const sent = calls[0].body as Record<string, unknown>;
  assert.equal(sent.licenceNote, "IRDAI-registered broker, reg. no. TEST-1", "licence text is the admin's, untouched");
  assert.ok(!("email" in sent), "an empty email is dropped");

  const patch = (id: string, body: unknown, who: SessionUser | undefined = ADMIN) =>
    send(withId(adminPartnerPATCH, id), who, { method: "PATCH", body });
  assert.equal((await patch("5", { status: "INACTIVE" }, CUSTOMER)).status, 403);
  assert.equal((await patch("../x", { status: "INACTIVE" })).status, 400);
  assert.equal((await patch("5", { status: "GONE" })).status, 400);
  assert.equal((await patch("5", { status: "INACTIVE" })).status, 200);
  const last = calls[calls.length - 1];
  assert.deepEqual([last.method, last.path, last.body], ["PATCH", "/insurance-partners/5", { status: "INACTIVE" }]);
});

// ───────────────────────── admin: queue, notes, report, export ─────────────────────────

test("admin list: forwards only whitelisted filters and keeps the pagination meta", async () => {
  fakeBackend(() => ({ data: [{ id: 1 }], meta: { total: 1, counts: { SUBMITTED: 1 }, followUps: 0 } }));
  const res = await send(insGET, ADMIN, {
    url: "https://example.test/api/insurance?status=QUOTE_RECEIVED&coverType=RENEWAL&partnerId=2&followUp=true&q=%20inq12%20&page=2&limit=500&evil=1",
  });
  assert.deepEqual(await res.json(), { enquiries: [{ id: 1 }], meta: { total: 1, counts: { SUBMITTED: 1 }, followUps: 0 } });
  assert.deepEqual(Object.fromEntries(new URLSearchParams(calls[0].search)), {
    status: "QUOTE_RECEIVED", coverType: "RENEWAL", partnerId: "2", followUp: "true", q: "inq12", page: "2", limit: "100",
  });
  // Junk is dropped, never forwarded.
  assert.equal(adminListQuery(new URLSearchParams("status=NEW&coverType=LIFE&partnerId=x;y&page=-1&followUp=yes")).toString(), "");
});

test("admin PATCH: status, partner or quote — and the workflow's own refusal reaches the admin", async () => {
  const patchOne = (body: unknown) => send(withId(insIdPatch, "6"), ADMIN, { method: "PATCH", body });
  fakeBackend(() => ({ data: { id: 6 } }));
  assert.equal((await patchOne({})).status, 400, "nothing to change");
  assert.equal((await patchOne({ quoteAmount: -5 })).status, 400);
  assert.equal((await patchOne({ quoteAmount: 99_999_999 })).status, 400);
  assert.equal((await patchOne({ partnerId: 0 })).status, 400);
  assert.equal(calls.length, 0);

  assert.equal((await patchOne({ partnerId: "5", status: "PARTNER_ASSIGNED" })).status, 200);
  assert.deepEqual(calls[0].body, { partnerId: 5, status: "PARTNER_ASSIGNED" });
  assert.equal((await patchOne({ quoteAmount: "15000.5", quoteNotes: " 1 year ", status: "QUOTE_RECEIVED" })).status, 200);
  assert.deepEqual(calls[1].body, { quoteAmount: 15000.5, quoteNotes: "1 year", status: "QUOTE_RECEIVED" });

  fakeBackend(() => ({ status: 400, message: "An enquiry that is SUBMITTED can only move to: UNDER_REVIEW, CLOSED." }));
  const refused = await patchOne({ status: "QUOTE_RECEIVED" });
  assert.equal(refused.status, 400);
  assert.match(JSON.stringify(await refused.json()), /can only move to/);
});

test("admin notes: admin only, validated", async () => {
  fakeBackend(() => ({ data: {} }));
  // null = anonymous (a default parameter would turn undefined into the admin).
  const note = (id: string, body: unknown, who: SessionUser | null = ADMIN) =>
    send(withId(notePOST, id), who ?? undefined, { method: "POST", body });
  assert.equal((await note("6", { note: "x" }, null)).status, 401);
  assert.equal((await note("6", { note: "x" }, CUSTOMER)).status, 403);
  assert.equal((await note("6", { note: "x" }, NO_TOKEN_ADMIN)).status, 401);
  assert.equal((await note("../x", { note: "x" })).status, 400);
  assert.equal((await note("6", { note: "" })).status, 400);
  assert.equal((await note("6", { note: "y".repeat(1001) })).status, 400);
  assert.equal(calls.length, 0);
  assert.equal((await note("6", { note: " called, no answer " })).status, 201);
  assert.deepEqual([calls[0].method, calls[0].path, calls[0].body], ["POST", "/insurance-enquiries/6/notes", { note: "called, no answer" }]);
});

test("report and export: admin only; export is a no-store CSV download with only valid filters", async () => {
  fakeBackend(() => ({ data: { total: 3 } }));
  assert.equal((await send(reportGET, undefined)).status, 401);
  assert.equal((await send(reportGET, CUSTOMER)).status, 403);
  assert.deepEqual(await (await send(reportGET, ADMIN)).json(), { report: { total: 3 } });
  assert.equal(calls[0].path, "/insurance-enquiries/report");

  fakeBackend(() => ({ text: "﻿Reference,Status\r\nINQ000001,Submitted\r\n" }));
  assert.equal((await send(exportGET, undefined)).status, 401);
  assert.equal((await send(exportGET, CUSTOMER)).status, 403);
  assert.equal((await send(exportGET, NO_TOKEN_ADMIN)).status, 401);
  assert.equal(calls.length, 0, "personal data is never fetched for a non-admin");

  const res = await send(exportGET, ADMIN, { url: "https://example.test/api/insurance/export?status=SUBMITTED&page=3&limit=5&evil=1" });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /text\/csv/);
  assert.match(res.headers.get("content-disposition") ?? "", /attachment/);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  // Response.text() strips a leading BOM by spec, so check the raw bytes: Excel needs it for UTF-8.
  const bytes = new Uint8Array(await res.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], "UTF-8 BOM preserved");
  assert.equal(new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes), "﻿Reference,Status\r\nINQ000001,Submitted\r\n");
  assert.equal(calls[0].path, "/insurance-enquiries/export");
  assert.equal(calls[0].auth, "Bearer admin-token");
  assert.equal(calls[0].search, "?status=SUBMITTED", "pagination and junk are not forwarded to an export");

  fakeBackend(() => "down");
  assert.equal((await send(exportGET, ADMIN)).status, 503);
});

import { PATCH as insIdPatch } from "../app/api/insurance/[id]/route";
