import { NextResponse } from "next/server";
import { z } from "zod";

import { signSession, withoutToken, type SessionUser } from "@/app/lib/auth";
import { applySessionCookies } from "@/app/server/session-cookies";
import { enforceRateLimit } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

/**
 * NestJS backend base URL, read per request. NESTJS_API_URL already includes
 * `/api`, so append paths WITHOUT a second `/api` prefix.
 */
const nestUrl = (): string => (process.env.NESTJS_API_URL ?? "").replace(/\/+$/, "");

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username needs at least 3 characters")
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, "Letters, numbers, dot and underscore only"),
  email: z.email("Enter a valid email address"),
  name: z.string().min(1).max(80).optional(),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

/**
 * Rate limits for public registration.
 *
 * Two, because the endpoint can be abused in two ways and IP alone cannot see
 * either of them reliably — `resolveClientIp` collapses every untrusted caller
 * into one shared bucket, so a per-IP limit here would lock out the whole site
 * in any deployment without `TRUST_PROXY_HEADERS` set.
 *
 *   per email — bounds how often one address can be probed, which is what makes
 *     the 409 "already exists" response impractical for bulk enumeration.
 *     Always applied, and needs no trusted address.
 *
 *     Deliberately NOT keyed on username. Usernames are drawn from a small pool
 *     of common names, so five people picking `alex` in an hour would otherwise
 *     lock the name for everyone — a self-inflicted outage that costs far more
 *     than the enumeration it prevents.
 *
 *   per caller — bounds sign-up volume from a single source. Applied to the
 *     shared bucket too, at a volume no single client should reach: cheap enough
 *     that a NAT'd office is unaffected, while still stopping a script that
 *     rotates addresses to get past the email limit.
 */
const REGISTER_PER_EMAIL = { limit: 5, windowMs: 60 * 60 * 1000 }; // 5 / hour
const REGISTER_PER_CALLER = { limit: 20, windowMs: 15 * 60 * 1000 }; // 20 / 15 min

interface RegisterBackendResult {
  ok: boolean;
  /** The session when the backend accepted the registration. */
  user?: SessionUser;
  /**
   * True when the backend itself answered (any status) — false on a network
   * error or timeout. A rejection (say, a 409 duplicate) is final; an
   * unreachable backend is reported as 503. There is no local store.
   */
  backendReached: boolean;
  status?: number;
}

/** Forward the registration to NestJS. */
async function registerViaNestJS(input: {
  username: string;
  email: string;
  name: string;
  password: string;
}): Promise<RegisterBackendResult> {
  const base = nestUrl();
  if (!base) return { ok: false, backendReached: false };
  const [firstName, ...rest] = input.name.split(" ");
  try {
    const res = await fetch(`${base}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: firstName || input.username,
        lastName: rest.join(" ") || input.username,
        email: input.email,
        password: input.password,
        // No `role`: the backend's RegisterDto forbids it (forbidNonWhitelisted)
        // and always creates a CUSTOMER. Sending it makes every sign-up a 400.
      }),
      signal: AbortSignal.timeout(4_000),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, backendReached: true, status: res.status };
    const json = (await res.json()) as {
      success?: boolean;
      data?: {
        accessToken?: string;
        user?: {
          id: number | string;
          email: string;
          firstName?: string;
          lastName?: string;
          role?: string;
        };
      };
    };
    const payload = json?.data;
    const u = payload?.user;
    if (!u || typeof u.id === "undefined" || typeof u.email !== "string") {
      return { ok: false, backendReached: true, status: res.status };
    }
    const role = String(u.role ?? "CUSTOMER").toUpperCase();
    return {
      ok: true,
      backendReached: true,
      user: {
        id: String(u.id),
        username: u.email,
        email: u.email,
        name:
          `${String(u.firstName ?? "")} ${String(u.lastName ?? "")}`.trim() ||
          input.name,
        role: role === "DEALER" || role === "ADMIN" || role === "DEALER_EMPLOYEE"
          ? role
          : "CUSTOMER",
        token: payload.accessToken,
      },
    };
  } catch {
    return { ok: false, backendReached: false };
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        // Single failing field for quick client mapping (zod `.flatten().fieldErrors`).
        field: parsed.error.issues[0]?.path[0]
          ? String(parsed.error.issues[0]?.path[0])
          : null,
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const input = {
    username: parsed.data.username,
    email: parsed.data.email,
    name: parsed.data.name ?? parsed.data.username,
    password: parsed.data.password,
  };

  // Throttle before forwarding anywhere, so a throttled caller costs neither a
  // bcrypt hash nor a backend round trip. Keyed on the email address, which is
  // unique per person — never the username (see the note above).
  if (!(await enforceRateLimit(request, { ...REGISTER_PER_EMAIL, identifier: input.email, key: "register" })).ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }
  // A plain per-caller ceiling on top, generous enough for shared NATs.
  if (!(await enforceRateLimit(request, { ...REGISTER_PER_CALLER, key: "register-caller" })).ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }

  // 1) NestJS backend (authoritative)
  const result = await registerViaNestJS(input);
  if (result.ok && result.user) {
    const token = await signSession(result.user);
    return applySessionCookies(
      // The access token stays inside the HttpOnly cookie — never in the body.
      NextResponse.json(
        { user: withoutToken(result.user), source: "backend" },
        { status: 201 },
      ),
      token,
      result.user.role,
    );
  }

  // The backend answered — its word is final.
  if (result.backendReached) {
    const status = result.status ?? 502;
    if (status === 409) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }
    if (status === 429) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    if (status >= 400 && status < 500) {
      return NextResponse.json({ error: "Registration failed" }, { status });
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 502 });
  }

  // Backend unreachable. NestJS is the only identity store, so there is nothing
  // safe to fall back to.
  return NextResponse.json(
    { error: "Registration is temporarily unavailable. Please try again later." },
    { status: 503 },
  );
}
