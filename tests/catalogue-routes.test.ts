import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { resetRateLimits } from "../app/lib/rate-limit";
import { GET as brandsGET } from "../app/api/brands/route";
import { GET as categoriesGET } from "../app/api/categories/route";
import { GET as marketplaceGET } from "../app/api/marketplace/route";
import { GET as newCarsGET } from "../app/api/new-cars/route";
import { GET as dealersGET } from "../app/api/dealers/route";
import { GET as dealerGET } from "../app/api/dealers/[id]/route";
import { GET as lookupsGET } from "../app/api/admin/lookups/route";
import { GET as statsGET } from "../app/api/admin/stats/route";
import { GET as adminCarsGET, POST as adminCarsPOST } from "../app/api/admin/new-cars/route";
import {
  GET as adminCarGET,
  PATCH as adminCarPATCH,
  DELETE as adminCarDELETE,
} from "../app/api/admin/new-cars/[id]/route";

/** Catalogue routes are thin: NestJS owns the data, the BFF shapes and gates it. */

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

test("brands and categories map NestJS rows and report outages as 503", async () => {
  fakeBackend((c) =>
    c.path === "/vehicles/popular-brands"
      ? { data: [{ id: 1, name: "Tata", logo: null, vehicleCount: 4 }] }
      : { data: [{ id: 3, name: "SUV", slug: "suv", _count: { vehicles: 2 } }] },
  );
  const brands = await (await send(brandsGET, undefined)).json();
  assert.deepEqual(brands.brands, [{ id: 1, name: "Tata", logo: null, country: null, isActive: true, vehicleCount: 4 }]);
  const cats = await (await send(categoriesGET, undefined)).json();
  assert.equal(cats.categories[0].vehicleCount, 2);

  fakeBackend(() => "down");
  assert.equal((await send(brandsGET, undefined)).status, 503);
  assert.equal((await send(categoriesGET, undefined)).status, 503);
});

test("marketplace and new-cars forward only known filters", async () => {
  fakeBackend((c) => ({ data: c.path === "/new-cars" ? { cars: [{ id: 1 }], brands: ["Tata"] } : [{ id: 9 }] }));
  const m = await send(marketplaceGET, undefined, { url: "https://example.test/api/marketplace?category=tyres&x=1" });
  assert.deepEqual(await m.json(), { products: [{ id: 9 }] });
  assert.equal(calls[0].search, "?category=tyres");

  const n = await send(newCarsGET, undefined, { url: "https://example.test/api/new-cars?brand=Tata&electric=true&x=1" });
  assert.deepEqual(await n.json(), { cars: [{ id: 1 }], brands: ["Tata"] });
  assert.equal(calls[1].search, "?brand=Tata&electric=true");

  fakeBackend(() => "down");
  assert.equal((await send(newCarsGET, undefined)).status, 503);
  assert.equal((await send(marketplaceGET, undefined)).status, 503);
});

const DEALER = { id: 5, businessName: "Prime Motors", phone: "98765", city: "Pune", state: "MH", isVerified: true, _count: { vehicles: 3 } };

test("dealers: guests see no phone, signed-in callers do; the token is forwarded", async () => {
  fakeBackend((c) => ({ data: [{ ...DEALER, phone: c.auth ? DEALER.phone : null }] }));
  const anon = await (await send(dealersGET, undefined)).json();
  assert.equal(anon.dealers[0].phone, null);
  assert.equal(anon.dealers[0].carsAvailable, 3);
  assert.equal(anon.contactAvailable, false);
  assert.equal(calls[0].auth, null);

  const signed = await (await send(dealersGET, CUSTOMER)).json();
  assert.equal(signed.dealers[0].phone, "98765");
  assert.equal(calls[1].auth, "Bearer cust-token");
  assert.equal(signed.contactAvailable, true);
});

test("dealers: city/q/featured filters apply; outage is 503 with no fixture fallback", async () => {
  fakeBackend(() => ({ data: [DEALER, { ...DEALER, id: 6, businessName: "Other", city: "Delhi", isVerified: false }] }));
  const r = await (await send(dealersGET, undefined, { url: "https://example.test/api/dealers?city=pune" })).json();
  assert.equal(r.total, 1);
  const f = await (await send(dealersGET, undefined, { url: "https://example.test/api/dealers?featured=true" })).json();
  assert.equal(f.dealers[0].id, 5);
  fakeBackend(() => "down");
  assert.equal((await send(dealersGET, undefined)).status, 503);
});

test("dealers/[id]: validates id, maps 404, forwards token", async () => {
  fakeBackend(() => ({ data: DEALER }));
  for (const bad of ["abc", "0", "../admin", "1e3"]) {
    assert.equal((await send(withId(dealerGET, bad), undefined)).status, 400, bad);
  }
  assert.equal(calls.length, 0);

  const ok = await send(withId(dealerGET, "5"), CUSTOMER);
  assert.equal((await ok.json()).dealer.phone, "98765");
  assert.equal(calls[0].path, "/dealers/5");
  assert.equal(calls[0].auth, "Bearer cust-token");

  fakeBackend(() => ({ status: 404, message: "nope" }));
  const nf = await send(withId(dealerGET, "5"), undefined);
  assert.equal(nf.status, 404);
  assert.equal((await nf.json()).error, "Dealer not found");
});

test("admin lookups/stats: admin only, token required, shaped from NestJS", async () => {
  fakeBackend((c) =>
    c.path === "/admin/lookups"
      ? { data: { brands: [{ id: 1, name: "Tata" }], categories: [{ id: 2, name: "SUV", slug: "suv" }],
          dealers: [{ id: 5, businessName: "A", city: "Pune", state: "MH", status: "APPROVED" },
                    { id: 6, businessName: "B", city: "X", state: "Y", status: "REJECTED" }] } }
      : { data: { totalUsers: 3, pendingDealers: 2 } },
  );
  for (const h of [lookupsGET, statsGET]) {
    assert.equal((await send(h, undefined)).status, 401);
    assert.equal((await send(h, CUSTOMER)).status, 403);
    assert.equal((await send(h, NO_TOKEN_ADMIN)).status, 401);
  }
  assert.equal(calls.length, 0);

  const l = await (await send(lookupsGET, ADMIN)).json();
  assert.deepEqual(l.brands, [{ id: 1, name: "Tata", country: null }]);
  assert.deepEqual(l.dealers, [{ id: 5, name: "A", city: "Pune", state: "MH", status: "APPROVED" }]);
  assert.equal(calls[0].auth, "Bearer admin-token");

  const s = await (await send(statsGET, ADMIN)).json();
  assert.equal(s.stats.pendingDealers, 2);

  fakeBackend(() => "down");
  assert.equal((await send(statsGET, ADMIN)).status, 503);
});

const CAR = { brandName: "Tata", model: "Nexon", exShowroomPrice: 900000, fuel: "Petrol", transmission: "Manual" };

test("admin new-cars: gated, validated, forwarded with the admin token", async () => {
  fakeBackend(() => ({ data: { id: 1 } }));
  assert.equal((await send(adminCarsGET, undefined)).status, 401);
  assert.equal((await send(adminCarsPOST, CUSTOMER, { method: "POST", body: CAR })).status, 403);
  assert.equal((await send(adminCarsPOST, NO_TOKEN_ADMIN, { method: "POST", body: CAR })).status, 401);
  assert.equal((await send(adminCarsPOST, ADMIN, { method: "POST", body: { ...CAR, exShowroomPrice: -1 } })).status, 400);
  assert.equal((await send(adminCarsPOST, ADMIN, { method: "POST", body: "{nope" })).status, 400);
  assert.equal(calls.length, 0);

  const created = await send(adminCarsPOST, ADMIN, { method: "POST", body: CAR });
  assert.equal(created.status, 201);
  assert.deepEqual(calls[0].body, CAR);
  assert.equal(calls[0].auth, "Bearer admin-token");

  fakeBackend(() => ({ data: { cars: [{ id: 1 }] } }));
  const list = await send(adminCarsGET, ADMIN, { url: "https://example.test/api/admin/new-cars?brand=Tata&electric=false&x=1" });
  assert.deepEqual(await list.json(), { cars: [{ id: 1 }] });
  assert.equal(calls[0].search, "?brand=Tata&electric=false");
});

test("admin new-cars: duplicate slug (409) and outage surface correctly", async () => {
  fakeBackend(() => ({ status: 409, message: "Slug exists" }));
  assert.equal((await send(adminCarsPOST, ADMIN, { method: "POST", body: CAR })).status, 409);
  fakeBackend(() => "down");
  assert.equal((await send(adminCarsPOST, ADMIN, { method: "POST", body: CAR })).status, 503);
});

test("admin new-cars/[id]: bare integer ids only; GET/PATCH/DELETE forward to NestJS", async () => {
  fakeBackend(() => ({ data: { id: 4 } }));
  for (const bad of ["abc", "0", "../x", "4/../5"]) {
    assert.equal((await send(withId(adminCarGET, bad), ADMIN)).status, 400, bad);
  }
  assert.equal((await send(withId(adminCarGET, "4"), undefined)).status, 401);
  assert.equal((await send(withId(adminCarDELETE, "4"), CUSTOMER)).status, 403);
  assert.equal(calls.length, 0);

  assert.deepEqual(await (await send(withId(adminCarGET, "4"), ADMIN)).json(), { data: { id: 4 } });
  assert.equal(calls[0].path, "/new-cars/4");

  const p = await send(withId(adminCarPATCH, "4"), ADMIN, { method: "PATCH", body: { model: "Punch" } });
  assert.equal(p.status, 200);
  assert.deepEqual(calls[1].body, { model: "Punch" });
  assert.equal((await send(withId(adminCarPATCH, "4"), ADMIN, { method: "PATCH", body: { fuel: 5 } })).status, 400);

  const d = await send(withId(adminCarDELETE, "4"), ADMIN, { method: "DELETE" });
  assert.deepEqual(await d.json(), { ok: true });
  assert.equal(calls[2].method, "DELETE");

  fakeBackend(() => ({ status: 404, message: "gone" }));
  assert.equal((await send(withId(adminCarGET, "9"), ADMIN)).status, 404);
});
