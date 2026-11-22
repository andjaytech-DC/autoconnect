import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { resetRateLimits } from "../app/lib/rate-limit";
import { GET as financeGET } from "../app/api/admin/finance/route";
import { GET as usersGET } from "../app/api/admin/users/route";
import { PATCH as userPATCH } from "../app/api/admin/users/[id]/route";
import { PATCH as rolePATCH } from "../app/api/admin/users/[id]/assign-role/route";
import { GET as reportsGET } from "../app/api/admin/reports/route";
import { GET as settingsGET, POST as settingsPOST } from "../app/api/admin/settings/route";
import { GET as locationsGET } from "../app/api/admin/locations/route";
import { GET as imagesGET } from "../app/api/admin/images/route";

/** Admin tool routes: ADMIN session -> one NestJS call with the bearer token -> reshape. No local data. */

const u = (id: string, role: SessionUser["role"], token?: string): SessionUser => ({
  id, username: role, email: `${role}@x.test`, name: role, role, ...(token ? { token } : {}),
});
const ADMIN = u("1", "ADMIN", "admin-token");
const DEALER = u("5", "DEALER", "dealer-token");
const NO_TOKEN_ADMIN = u("2", "ADMIN");

interface Call { method: string; path: string; auth: string | null; body: unknown }
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
  init: { method?: string; body?: unknown } = {},
): Promise<Response> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (who) headers.cookie = `${SESSION_COOKIE}=${await signSession(who)}`;
  return handler(new Request("https://example.test/api/admin/x", {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
  }));
}
const withId = (h: (r: Request, c: { params: Promise<{ id: string }> }) => Promise<Response>, id: string) =>
  (r: Request) => h(r, { params: Promise.resolve({ id }) });

test("every admin tool route: 401 anonymous, 403 non-admin, 401 when the session has no token; backend never called", async () => {
  fakeBackend(() => ({ data: [] }));
  const handlers = [financeGET, usersGET, reportsGET, settingsGET, locationsGET, imagesGET];
  for (const h of handlers) {
    assert.equal((await send(h, undefined)).status, 401);
    assert.equal((await send(h, DEALER)).status, 403);
    assert.equal((await send(h, NO_TOKEN_ADMIN)).status, 401);
  }
  assert.equal((await send(settingsPOST, DEALER, { method: "POST", body: { key: "a", value: "b" } })).status, 403);
  assert.equal(calls.length, 0);
});

test("list routes forward the admin token and keep the shapes the screens read", async () => {
  fakeBackend((c) => {
    if (c.path === "/admin/finance") return { data: [{ id: 1, status: "APPROVED" }] };
    if (c.path === "/admin/users") return { data: [{ id: 2, email: "a@x.test" }] };
    if (c.path === "/admin/reports") return { data: { stats: { totalVehicles: 3 } } };
    if (c.path === "/admin/settings") return { data: [{ key: "k", value: "v" }] };
    if (c.path === "/admin/images") return { data: [{ id: "1-0", url: "/uploads/a.jpg", vehicleId: 1 }] };
    return { data: [] };
  });
  assert.deepEqual(await (await send(financeGET, ADMIN)).json(), { finance: [{ id: 1, status: "APPROVED" }] });
  assert.deepEqual(await (await send(usersGET, ADMIN)).json(), { users: [{ id: 2, email: "a@x.test" }] });
  assert.deepEqual(await (await send(reportsGET, ADMIN)).json(), { stats: { totalVehicles: 3 } });
  assert.deepEqual(await (await send(settingsGET, ADMIN)).json(), { settings: [{ key: "k", value: "v" }] });
  assert.equal((await (await send(imagesGET, ADMIN)).json()).images[0].url, "/uploads/a.jpg");
  assert.ok(calls.every((c) => c.auth === "Bearer admin-token"));
});

test("locations: a dealership is an active location only when APPROVED", async () => {
  fakeBackend(() => ({
    data: [
      { id: 1, businessName: "A", city: "Pune", state: "MH", pincode: "411001", status: "APPROVED" },
      { id: 2, businessName: "B", city: "Goa", state: "GA", pincode: "403001", status: "PENDING" },
    ],
  }));
  const { locations } = await (await send(locationsGET, ADMIN)).json();
  assert.deepEqual(locations.map((l: { active: boolean }) => l.active), [true, false]);
  assert.equal(locations[0].name, "A");
});

test("users PATCH refuses role/password and bad ids; assign-role validates the role", async () => {
  fakeBackend(() => ({ data: { id: 3 } }));
  for (const field of ["role", "password", "refreshToken"]) {
    const r = await send(withId(userPATCH, "3"), ADMIN, { method: "PATCH", body: { [field]: "x", isActive: false } });
    assert.equal(r.status, 400, field);
  }
  assert.equal((await send(withId(userPATCH, "abc"), ADMIN, { method: "PATCH", body: { isActive: false } })).status, 400);
  assert.equal(calls.length, 0);

  const ok = await send(withId(userPATCH, "3"), ADMIN, { method: "PATCH", body: { isActive: false } });
  assert.equal(ok.status, 200);
  assert.deepEqual(calls[0], { method: "PATCH", path: "/admin/users/3", auth: "Bearer admin-token", body: { isActive: false } });

  assert.equal((await send(withId(rolePATCH, "3"), ADMIN, { method: "PATCH", body: { role: "ROOT" } })).status, 400);
  assert.equal((await send(withId(rolePATCH, "3"), DEALER, { method: "PATCH", body: { role: "ADMIN" } })).status, 403);
  const granted = await send(withId(rolePATCH, "3"), ADMIN, { method: "PATCH", body: { role: "DEALER", extra: 1 } });
  assert.equal(granted.status, 200);
  assert.deepEqual(calls[1], { method: "PATCH", path: "/users/3/assign-role", auth: "Bearer admin-token", body: { role: "DEALER" } });
});

test("settings POST validates, then forwards only key and value", async () => {
  fakeBackend(() => ({ data: { key: "k", value: "v" } }));
  assert.equal((await send(settingsPOST, ADMIN, { method: "POST", body: { key: "", value: "v" } })).status, 400);
  assert.equal((await send(settingsPOST, ADMIN, { method: "POST", body: { key: "k", value: 5 } })).status, 400);
  assert.equal((await send(settingsPOST, ADMIN, { method: "POST", body: "{bad" })).status, 400);
  assert.equal(calls.length, 0);
  const r = await send(settingsPOST, ADMIN, { method: "POST", body: { key: "k", value: "v", extra: true } });
  assert.deepEqual(await r.json(), { setting: { key: "k", value: "v" } });
  assert.deepEqual(calls[0].body, { key: "k", value: "v" });
});

test("backend failures are not disguised: down -> 503, 5xx -> 502 generic, 4xx passes through", async () => {
  fakeBackend(() => "down");
  assert.equal((await send(financeGET, ADMIN)).status, 503);
  fakeBackend(() => ({ status: 500, message: "prisma exploded at line 9" }));
  const r = await send(usersGET, ADMIN);
  assert.equal(r.status, 502);
  assert.ok(!JSON.stringify(await r.json()).includes("prisma"));
  fakeBackend(() => ({ status: 403, message: "Forbidden resource" }));
  const f = await send(reportsGET, ADMIN);
  assert.equal(f.status, 403);
});
