import { NextResponse } from "next/server";

import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";

export const runtime = "nodejs";

/** GET /api/auth/me — returns the signed-in user, or 401. */
export async function GET(request: Request) {
  const session = await verifySession(readSessionCookie(request));
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // NestJS is the only identity store — profile + role permissions
  if (session.token) {
    try {
      const profile = await backendFetch<{
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string | null;
        role: string;
        isActive: boolean;
        permissions?: string[];
      }>("/auth/profile", { token: session.token });

      // A profile fetch succeeded but the account is deactivated: hand back a
      // stale-session 401 so the client stops treating the cookie as valid.
      if (profile.isActive === false) {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 },
        );
      }

      return NextResponse.json({
        user: {
          id: String(profile.id),
          username: profile.email,
          email: profile.email,
          name:
            `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() ||
            profile.email,
          role: profile.role as SessionRole,
          permissions: profile.permissions ?? [],
        },
      });
    } catch (err) {
      // Backend reachable but rejected the token → session is stale.
      if (err instanceof BackendError && !isBackendUnreachable(err)) {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 },
        );
      }
      // Backend unreachable: say so. Do not guess a user from a local store,
      // and do not report 401 (that would sign people out during a blip).
      return NextResponse.json({ error: "Backend unreachable" }, { status: 503 });
    }
  }

  // A session without a backend token cannot be verified against the only
  // identity store, so it is not a valid session.
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

type SessionRole = "CUSTOMER" | "DEALER" | "ADMIN" | "DEALER_EMPLOYEE";