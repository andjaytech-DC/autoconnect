import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";

import { resetRateLimits } from "../app/lib/rate-limit";
import { prisma } from "../app/server/prisma";
import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { requireDealer, requireDealerStaff } from "../app/server/authz";
import { GET as dealerMeGET } from "../app/api/dealer/me/route";
import { GET as dealerFinanceGET } from "../app/api/dealer/finance/route";

/**
 * `DEALER_EMPLOYEE` was a role the app could issue that granted nothing:
 * `auth/register` accepted it and `SecurityPanel` assigned permissions to it,
 * but every dealership route required the strict `DEALER` role and refused it.
 * Fail-closed and safe, but accounts that log in and can do nothing.
 *
 * `requireDealerStaff` gives an employee the dealership they work for and
 * nothing else, resolved through their employment row rather than anything the
 * client supplies.
 *
 * Seeded for the run and removed afterwards — the assertions need a real
 * dealership and a real employment row, because the whole point is where the
 * dealership id comes from.
 */

const OWNER_ID = 8_000_001;
const EMPLOYEE_ID = 8_000_002;
const EX_EMPLOYEE_ID = 8_000_003;
const DEALER_A = 8_000_010;
const DEALER_B = 8_000_011;

const sessionFor = (id: number, role: SessionUser["role"]): SessionUser => ({
  id: String(id),
  username: `role-test-${id}`,
  email: `role-test-${id}@example.test`,
  name: "Role Test",
  role,
});

const sessions = new Map<string, string>();

function asUser(role: SessionUser["role"], id: number): Request {
  const key = `${role}:${id}`;
  const token = sessions.get(key)!;
  return new Request("https://example.test/api/dealer/me", {
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
  });
}

before(async () => {
  await prisma.dealer.deleteMany({
    where: { id: { in: [DEALER_A, DEALER_B] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [OWNER_ID, EMPLOYEE_ID, EX_EMPLOYEE_ID] } },
  });

  const [a, b] = await Promise.all([
    prisma.dealer.create({
      data: {
        id: DEALER_A,
        businessName: "Employee Scope Dealer A",
        phone: "9000000101",
        address: "1 Scope Road",
        city: "Karachi",
        state: "Sindh",
        pincode: "74000",
        status: "APPROVED",
      },
    }),
    prisma.dealer.create({
      data: {
        id: DEALER_B,
        businessName: "Employee Scope Dealer B",
        phone: "9000000102",
        address: "2 Scope Road",
        city: "Lahore",
        state: "Punjab",
        pincode: "54000",
        status: "APPROVED",
      },
    }),
  ]);

  for (const [id, role] of [
    [OWNER_ID, "DEALER"],
    [EMPLOYEE_ID, "DEALER_EMPLOYEE"],
    [EX_EMPLOYEE_ID, "DEALER_EMPLOYEE"],
  ] as const) {
    await prisma.user.create({
      data: {
        id,
        firstName: "Role",
        lastName: "Test",
        email: `role-test-${id}@example.test`,
        phone: `9000000${String(id).slice(-3)}`,
        password: "not-a-real-hash",
        role,
      },
    });
    sessions.set(`${role}:${id}`, await signSession(sessionFor(id, role)));
  }

  // The owner is linked to A, and an active employee also works at A.
  await prisma.user.update({
    where: { id: OWNER_ID },
    data: { dealer: { connect: { id: a.id } } },
  });
  await prisma.dealerEmployee.create({
    data: { userId: EMPLOYEE_ID, dealerId: a.id, position: "Sales", isActive: true },
  });
  // A second, deactivated employment at the *other* dealership — must be inert.
  await prisma.dealerEmployee.create({
    data: {
      userId: EX_EMPLOYEE_ID,
      dealerId: b.id,
      position: "Former",
      isActive: false,
    },
  });
});

after(async () => {
  await prisma.dealerEmployee.deleteMany({
    where: { userId: { in: [OWNER_ID, EMPLOYEE_ID, EX_EMPLOYEE_ID] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [OWNER_ID, EMPLOYEE_ID, EX_EMPLOYEE_ID] } },
  });
  await prisma.dealer.deleteMany({ where: { id: { in: [DEALER_A, DEALER_B] } } });
  await prisma.$disconnect();
});

beforeEach(() => resetRateLimits());

test("a DEALER owner resolves their own dealership", async () => {
  const auth = await requireDealerStaff(asUser("DEALER", OWNER_ID));
  assert.ok(!(auth instanceof Response));
  if (auth instanceof Response) return;
  assert.equal(auth.dealer?.id, DEALER_A);
});

test("an active employee resolves the dealership they work for", async () => {
  const auth = await requireDealerStaff(asUser("DEALER_EMPLOYEE", EMPLOYEE_ID));
  assert.ok(!(auth instanceof Response), "an active employee must be admitted");
  if (auth instanceof Response) return;
  assert.equal(auth.dealer?.id, DEALER_A, "the employee acts for dealership A");
  assert.equal(auth.session.role, "DEALER_EMPLOYEE", "their own role is preserved");
});

test("a deactivated employee is refused", async () => {
  const auth = await requireDealerStaff(asUser("DEALER_EMPLOYEE", EX_EMPLOYEE_ID));
  assert.ok(auth instanceof Response, "isActive: false must lose access");
  if (auth instanceof Response) assert.equal(auth.status, 403);
});

test("an employee with no employment row is refused", async () => {
  const orphan = await signSession(sessionFor(8_000_009, "DEALER_EMPLOYEE"));
  const auth = await requireDealerStaff(
    new Request("https://example.test/api/dealer/me", {
      headers: { cookie: `${SESSION_COOKIE}=${orphan}` },
    }),
  );
  assert.ok(auth instanceof Response);
  if (auth instanceof Response) assert.equal(auth.status, 403);
});

test("a CUSTOMER is refused with 403, an anonymous caller with 401", async () => {
  const customer = await signSession(sessionFor(8_000_004, "CUSTOMER"));
  const refused = await requireDealerStaff(
    new Request("https://example.test/api/dealer/me", {
      headers: { cookie: `${SESSION_COOKIE}=${customer}` },
    }),
  );
  assert.ok(refused instanceof Response);
  if (refused instanceof Response) assert.equal(refused.status, 403);

  const anon = await requireDealerStaff(new Request("https://example.test/api/dealer/me"));
  assert.ok(anon instanceof Response);
  if (anon instanceof Response) assert.equal(anon.status, 401);
});

test("/api/dealer/me admits an employee (operations surface)", async () => {
  const res = await dealerMeGET(asUser("DEALER_EMPLOYEE", EMPLOYEE_ID));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.dealer.id, DEALER_A, "scoped to their own dealership");
});

test("/api/dealer/finance still refuses an employee with 403", async () => {
  // Financial PII — PAN, income, employer name. Widening this to staff is a
  // decision about the dealership's handling of customer finances, not a
  // default an engineer should pick.
  const res = await dealerFinanceGET(asUser("DEALER_EMPLOYEE", EMPLOYEE_ID));
  assert.equal(res.status, 403, "employees must not reach finance applications");

  const owner = await dealerFinanceGET(asUser("DEALER", OWNER_ID));
  assert.equal(owner.status, 200, "the owner still can");
});

test("requireDealer itself still refuses an employee", async () => {
  // The strict helper is unchanged, so nothing silently gained access through it.
  const auth = await requireDealer(asUser("DEALER_EMPLOYEE", EMPLOYEE_ID));
  assert.ok(auth instanceof Response);
  if (auth instanceof Response) assert.equal(auth.status, 403);
});
