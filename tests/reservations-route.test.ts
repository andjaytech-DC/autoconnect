import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { resetRateLimits } from "../app/lib/rate-limit";
import { GET, POST, DELETE } from "../app/api/reservations/route";
import type { NextResponse } from "next/server";

const asRes = <T extends NextResponse>(r: T | undefined): T => r!;

const CUSTOMER: SessionUser = {
  id: "7", username: "c", email: "c@x.test", name: "C", role: "CUSTOMER", token: "cust-token",
};

interface Call { method: string; path: string; auth: string | null; body: unknown }
const realFetch = globalThis.fetch;
let calls: Call[] = [];

function fakeBackend(respond: (c: Call) => { status?: number; data?: unknown; message?: string } | "down") {
  calls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const call: Call = {
      method: init?.method ?? "GET",
      path: url.pathname.replace(/^\/api/, ""),
      auth: new Headers(init?.headers).get("authorization"),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    const out = respond(call);
    if (out === "down") throw new TypeError("fetch failed");
    const status = out.status ?? 200;
    const payload = status >= 400 ? { message: out.message ?? "error" } : { success: true, data: out.data };
    return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

async function req(method: string, path: string, user?: SessionUser, body?: unknown) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (user) headers.cookie = `${SESSION_COOKIE}=${await signSession(user)}`;
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

test("reservations: a guest is turned away without touching the backend", async () => {
  fakeBackend(() => ({ data: {} }));
  const getRes = asRes(await GET(await req("GET", "/api/reservations")));
  const postRes = asRes(await POST(await req("POST", "/api/reservations", undefined, { vehicleId: 3 })));
  const delRes = asRes(await DELETE(await req("DELETE", "/api/reservations?id=1")));
  for (const res of [getRes, postRes, delRes]) {
    assert.equal(res.status, 401);
  }
  assert.equal(calls.length, 0);
});

test("reservations: POST forwards the token and only vehicleId/note", async () => {
  fakeBackend(() => ({ status: 201, data: { id: 5 } }));
  const res = asRes(await POST(
    await req("POST", "/api/reservations", CUSTOMER, { vehicleId: "3", userId: 999, status: "SOLD" }),
  ));
  assert.equal(res.status, 201);
  assert.ok(calls[0]);
  assert.equal(calls[0].path, "/reservations");
  assert.equal(calls[0].auth, "Bearer cust-token");
  assert.deepEqual(calls[0].body, { vehicleId: 3 });
});

test("reservations: invalid vehicle id is rejected before the backend", async () => {
  fakeBackend(() => ({ data: {} }));
  const res = asRes(await POST(await req("POST", "/api/reservations", CUSTOMER, { vehicleId: -1 })));
  assert.equal(res.status, 400);
  assert.equal(calls.length, 0);
});

test("reservations: a conflict from the backend reaches the customer unchanged", async () => {
  fakeBackend(() => ({ status: 409, message: "This vehicle is no longer available." }));
  const res = asRes(await POST(await req("POST", "/api/reservations", CUSTOMER, { vehicleId: 3 })));
  assert.equal(res.status, 409);
  assert.match(((await res.json()) as { error: string }).error, /no longer available/);
});

test("reservations: backend down is a 503", async () => {
  fakeBackend(() => "down");
  const res = asRes(await GET(await req("GET", "/api/reservations", CUSTOMER)));
  assert.equal(res.status, 503);
});

test("reservations: DELETE validates the id and cancels via the backend", async () => {
  fakeBackend(() => ({ data: {} }));
  const badDel = asRes(await DELETE(await req("DELETE", "/api/reservations?id=abc", CUSTOMER)));
  assert.equal(badDel.status, 400);
  assert.equal(calls.length, 0);
  const ok = asRes(await DELETE(await req("DELETE", "/api/reservations?id=4", CUSTOMER)));
  assert.equal(ok.status, 200);
  assert.ok(calls[0]);
  assert.deepEqual([calls[0].method, calls[0].path], ["DELETE", "/reservations/4"]);
});
