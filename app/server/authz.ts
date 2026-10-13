import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { prisma } from "@/app/server/prisma";
import {
  isKnownRole,
  readSessionCookie,
  verifySession,
  SESSION_COOKIE,
  type SessionPayload,
  type UserRole,
} from "@/app/lib/auth";

/**
 * Authorization helpers. Every protected route handler should start by
 * calling one of these so that enforcement lives in one place.
 */

export interface AuthContext {
  session: SessionPayload;
  dealer?: { id: number; businessName: string; city?: string | null; state?: string | null };
}

/** Require any authenticated user. */
export async function requireUser(request: Request): Promise<AuthContext | NextResponse> {
  const session = await verifySession(readSessionCookie(request));
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return { session };
}

/** Require ADMIN role. */
export async function requireAdmin(request: Request): Promise<AuthContext | NextResponse> {
  const session = await verifySession(readSessionCookie(request));
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return { session };
}

export interface RoleGuardOk {
  ok: true;
  session: SessionPayload;
}
export interface RoleGuardDenied {
  ok: false;
  response: NextResponse;
}
export type RoleGuardResult = RoleGuardOk | RoleGuardDenied;

/**
 * Require one of `roles`.
 *
 * Status codes follow the standard contract used across this API:
 *   401 — no valid session (caller is anonymous or the cookie expired/forged)
 *   403 — a valid session, but the role is not allowed
 *
 * A discriminated result is returned rather than an AuthContext so the denied
 * branch is a single `return`, which keeps the distinction visible at every
 * call site instead of hiding it in an `instanceof` check.
 */
export async function requireRole(
  request: Request,
  ...roles: UserRole[]
): Promise<RoleGuardResult> {
  const session = await verifySession(readSessionCookie(request));
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!isKnownRole(session.role) || !roles.includes(session.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, session };
}

/** Require an ADMIN session. 401 anonymous, 403 everyone else. */
export function requireAdminSession(request: Request): Promise<RoleGuardResult> {
  return requireRole(request, "ADMIN");
}

/** Require a DEALER (or ADMIN) session. 401 anonymous, 403 everyone else. */
export function requireDealerSession(request: Request): Promise<RoleGuardResult> {
  return requireRole(request, "DEALER", "ADMIN");
}

/**
 * Require ADMIN or DEALER.
 *
 * Used by destructive vehicle operations. Existence of a session is NOT
 * sufficient: CUSTOMER and DEALER_EMPLOYEE are refused outright, and DEALER
 * ownership is resolved from the caller's own dealer relationship rather than
 * anything supplied by the client. The dealer record is loaded here so callers
 * never re-implement the lookup to scope a query.
 */
export async function requireAdminOrDealer(
  request: Request,
): Promise<AuthContext | NextResponse> {
  const session = await verifySession(readSessionCookie(request));
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN" && session.role !== "DEALER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.role === "ADMIN") return { session };

  // Dealer is linked to the account by `userId`, not by a dealer email column.
  const userId = Number.parseInt(session.id, 10);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Forbidden — no dealer profile" }, { status: 403 });
  }
  const dealer = await prisma.dealer.findFirst({ where: { userId } });
  if (!dealer) return NextResponse.json({ error: "Forbidden — no dealer profile" }, { status: 403 });
  return { session, dealer };
}

/** Require DEALER role AND load their dealer record. */
export async function requireDealer(request: Request): Promise<AuthContext | NextResponse> {
  const session = await verifySession(readSessionCookie(request));
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "DEALER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // Dealer is linked to the account by `userId`, not by a dealer email column.
    // The session id is a string but the column is an integer.
    const userId = Number.parseInt(session.id, 10);
    if (!Number.isInteger(userId)) {
      return NextResponse.json({ error: "Forbidden \u2014 no dealer profile" }, { status: 403 });
    }
    const dealer = await prisma.dealer.findFirst({ where: { userId } });
  if (!dealer) return NextResponse.json({ error: "Forbidden — no dealer profile" }, { status: 403 });
  return { session, dealer };
}

/**
 * Require a dealership actor: the DEALER who owns the dealership, or an active
 * DEALER_EMPLOYEE of it.
 *
 * `DEALER_EMPLOYEE` was a role the app could issue (`auth/register` accepts it,
 * `SecurityPanel` assigns permissions to it) that granted nothing at all — every
 * dealership route required the strict `DEALER` role and refused it. That is
 * fail-closed, which is safe, but it leaves accounts that can log in and then do
 * nothing, with nothing in the code explaining why.
 *
 * An employee acts for the dealership they belong to and nothing else, so the
 * returned `dealer` is resolved through their employment row rather than through
 * anything the client supplies. Every caller scopes on `auth.dealer.id`, which
 * is what makes the two roles interchangeable here.
 *
 * Deliberately NOT used for the dealership's financial data
 * (`/api/dealer/finance`): that surface carries PAN, income and employer name,
 * and widening it to staff is a decision about the dealership's own handling of
 * its customers' financial details, not a default an engineer should pick. Those
 * routes keep `requireDealer`.
 */
export async function requireDealerStaff(
  request: Request,
): Promise<AuthContext | NextResponse> {
  const session = await verifySession(readSessionCookie(request));
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.role === "DEALER") {
    return requireDealer(request);
  }
  if (session.role !== "DEALER_EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = Number.parseInt(session.id, 10);
  if (!Number.isInteger(userId)) {
    return NextResponse.json(
      { error: "Forbidden — no employee profile" },
      { status: 403 },
    );
  }

  // `userId` is unique on DealerEmployee, but read with isActive so a
  // deactivated employee loses access rather than keeping the last dealership
  // they were attached to.
  const employment = await prisma.dealerEmployee.findFirst({
    where: { userId, isActive: true },
    include: { dealer: true },
  });
  if (!employment?.dealer) {
    return NextResponse.json(
      { error: "Forbidden — no active employee profile" },
      { status: 403 },
    );
  }

  return { session, dealer: employment.dealer };
}

/** Find which dealer owns a vehicle (or null). */
export async function vehicleDealerId(vehicleId: number): Promise<number | null> {
  const v = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { dealerId: true } });
  return v?.dealerId ?? null;
}

/**
 * Whether the incoming request carries a valid signed session.
 *
 * For server components, which have no `Request` object to hand to
 * `requireUser`. Used to decide whether PII may be rendered at all — the dealer
 * directory, for instance, withholds contact details from anonymous visitors
 * and this is what tells them apart.
 */
export async function isSignedIn(): Promise<boolean> {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  return session !== null;
}
