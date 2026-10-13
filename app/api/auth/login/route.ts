import { NextResponse } from "next/server";
import { z } from "zod";

import {
  localAuthAllowed,
  signSession,
  withoutToken,
  type SessionUser,
} from "@/app/lib/auth";
export { localAuthAllowed };
import { UNIDENTIFIED_IP } from "@/app/lib/client-ip";
import { verifyCredentials } from "@/app/server/users";
import { applySessionCookies } from "@/app/server/session-cookies";
import { clientIp } from "@/app/server/audit";
import {
  checkLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from "@/app/server/login-throttle";

export const runtime = "nodejs";

/** NestJS backend base URL. Falls back to the local store when unreachable.
 * NOTE: NESTJS_API_URL already includes `/api` (e.g. http://localhost:5000/api),
 * so callers must append paths WITHOUT a second `/api` prefix —
 * `${NESTJS_URL}/auth/login`, NOT `${NESTJS_URL}/api/auth/login`. */
const NESTJS_URL = (process.env.NESTJS_API_URL ?? "").replace(/\/+$/, "");

const loginSchema = z.object({
  username: z.string().min(1, "Username or email is required").max(120),
  password: z.string().min(1, "Password is required").max(72),
});

interface BackendUser {
  id: number | string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
}

/** Attempt login against NestJS. Returns null when unreachable/invalid. */
async function loginViaNestJS(
  username: string,
  password: string,
): Promise<SessionUser | null> {
  if (!NESTJS_URL) return null;
  try {
    const res = await fetch(`${NESTJS_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: username, password }),
      signal: AbortSignal.timeout(4_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      success?: boolean;
      data?: {
        accessToken?: string;
        user?: BackendUser;
      };
    };
    const payload = json?.data;
    const u = payload?.user;
    if (!u || typeof u.id === "undefined" || typeof u.email !== "string") {
      return null;
    }
    // Suspended accounts are rejected at the door: this bucket refuses to issue
    // a session for them, and the identical 401 keeps the reason private.
    if (u.isActive === false) return null;
    const role = String(u.role ?? "CUSTOMER").toUpperCase();
    return {
      id: String(u.id),
      username: u.email,
      email: u.email,
      name:
        `${String(u.firstName ?? "")} ${String(u.lastName ?? "")}`.trim() ||
        u.email,
      role: role === "DEALER" || role === "ADMIN" || role === "DEALER_EMPLOYEE"
        ? role
        : "CUSTOMER",
      token: payload.accessToken,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const { username, password } = parsed.data;

  // Throttle before doing any credential work, so a locked-out account costs
  // neither a bcrypt comparison nor a round trip to the backend.
  const ip = clientIp(request) ?? UNIDENTIFIED_IP;
  const gate = checkLoginAllowed(username, ip);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } },
    );
  }

  // 1) NestJS backend (authoritative)
  const nestUser = await loginViaNestJS(username, password);
  if (nestUser) {
    clearLoginFailures(username, ip);
    const token = await signSession(nestUser);
    return applySessionCookies(
      // The access token stays inside the HttpOnly cookie — never in the body.
      NextResponse.json({ user: withoutToken(nestUser), source: "backend" }),
      token,
      nestUser.role,
    );
  }

  // 2) Local fallback so the app works before NestJS is deployed. Disabled in
  //    production unless explicitly re-enabled: a row that still exists locally
  //    must not be able to sign in over the backend's refusal.
  if (!localAuthAllowed()) {
    recordLoginFailure(username, ip);
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 },
    );
  }

  const localUser = await verifyCredentials(username, password);
  if (!localUser) {
    recordLoginFailure(username, ip);
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 },
    );
  }
  clearLoginFailures(username, ip);
  const token = await signSession({ ...localUser });
  return applySessionCookies(
    NextResponse.json({ user: localUser, source: "local" }),
    token,
    localUser.role,
  );
}