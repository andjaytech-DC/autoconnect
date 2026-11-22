import { NextResponse } from "next/server";
import { z } from "zod";

import { signSession, withoutToken, type SessionUser } from "@/app/lib/auth";
import { UNIDENTIFIED_IP, clientIp } from "@/app/lib/client-ip";
import { applySessionCookies } from "@/app/server/session-cookies";
import {
  checkLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from "@/app/server/login-throttle";

export const runtime = "nodejs";

/**
 * NestJS backend base URL, read per request so deployments (and tests) can set
 * it after this module loads. NESTJS_API_URL already includes `/api`
 * (e.g. http://localhost:5000/api), so append paths WITHOUT a second `/api`.
 */
const nestUrl = (): string => (process.env.NESTJS_API_URL ?? "").replace(/\/+$/, "");

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

type LoginOutcome =
  | { kind: "ok"; user: SessionUser }
  /** Wrong credentials, unknown or suspended account — all look identical. */
  | { kind: "invalid" }
  /** The backend's own throttle refused the request. */
  | { kind: "rate_limited"; retryAfter: string }
  /** Backend unreachable or broken. Says nothing about the credentials. */
  | { kind: "unavailable" };

/** Attempt login against NestJS — the only identity store. */
async function loginViaNestJS(username: string, password: string): Promise<LoginOutcome> {
  const base = nestUrl();
  if (!base) return { kind: "unavailable" };
  try {
    const res = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: username, password }),
      signal: AbortSignal.timeout(4_000),
      cache: "no-store",
    });
    if (res.status === 429) {
      return { kind: "rate_limited", retryAfter: res.headers.get("retry-after") ?? "60" };
    }
    if (res.status >= 500) return { kind: "unavailable" };
    // 400 (not an email), 401, 403, 404… are all "these credentials do not work".
    if (!res.ok) return { kind: "invalid" };

    const json = (await res.json()) as {
      data?: { accessToken?: string; user?: BackendUser };
    };
    const payload = json?.data;
    const u = payload?.user;
    if (!u || typeof u.id === "undefined" || typeof u.email !== "string" || !payload?.accessToken) {
      return { kind: "unavailable" };
    }
    // Suspended accounts are rejected at the door: no session is issued, and the
    // identical 401 keeps the reason private.
    if (u.isActive === false) return { kind: "invalid" };
    const role = String(u.role ?? "CUSTOMER").toUpperCase();
    return {
      kind: "ok",
      user: {
        id: String(u.id),
        username: u.email,
        email: u.email,
        name: `${String(u.firstName ?? "")} ${String(u.lastName ?? "")}`.trim() || u.email,
        role:
          role === "DEALER" || role === "ADMIN" || role === "DEALER_EMPLOYEE" ? role : "CUSTOMER",
        token: payload.accessToken,
      },
    };
  } catch {
    return { kind: "unavailable" };
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

  // NestJS is the only identity store. There is deliberately no local fallback:
  // a user removed, disabled or demoted in the backend must not be able to sign
  // in anywhere else.
  const outcome = await loginViaNestJS(username, password);

  if (outcome.kind === "ok") {
    clearLoginFailures(username, ip);
    const token = await signSession(outcome.user);
    return applySessionCookies(
      // The access token stays inside the HttpOnly cookie — never in the body.
      NextResponse.json({ user: withoutToken(outcome.user), source: "backend" }),
      token,
      outcome.user.role,
    );
  }

  if (outcome.kind === "rate_limited") {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again later." },
      { status: 429, headers: { "Retry-After": outcome.retryAfter } },
    );
  }

  if (outcome.kind === "unavailable") {
    // Not the user's fault, so it must not count toward their lockout.
    return NextResponse.json(
      { error: "Sign-in is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }

  recordLoginFailure(username, ip);
  return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
}
