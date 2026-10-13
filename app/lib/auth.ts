import { SignJWT, jwtVerify } from "jose";

/**
 * Session utilities — edge-safe (jose only, no bcrypt/fs).
 *
 * The signed session JWT lives in `pah_session`, which is `HttpOnly`: no script
 * can read it, so an XSS bug cannot exfiltrate a live session.
 *
 * Client components still need to know *whether* a session exists and which
 * role it has (the notification bell, role-aware links). That comes from
 * `pah_ui`, a separate, non-sensitive cookie holding only the role. It carries
 * no identity, no token and nothing an attacker would gain from reading or
 * forging — and it is never an authorization input. Every server-side check
 * re-verifies the signed JWT in `pah_session`.
 */

export const SESSION_COOKIE = "pah_session";
/** Non-sensitive UI cookie: role only, readable by script. */
export const UI_COOKIE = "pah_ui";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

export type UserRole = "CUSTOMER" | "DEALER" | "ADMIN" | "DEALER_EMPLOYEE";

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  /** NestJS access token — lets BFF route handlers authenticate to the backend. */
  token?: string;
}

/**
 * A session user with the backend access token removed.
 *
 * The token rides only in the `pah_session` HttpOnly cookie; it must never be
 * handed back to the browser as JSON, where any script on the page (or any log
 * that records request/response bodies) could read it. Route responses are
 * rendered from this shape.
 */
export type SessionUserView = Omit<SessionUser, "token">;

export function withoutToken(user: SessionUser): SessionUserView {
  const { token: _token, ...view } = user;
  return view;
}

export interface SessionPayload extends SessionUser {
  iat?: number;
  exp?: number;
}

/** Non-secret placeholder used only outside production. */
const DEV_SECRET_FALLBACK = "progressive-autohub-dev-secret-please-set-AUTH_SECRET";

/**
 * Resolve the session signing key, failing closed in production.
 *
 * SECURITY: this previously fell back to a hard-coded string that is committed
 * to the repository, so any deployment that forgot AUTH_SECRET would sign and
 * verify sessions with a publicly known key — anyone could mint an ADMIN cookie.
 * In production we now refuse to run. The dev fallback is retained so local
 * development needs no extra setup.
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET must be set in production. Refusing to sign or verify sessions with a default value.",
      );
    }
    return new TextEncoder().encode(DEV_SECRET_FALLBACK);
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifySession(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  // Resolved outside the try/catch on purpose: a missing AUTH_SECRET is a
  // deployment misconfiguration and must surface loudly, not be swallowed into
  // a null session (which would silently log every user out).
  const key = getSecretKey();
  try {
    const { payload } = await jwtVerify(token, key);
    if (typeof payload.id !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Route-handler helper: read the session cookie from a `Request`. */
export function readSessionCookie(request: Request): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  const match = header
    .split("; ")
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  return match?.slice(SESSION_COOKIE.length + 1);
}

/**
 * `Set-Cookie` for the signed session. HttpOnly + SameSite=Lax so the JWT is
 * never exposed to script and is not sent on cross-site POSTs.
 */
export function sessionCookieValue(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`;
}

/**
 * `Set-Cookie` for the UI role mirror. Deliberately NOT HttpOnly — the shell
 * reads it to avoid a round trip — and deliberately carrying nothing sensitive.
 */
export function uiCookieValue(role: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${UI_COOKIE}=${encodeURIComponent(role)}; Path=/; Max-Age=${SESSION_MAX_AGE}; SameSite=Lax${secure}`;
}

/** `Set-Cookie` values that clear the session and the UI role mirror. */
export function clearSessionCookies(): string[] {
  return [`${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
          `${UI_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`];
}

/** Read just the role from the UI cookie. UX-only — never authorize on this. */
export function readUiRole(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split("; ")) {
    if (!part.startsWith(`${UI_COOKIE}=`)) continue;
    const raw = decodeURIComponent(part.slice(UI_COOKIE.length + 1));
    return isKnownRole(raw) ? raw : null;
  }
  return null;
}

const ROLE_VALUES: readonly UserRole[] = [
  "CUSTOMER",
  "DEALER",
  "ADMIN",
  "DEALER_EMPLOYEE",
];

/** True when `role` is one of the four known roles. */
export function isKnownRole(role: string): role is UserRole {
  return ROLE_VALUES.includes(role as UserRole);
}

/**
 * Whether the built-in credential store may be used.
 *
 * The local store exists so the app is usable before the NestJS backend is
 * deployed. It is a separate, weaker source of truth: a user who was removed,
 * disabled or demoted in the backend still has a working local row, so in
 * production the backend must be the only way in. Set
 * ALLOW_LOCAL_AUTH_FALLBACK=true to re-enable it for a specific deployment.
 */
export function localAuthAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const raw = (process.env.ALLOW_LOCAL_AUTH_FALLBACK ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}
