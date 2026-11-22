import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

/*
 * Dealership ownership is not resolved here. This module only answers "who is
 * signed in and what role do they hold"; whether a DEALER or DEALER_EMPLOYEE may
 * touch a particular vehicle, lead or booking is decided by NestJS (which
 * resolves the dealership from the verified token, never from the request), and
 * the BFF forwards the caller's token. The Prisma-backed helpers that used to
 * live here (requireDealer, requireDealerStaff, requireAdminOrDealer,
 * vehicleDealerId) were removed with the last direct database access.
 */

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
