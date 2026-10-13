import type { NextResponse } from "next/server";

import {
  clearSessionCookies,
  sessionCookieValue,
  uiCookieValue,
} from "@/app/lib/auth";

/**
 * Cookie plumbing for the auth routes.
 *
 * Lives outside `app/lib/auth.ts` so that module stays edge- and client-safe:
 * `next/server` must never be pulled into a client component's import graph.
 *
 * Login/logout/register are the only writers, so both cookies are always kept
 * in sync: `pah_session` (HttpOnly, signed, authoritative) and `pah_ui`
 * (script-readable, role only, never an authorization input).
 */
export function applySessionCookies(
  response: NextResponse,
  token: string,
  role: string,
): NextResponse {
  response.headers.append("Set-Cookie", sessionCookieValue(token));
  response.headers.append("Set-Cookie", uiCookieValue(role));
  return response;
}

export function clearSessionCookiesOn(response: NextResponse): NextResponse {
  for (const value of clearSessionCookies()) {
    response.headers.append("Set-Cookie", value);
  }
  return response;
}
