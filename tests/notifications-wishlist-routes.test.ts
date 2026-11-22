import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { resetRateLimits } from "../app/lib/rate-limit";
import { GET as notificationsGET, PATCH as notificationsPATCH } from "../app/api/notifications/route";
import { GET as wishlistGET, POST as wishlistPOST, DELETE as wishlistDELETE } from "../app/api/wishlist/route";

/** Notifications and the wishlist are NestJS-owned; the BFF has no local copy to fall back to. */

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


const NOTES = [
  { id: 2, title: "B", body: "second", type: "LEAD", isRead: false, createdAt: "2026-02-01" },
  { id: 1, title: "A", body: "first", type: "LEAD", isRead: true, createdAt: "2026-01-01" },
];

test("notifications GET: 401 anonymous or tokenless; maps rows, filters unread, pages", async () => {
  fakeBackend(() => ({ data: NOTES }));
  assert.equal((await send(notificationsGET, undefined)).status, 401);
  assert.equal((await send(notificationsGET, NO_TOKEN_ADMIN)).status, 401);
  assert.equal(calls.length, 0);

  const all = await (await send(notificationsGET, CUSTOMER)).json();
  assert.equal(calls[0].auth, "Bearer cust-token");
  assert.equal(all.notifications.length, 2);
  assert.equal(all.unreadCount, 1);
  assert.equal(all.notifications[0].message, "second");
  assert.equal(all.notifications[0].deliveries[0].channel, "IN_APP");

  const unread = await (await send(notificationsGET, CUSTOMER, { url: "https://example.test/api/notifications?unread=1" })).json();
  assert.deepEqual(unread.notifications.map((n: { id: string }) => n.id), ["2"]);
  const page = await (await send(notificationsGET, CUSTOMER, { url: "https://example.test/api/notifications?limit=1&skip=1" })).json();
  assert.deepEqual(page.notifications.map((n: { id: string }) => n.id), ["1"]);
});

test("notifications GET: outage is 503 — there is no local fallback", async () => {
  fakeBackend(() => "down");
  assert.equal((await send(notificationsGET, CUSTOMER)).status, 503);
});

test("notifications PATCH: one id or all; the id is validated; 404 is kept", async () => {
  fakeBackend(() => ({ data: {} }));
  assert.equal((await send(notificationsPATCH, undefined, { method: "PATCH" })).status, 401);
  assert.equal((await send(notificationsPATCH, CUSTOMER, { method: "PATCH", body: { id: "../x" } })).status, 400);
  assert.equal(calls.length, 0);

  await send(notificationsPATCH, CUSTOMER, { method: "PATCH", body: { id: "7" } });
  assert.equal(calls[0].path, "/notifications/7/read");
  assert.equal(calls[0].method, "PATCH");
  await send(notificationsPATCH, CUSTOMER, { method: "PATCH" });
  assert.equal(calls[1].path, "/notifications/read-all");

  fakeBackend(() => ({ status: 404, message: "Notification not found." }));
  const nf = await send(notificationsPATCH, CUSTOMER, { method: "PATCH", body: { id: "9" } });
  assert.equal(nf.status, 404);
  assert.equal((await nf.json()).error, "Notification not found");
});

test("wishlist: every verb needs a signed-in session with a backend token", async () => {
  fakeBackend(() => ({ data: [] }));
  for (const [h, init] of [
    [wishlistGET, {}],
    [wishlistPOST, { method: "POST", body: { carId: 1 } }],
    [wishlistDELETE, { method: "DELETE", url: "https://example.test/api/wishlist?carId=1" }],
  ] as const) {
    assert.equal((await send(h, undefined, init)).status, 401);
    assert.equal((await send(h, NO_TOKEN_ADMIN, init)).status, 401);
  }
  assert.equal(calls.length, 0);
});

test("wishlist GET and POST: rows are mapped; a duplicate (409) is a success; other refusals are shown", async () => {
  fakeBackend(() => ({ data: [{ id: 3, vehicleId: 12, createdAt: "2026-01-01" }] }));
  assert.deepEqual((await (await send(wishlistGET, CUSTOMER)).json()).items, [{ id: "3", carId: 12, addedAt: "2026-01-01" }]);
  assert.equal(calls[0].auth, "Bearer cust-token");

  fakeBackend(() => ({ data: { id: 4, vehicleId: 12, createdAt: "2026-01-02" } }));
  const added = await send(wishlistPOST, CUSTOMER, { method: "POST", body: { carId: 12 } });
  assert.equal(added.status, 201);
  assert.deepEqual(calls[0].body, { vehicleId: 12 });

  fakeBackend(() => ({ status: 409, message: "Vehicle already in wishlist." }));
  const dup = await send(wishlistPOST, CUSTOMER, { method: "POST", body: { carId: 12 } });
  assert.equal(dup.status, 200);
  assert.equal((await dup.json()).alreadySaved, true);

  fakeBackend(() => ({ status: 400, message: "Dealers cannot add their own vehicles to wishlist." }));
  const own = await send(wishlistPOST, CUSTOMER, { method: "POST", body: { carId: 12 } });
  assert.equal(own.status, 400, "a real refusal must not be disguised as already-saved");

  assert.equal((await send(wishlistPOST, CUSTOMER, { method: "POST", body: { carId: "x" } })).status, 400);
  assert.equal((await send(wishlistPOST, CUSTOMER, { method: "POST", body: "{nope" })).status, 400);
});

test("wishlist DELETE: validates carId, removing something absent is fine, outage is 503", async () => {
  const del = (carId: string) => send(wishlistDELETE, CUSTOMER, { method: "DELETE", url: `https://example.test/api/wishlist?carId=${carId}` });
  fakeBackend(() => ({ data: {} }));
  for (const bad of ["abc", "0", "-3", "1.5"]) assert.equal((await del(bad)).status, 400, bad);
  assert.equal(calls.length, 0);

  assert.deepEqual(await (await del("12")).json(), { removed: true, source: "backend" });
  assert.equal(calls[0].path, "/wishlist/vehicle/12");

  fakeBackend(() => ({ status: 404, message: "Wishlist item not found." }));
  assert.deepEqual(await (await del("12")).json(), { removed: false, source: "backend" });
  fakeBackend(() => "down");
  assert.equal((await del("12")).status, 503);
});
