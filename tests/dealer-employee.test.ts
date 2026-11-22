import { test } from "node:test";
import assert from "node:assert/strict";

import * as authz from "../app/server/authz";

/**
 * Dealership ownership used to be resolved here, in Next.js, by reading the
 * Dealer / DealerEmployee tables through Prisma. NestJS now resolves it from the
 * verified token (see the dealers.dashboard and vehicles.access specs), and the
 * dealer routes forward the caller's token (see dealer-routes.test.ts).
 *
 * This file only guards against the Prisma-backed helpers coming back: a
 * helper that returned a `dealer` row would be a second source of truth for
 * who owns what.
 */
test("authz exposes role gates only — no database-backed dealership helpers", () => {
  const exported = Object.keys(authz).sort();
  for (const gone of ["requireDealer", "requireDealerStaff", "requireAdminOrDealer", "vehicleDealerId"]) {
    assert.ok(!exported.includes(gone), `${gone} must not be reintroduced`);
  }
  for (const kept of ["requireRole", "requireAdminSession", "requireDealerSession", "requireUser", "requireAdmin", "isSignedIn"]) {
    assert.ok(exported.includes(kept), `${kept} is still part of the contract`);
  }
});
