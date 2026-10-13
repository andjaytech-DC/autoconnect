import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { resetRateLimits } from "../app/lib/rate-limit";
import { prisma } from "../app/server/prisma";
import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { loadCustomerPortalData } from "../app/server/customer-portal";

/**
 * Sprint 1 — tenant isolation and customer privacy.
 *
 * Every fixture lives in a private id range and is created and removed by this
 * file, so the suite never reads or writes real data. The assertions cover the
 * three ways one tenant could previously reach another's records:
 *
 *   1. a customer-scoped read with no owner in the WHERE clause (the portal
 *      counted the whole TestDrive and FinanceApplication tables);
 *   2. `TestDrive` having no owner column at all, so an authenticated applicant
 *      was never associated with the request they created;
 *   3. `dealerId` taken from the request body, letting one dealership move
 *      another's inventory between tenants.
 */

// Point the BFF at an address nothing can be listening on, so the route's
// "backend unreachable" fallback is deterministic instead of depending on
// whether a NestJS instance happens to be running. `BACKEND_URL` is resolved at
// module load, so the environment is set before the dynamic imports in `before`
// below. (Top-level await is unavailable under the test runner's CJS output.)
let testDrivesPOST: (request: Request) => Promise<Response>;
let vehiclesPOST: (request: Request) => Promise<Response>;
let vehiclePATCH: (
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) => Promise<Response>;

const CUSTOMER_X = 9_100_001;
const CUSTOMER_Y = 9_100_002;
const OWNER_A = 9_100_011;
const OWNER_B = 9_100_012;
const DEALER_A = 9_100_101;
const DEALER_B = 9_100_102;
const BRAND_ID = 9_100_201;
const CATEGORY_ID = 9_100_202;
const VEHICLE_A = 9_100_301;
const VEHICLE_B = 9_100_302;

const sessions = new Map<number, string>();

function sessionFor(id: number, role: SessionUser["role"]): SessionUser {
  return {
    id: String(id),
    username: `tenant-${id}`,
    email: `tenant-${id}@example.test`,
    name: "Tenant Test",
    role,
  };
}

function asUser(id: number, url: string, init: RequestInit = {}): Request {
  const token = sessions.get(id)!;
  return new Request(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      cookie: `${SESSION_COOKIE}=${token}`,
      ...(init.headers ?? {}),
    },
  });
}

function anon(url: string, init: RequestInit = {}): Request {
  return new Request(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

before(async () => {
  process.env.NESTJS_API_URL = "http://127.0.0.1:9/api";
  ({ POST: testDrivesPOST } = await import("../app/api/test-drives/route"));
  ({ POST: vehiclesPOST } = await import("../app/api/vehicles/route"));
  ({ PATCH: vehiclePATCH } = await import("../app/api/vehicles/[id]/route"));

  // Clean any leftovers from an interrupted previous run.
  await prisma.testDrive.deleteMany({ where: { vehicleId: { in: [VEHICLE_A, VEHICLE_B] } } });
  await prisma.financeApplication.deleteMany({ where: { userId: { in: [CUSTOMER_X, CUSTOMER_Y] } } });
  await prisma.vehicle.deleteMany({ where: { id: { in: [VEHICLE_A, VEHICLE_B] } } });
  await prisma.user.deleteMany({ where: { id: { in: [OWNER_A, OWNER_B, CUSTOMER_X, CUSTOMER_Y] } } });
  await prisma.dealer.deleteMany({ where: { id: { in: [DEALER_A, DEALER_B] } } });
  await prisma.brand.deleteMany({ where: { id: BRAND_ID } });
  await prisma.category.deleteMany({ where: { id: CATEGORY_ID } });

  await prisma.brand.create({ data: { id: BRAND_ID, name: "TenantBrand" } });
  await prisma.category.create({
    data: { id: CATEGORY_ID, name: "TenantCategory", slug: "tenant-category" },
  });
  await prisma.dealer.create({
    data: {
      id: DEALER_A,
      businessName: "Tenant Dealer A",
      phone: "9100000101",
      address: "1 Tenant Road",
      city: "City",
      state: "State",
      pincode: "000001",
      status: "APPROVED",
    },
  });
  await prisma.dealer.create({
    data: {
      id: DEALER_B,
      businessName: "Tenant Dealer B",
      phone: "9100000102",
      address: "2 Tenant Road",
      city: "City",
      state: "State",
      pincode: "000002",
      status: "APPROVED",
    },
  });

  for (const [id, role] of [
    [CUSTOMER_X, "CUSTOMER"],
    [CUSTOMER_Y, "CUSTOMER"],
    [OWNER_A, "DEALER"],
    [OWNER_B, "DEALER"],
  ] as const) {
    await prisma.user.create({
      data: {
        id,
        firstName: "Tenant",
        lastName: "User",
        email: `tenant-${id}@example.test`,
        phone: `91000000${String(id).slice(-2)}`,
        password: "not-a-real-hash",
        role,
      },
    });
    sessions.set(id, await signSession(sessionFor(id, role)));
  }
  await prisma.user.update({ where: { id: OWNER_A }, data: { dealer: { connect: { id: DEALER_A } } } });
  await prisma.user.update({ where: { id: OWNER_B }, data: { dealer: { connect: { id: DEALER_B } } } });

  await prisma.vehicle.create({
    data: {
      id: VEHICLE_A,
      title: "Tenant Vehicle A",
      price: 500_000,
      year: 2020,
      fuel: "PETROL",
      transmission: "MANUAL",
      color: "Black",
      city: "City",
      brandId: BRAND_ID,
      categoryId: CATEGORY_ID,
      dealerId: DEALER_A,
    },
  });
  await prisma.vehicle.create({
    data: {
      id: VEHICLE_B,
      title: "Tenant Vehicle B",
      price: 600_000,
      year: 2021,
      fuel: "DIESEL",
      transmission: "AUTOMATIC",
      color: "White",
      city: "City",
      brandId: BRAND_ID,
      categoryId: CATEGORY_ID,
      dealerId: DEALER_B,
    },
  });
});

after(async () => {
  await prisma.testDrive.deleteMany({ where: { vehicleId: { in: [VEHICLE_A, VEHICLE_B] } } });
  await prisma.financeApplication.deleteMany({ where: { userId: { in: [CUSTOMER_X, CUSTOMER_Y] } } });
  await prisma.vehicle.deleteMany({ where: { id: { in: [VEHICLE_A, VEHICLE_B] } } });
  await prisma.user.deleteMany({ where: { id: { in: [OWNER_A, OWNER_B, CUSTOMER_X, CUSTOMER_Y] } } });
  await prisma.dealer.deleteMany({ where: { id: { in: [DEALER_A, DEALER_B] } } });
  await prisma.brand.deleteMany({ where: { id: BRAND_ID } });
  await prisma.category.deleteMany({ where: { id: CATEGORY_ID } });
  await prisma.$disconnect();
});

beforeEach(() => resetRateLimits());

// ── Customer privacy ───────────────────────────────────────────────────────

test("the customer portal returns only the caller's own test drives", async () => {
  const mine = await prisma.testDrive.create({
    data: {
      vehicleId: VEHICLE_A,
      userId: CUSTOMER_X,
      customerName: "X",
      customerPhone: "9000000001",
      preferredDate: new Date("2026-11-01T10:00:00.000Z"),
      preferredTime: "10:00 AM",
    },
  });
  const theirs = await prisma.testDrive.create({
    data: {
      vehicleId: VEHICLE_B,
      userId: CUSTOMER_Y,
      customerName: "Y",
      customerPhone: "9000000002",
      preferredDate: new Date("2026-11-02T10:00:00.000Z"),
      preferredTime: "11:00 AM",
    },
  });
  const guest = await prisma.testDrive.create({
    data: {
      vehicleId: VEHICLE_A,
      userId: null,
      customerName: "Guest",
      customerPhone: "9000000003",
      preferredDate: new Date("2026-11-03T10:00:00.000Z"),
      preferredTime: "12:00 PM",
    },
  });

  const x = await loadCustomerPortalData({ id: String(CUSTOMER_X), email: "tenant-x@example.test" });
  const ids = x.testDrives.map((t) => t.id);
  assert.deepEqual(ids, [mine.id], "X sees exactly their own request");
  assert.ok(!ids.includes(theirs.id), "Y's request must never appear in X's portal");
  assert.ok(!ids.includes(guest.id), "a guest request belongs to nobody and is never listed");
});

test("the customer portal counts only the caller's own finance applications", async () => {
  await prisma.financeApplication.createMany({
    data: [
      { userId: CUSTOMER_X, loanAmount: 100_000, monthlyIncome: 50_000, tenureMonths: 12, status: "SUBMITTED" },
      { userId: CUSTOMER_X, loanAmount: 200_000, monthlyIncome: 50_000, tenureMonths: 24, status: "SUBMITTED" },
      { userId: CUSTOMER_Y, loanAmount: 300_000, monthlyIncome: 90_000, tenureMonths: 36, status: "SUBMITTED" },
      // A guest application has no owner and must not inflate anyone's count.
      { userId: null, loanAmount: 400_000, monthlyIncome: 90_000, tenureMonths: 48, status: "SUBMITTED" },
    ],
  });

  const x = await loadCustomerPortalData({ id: String(CUSTOMER_X), email: "tenant-x@example.test" });
  const y = await loadCustomerPortalData({ id: String(CUSTOMER_Y), email: "tenant-y@example.test" });
  assert.equal(x.financeApplicationCount, 2, "X's own two applications");
  assert.equal(y.financeApplicationCount, 1, "Y's own one application");
});

test("a portal session with an unusable id claim sees nothing, not everything", async () => {
  const data = await loadCustomerPortalData({ id: "not-a-number", email: "x@example.test" });
  assert.deepEqual(data.testDrives, []);
  assert.equal(data.financeApplicationCount, 0);
});

// ── TestDrive ownership ────────────────────────────────────────────────────

test("an authenticated test-drive request is linked to its creator", async () => {
  const res = await testDrivesPOST(
    asUser(CUSTOMER_X, "https://example.test/api/test-drives", {
      method: "POST",
      body: JSON.stringify({
        vehicleId: VEHICLE_A,
        customerName: "Signed In",
        customerPhone: "9000000011",
        preferredDate: "2026-12-01T10:00:00.000Z",
        preferredTime: "10:00 AM",
      }),
    }),
  );
  assert.equal(res.status, 201);
  const row = await prisma.testDrive.findFirst({
    where: { vehicleId: VEHICLE_A, customerPhone: "9000000011" },
    orderBy: { id: "desc" },
  });
  assert.ok(row, "the request was persisted");
  assert.equal(row!.userId, CUSTOMER_X, "the owner comes from the verified session");
});

test("a guest test-drive request stays anonymous rather than guessing an owner", async () => {
  const res = await testDrivesPOST(
    anon("https://example.test/api/test-drives", {
      method: "POST",
      body: JSON.stringify({
        vehicleId: VEHICLE_A,
        customerName: "Guest User",
        customerPhone: "9000000012",
        preferredDate: "2026-12-02T10:00:00.000Z",
        preferredTime: "11:00 AM",
      }),
    }),
  );
  assert.equal(res.status, 201, "guests may still book");
  const row = await prisma.testDrive.findFirst({
    where: { vehicleId: VEHICLE_A, customerPhone: "9000000012" },
    orderBy: { id: "desc" },
  });
  assert.ok(row);
  assert.equal(row!.userId, null, "a guest booking has no owner");
});

test("test-drive customerName is not trusted as an identity", async () => {
  // The name field is free text. Supplying another customer's identity must
  // not change ownership — only the signed session does.
  const res = await testDrivesPOST(
    asUser(CUSTOMER_X, "https://example.test/api/test-drives", {
      method: "POST",
      body: JSON.stringify({
        vehicleId: VEHICLE_A,
        customerName: "Y (somebody else)",
        customerPhone: "9000000013",
        preferredDate: "2026-12-03T10:00:00.000Z",
        preferredTime: "12:00 PM",
      }),
    }),
  );
  assert.equal(res.status, 201);
  const row = await prisma.testDrive.findFirst({
    where: { vehicleId: VEHICLE_A, customerPhone: "9000000013" },
    orderBy: { id: "desc" },
  });
  assert.equal(row!.userId, CUSTOMER_X);
});

// ── Cross-tenant IDOR ──────────────────────────────────────────────────────

test("PATCH /api/vehicles/[id] refuses anonymous and customer callers at the edge", async () => {
  const anonRes = await vehiclePATCH(anon("https://example.test/api/vehicles/1", { method: "PATCH", body: "{}" }), {
    params: Promise.resolve({ id: "1" }),
  });
  assert.equal(anonRes.status, 401, "anonymous → 401");

  const customerRes = await vehiclePATCH(
    asUser(CUSTOMER_X, "https://example.test/api/vehicles/1", { method: "PATCH", body: "{}" }),
    { params: Promise.resolve({ id: "1" }) },
  );
  assert.equal(customerRes.status, 403, "a customer may never patch inventory");
});

test("a dealer cannot reassign another dealership's vehicle", async () => {
  const res = await vehiclePATCH(
    asUser(OWNER_A, `https://example.test/api/vehicles/${VEHICLE_B}`, {
      method: "PATCH",
      body: JSON.stringify({ title: "Hijacked", dealerId: DEALER_A }),
    }),
    { params: Promise.resolve({ id: String(VEHICLE_B) }) },
  );
  assert.equal(res.status, 403, "dealer A does not own vehicle B");
  const after1 = await prisma.vehicle.findUnique({ where: { id: VEHICLE_B } });
  assert.equal(after1!.title, "Tenant Vehicle B", "the vehicle must be untouched");
  assert.equal(after1!.dealerId, DEALER_B);
});

test("a dealer cannot move their own vehicle under another dealership via dealerId", async () => {
  const res = await vehiclePATCH(
    asUser(OWNER_A, `https://example.test/api/vehicles/${VEHICLE_A}`, {
      method: "PATCH",
      body: JSON.stringify({ title: "Renamed by owner", dealerId: DEALER_B }),
    }),
    { params: Promise.resolve({ id: String(VEHICLE_A) }) },
  );
  assert.equal(res.status, 200, "an owner may edit their own vehicle");
  const after1 = await prisma.vehicle.findUnique({ where: { id: VEHICLE_A } });
  assert.equal(after1!.title, "Renamed by owner", "the legitimate field did change");
  assert.equal(after1!.dealerId, DEALER_A, "a client-supplied dealerId is ignored");
});

test("POST /api/vehicles re-scopes a dealer's payload to their own dealership", async () => {
  const res = await vehiclesPOST(
    asUser(OWNER_A, "https://example.test/api/vehicles", {
      method: "POST",
      body: JSON.stringify({
        title: "Smuggled Under B",
        price: 111_000,
        year: 2022,
        mileage: 100,
        fuel: "PETROL",
        transmission: "MANUAL",
        color: "Red",
        city: "City",
        brandId: BRAND_ID,
        categoryId: CATEGORY_ID,
        dealerId: DEALER_B,
        isFeatured: true,
      }),
    }),
  );
  assert.equal(res.status, 201);
  const created = await prisma.vehicle.findFirst({
    where: { title: "Smuggled Under B" },
    orderBy: { id: "desc" },
  });
  assert.ok(created, "the vehicle was created");
  assert.equal(created!.dealerId, DEALER_A, "dealerId is taken from the session, not the body");
  assert.equal(created!.isFeatured, false, "only an admin may feature a listing");
  await prisma.vehicle.deleteMany({ where: { id: created!.id } });
});

test("POST /api/vehicles rejects a malformed payload instead of coercing it", async () => {
  const res = await vehiclesPOST(
    asUser(OWNER_A, "https://example.test/api/vehicles", {
      method: "POST",
      body: JSON.stringify({ title: "", brandId: "abc", categoryId: null, price: -1 }),
    }),
  );
  assert.equal(res.status, 400, "a payload that cannot be validated is refused");
});
