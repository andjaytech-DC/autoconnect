import { NextResponse } from "next/server";

import {
  readSessionCookie,
  verifySession,
} from "@/app/lib/auth";
import { backendFetch } from "@/app/lib/backend";
import { clearSessionCookiesOn } from "@/app/server/session-cookies";

export const runtime = "nodejs";

/** POST /api/auth/logout — revokes the backend refresh token, then clears the session cookie. */
export async function POST(request: Request) {
  const session = await verifySession(readSessionCookie(request));

  // Revoke the refresh token server-side (best effort — never blocks logout).
  if (session?.token) {
    backendFetch("/auth/logout", { method: "POST", token: session.token }).catch(
      () => undefined,
    );
  }

  return clearSessionCookiesOn(NextResponse.json({ ok: true }));
}