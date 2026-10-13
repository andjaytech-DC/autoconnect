import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { resetRateLimits } from "../app/lib/rate-limit";
import { resetTelemetryStore } from "../app/lib/telemetry-store";
import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import {
  requireAdmin,
  requireAdminSession,
  requireDealerSession,
  requireRole,
  requireUser,
} from "../app/server/authz";

/**
 * Locks the status-code contract that every protected route now uses:
 *
 *   401 — no valid session (anonymous, expired, or forged/unsigned cookie)
 *   403 — a valid session, but the role is not allowed
 *
 * The previous code returned 401 for both, which told a signed-in customer
 * "you are not logged in" instead of "you may not do this".
 */

const USERS: Record<string, SessionUser> = {
  customer: { id: "7", username: "cust", email: "c@x.test", name: "Cust", role: "CUSTOMER" },
  dealer: { id: "8", username: "deal", email: "d@x.test", name: "Deal", role: "DEALER" },
  employee: { id: "9", username: "emp", email: "e@x.test", name: "Emp", role: "DEALER_EMPLOYEE" },
  admin: { id: "1", username: "adm", email: "a@x.test", name: "Adm", role: "ADMIN" },
};

let tokens = new Map<string, string>();

beforeEach(async () => {
  resetRateLimits();
  resetTelemetryStore();
  tokens = new Map(
    await Promise.all(
      Object.entries(USERS).map(async ([key, user]) => [key, await signSession(user)] as const),
    ),
  );
});

function asUser(key: keyof typeof USERS | "anonymous" | "forged"): Request {
  const token =
    key === "anonymous"
      ? undefined
      : key === "forged"
        ? "not-a-signed-jwt"
        : tokens.get(key);
  return new Request("https://example.test/api/probe", {
    headers: token ? { cookie: `${SESSION_COOKIE}=${token}` } : {},
  });
}

async function statusOf(request: Request): Promise<number> {
  const result = await requireRole(request, "ADMIN");
  return result.ok ? 200 : result.response.status;
}

test("an anonymous caller gets 401, not 403", async () => {
  assert.equal(await statusOf(asUser("anonymous")), 401);
  // A forged / unsigned cookie is the same as no session at all.
  assert.equal(await statusOf(asUser("forged")), 401);
});

test("a valid session with the wrong role gets 403, not 401", async () => {
  for (const key of ["customer", "dealer", "employee"] as const) {
    assert.equal(await statusOf(asUser(key)), 403, `${key} must be refused as 403`);
  }
});

test("an admin session is admitted", async () => {
  const result = await requireRole(asUser("admin"), "ADMIN");
  assert.ok(result.ok);
  assert.equal(result.session.role, "ADMIN");
});

test("requireAdminSession is ADMIN-only", async () => {
  const denied = await requireAdminSession(asUser("customer"));
  assert.equal(denied.ok, false);
  if (!denied.ok) assert.equal(denied.response.status, 403);
  assert.ok((await requireAdminSession(asUser("admin"))).ok);
});

test("requireDealerSession admits DEALER and ADMIN, refuses CUSTOMER with 403", async () => {
  for (const key of ["dealer", "admin"] as const) {
    assert.ok((await requireDealerSession(asUser(key))).ok);
  }
  const denied = await requireDealerSession(asUser("customer"));
  assert.equal(denied.ok, false);
  if (!denied.ok) assert.equal(denied.response.status, 403);
});

test("requireUser admits any signed-in role but not an anonymous caller", async () => {
  for (const key of ["customer", "dealer", "employee", "admin"] as const) {
    assert.ok(!(await requireUser(asUser(key)) instanceof Response), `${key} should be admitted`);
  }
  assert.ok((await requireUser(asUser("anonymous"))) instanceof Response);
  assert.ok((await requireUser(asUser("forged"))) instanceof Response);
});

test("requireAdmin refuses a customer with 403 and an anonymous caller with 401", async () => {
  const refused = await requireAdmin(asUser("customer"));
  assert.ok(refused instanceof Response);
  assert.equal((refused as Response).status, 403);

  const anonymous = await requireAdmin(asUser("anonymous"));
  assert.ok(anonymous instanceof Response);
  assert.equal((anonymous as Response).status, 401);
});

test("an expired or tampered session never reaches 403", async () => {
  // A JWT signed with the correct shape but a different key is invalid, so the
  // caller is anonymous — 401 — and must never be reported as merely insufficient.
  const { SignJWT } = await import("jose");
  const alien = await new SignJWT({ id: "1", role: "ADMIN" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(new TextEncoder().encode("some-other-secret-entirely"));
  const request = new Request("https://example.test/api/probe", {
    headers: { cookie: `${SESSION_COOKIE}=${alien}` },
  });
  const result = await requireRole(request, "ADMIN");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.response.status, 401);
});
