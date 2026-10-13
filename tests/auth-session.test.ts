import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  UI_COOKIE,
  signSession,
} from "../app/lib/auth";
import { resetRateLimits } from "../app/lib/rate-limit";
import { resetLoginThrottle } from "../app/server/login-throttle";
import { findUserByEmail } from "../app/server/users";

/**
 * Sprint 4 — authentication & public API review.
 *
 * Exercises the login/register/me/logout surface against a fake NestJS backend:
 *
 *   • the backend access token must ride the HttpOnly session cookie and never
 *     appear in a JSON response body (where script or request logs could read
 *     it);
 *   • `isActive` is a real gate — a deactivated account cannot log in and a
 *     deactivated profile coalesces to 401;
 *   • registration in production requires the backend (local fallback is opt-in
 *     only), and a backend *rejection* is always final — never overridden by a
 *     local row created behind its back;
 *   • logout clears both cookies.
 *
 * The route modules capture `NESTJS_API_URL` at import time, so they are loaded
 * dynamically after the fake backend's URL is installed (same pattern as
 * tests/tenant-isolation.test.ts).
 */

const TOKEN = "sekret-backend-token-that-must-not-leak-into-bodies";

interface BackendState {
  down: boolean;
  inactiveEmails: Set<string>;
  inactiveProfile: boolean;
  /** Status the fake backend answers for /api/auth/register (201 = accept). */
  registerStatus: number;
}

async function startFakeBackend(state: BackendState) {
  const sockets = new Set<import("node:net").Socket>();

  const server = http.createServer((req, res) => {
    if (state.down) {
      req.socket.destroy();
      return;
    }
    const url = new URL(req.url ?? "/", "http://faketest");
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString("utf8");
    });
    req.on("end", () => {
      const send = (payload: unknown, status = 200) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(payload));
      };
      const readJson = (): Record<string, unknown> => {
        try {
          return JSON.parse(body || "{}") as Record<string, unknown>;
        } catch {
          return {};
        }
      };

      if (req.method === "POST" && url.pathname === "/api/auth/login") {
        const { email } = readJson();
        const user = {
          id: 42,
          email: String(email ?? ""),
          firstName: "Fake",
          lastName: "User",
          role: "CUSTOMER",
        };
        const inactive = state.inactiveEmails.has(String(email ?? ""));
        send({
          success: true,
          data: {
            accessToken: TOKEN,
            user: { ...user, isActive: !inactive },
          },
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/auth/register") {
        if (state.registerStatus !== 201) {
          send({ message: "Backend rejected the registration" }, state.registerStatus);
          return;
        }
        const { email } = readJson();
        send(
          {
            success: true,
            data: {
              accessToken: TOKEN,
              user: {
                id: 43,
                email: String(email ?? ""),
                firstName: "Fake",
                lastName: "User",
                role: "CUSTOMER",
              },
            },
          },
          201,
        );
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/auth/profile") {
        const isActive = !state.inactiveProfile;
        send({
          success: true,
          data: {
            id: 42,
            firstName: "Fake",
            lastName: "User",
            email: "profile@example.test",
            role: "CUSTOMER",
            isActive,
            permissions: [],
          },
        });
        return;
      }

      send({ message: `no fake route ${req.method} ${url.pathname}` }, 404);
    });
  });

  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    if (state.down) socket.destroy();
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo;
  return {
    port: address.port,
    state,
    setDown(down: boolean) {
      state.down = down;
      if (down) for (const socket of sockets) socket.destroy();
    },
    close: () =>
      new Promise<void>((resolve) => {
        // Force-kill every connection (including undici keep-alive sockets), or
        // server.close() would wait forever and keep the test process alive.
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

/** Decode a JWT payload segment without pulling in a JWT library. */
function decodeJwtPayload(jwt: string): string {
  const [, payloadSegment] = jwt.split(".");
  if (!payloadSegment) return "";
  return Buffer.from(payloadSegment, "base64url").toString("utf8");
}

const ENV_KEYS = ["NESTJS_API_URL", "NODE_ENV", "ALLOW_LOCAL_AUTH_FALLBACK"] as const;
const originalEnv = new Map<string, string | undefined>(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

function restoreEnv(): void {
  for (const [key, value] of originalEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

/** Assign env vars via the index signature (NODE_ENV is readonly-typed here). */
function setEnv(values: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

type RouteHandler = (request: Request) => Promise<Response>;
let backend: Awaited<ReturnType<typeof startFakeBackend>>;
let loginPOST: RouteHandler;
let registerPOST: RouteHandler;
let meGET: RouteHandler;
let logoutPOST: RouteHandler;

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

before(async () => {
  backend = await startFakeBackend({
    down: false,
    inactiveEmails: new Set(),
    inactiveProfile: false,
    registerStatus: 201,
  });
  process.env.NESTJS_API_URL = `http://127.0.0.1:${backend.port}/api`;
  ({ POST: loginPOST } = await import("../app/api/auth/login/route"));
  ({ POST: registerPOST } = await import("../app/api/auth/register/route"));
  ({ GET: meGET } = await import("../app/api/auth/me/route"));
  ({ POST: logoutPOST } = await import("../app/api/auth/logout/route"));
});

after(async () => {
  await backend.close();
  restoreEnv();
});

beforeEach(() => {
  restoreEnv();
  resetRateLimits();
  resetLoginThrottle();
  backend.setDown(false);
  backend.state.inactiveEmails.clear();
  backend.state.inactiveProfile = false;
  backend.state.registerStatus = 201;
});

afterEach(() => {
  restoreEnv();
});

test("login keeps the backend token in the HttpOnly cookie, out of the body", async () => {
  const response = await loginPOST(
    jsonRequest("https://example.test/api/auth/login", {
      username: "tokencookie@example.test",
      password: "password-123",
    }),
  );
  assert.equal(response.status, 200);
  const body = (await response.json()) as { user?: object; source?: string };
  assert.ok(body.user, "a user is returned");
  assert.equal(body.source, "backend");
  assert.ok(
    !JSON.stringify(body).includes(TOKEN),
    "the response body must never echo the access token",
  );

  const cookies = response.headers.getSetCookie();
  const session = cookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  const ui = cookies.find((c) => c.startsWith(`${UI_COOKIE}=`));
  assert.ok(session, "session cookie is set");
  assert.ok(session.includes("HttpOnly"), "session is HttpOnly");
  assert.ok(session.includes("SameSite=Lax"));
  assert.ok(session.includes("Path=/"));
  assert.ok(session.includes(`Max-Age=${SESSION_MAX_AGE}`));
  assert.ok(ui, "UI role cookie is set");
  assert.ok(ui.includes("CUSTOMER"), "UI cookie mirrors the role");

  // The token must have travelled — inside the signed JWT, not the JSON body.
  const jwt = session.slice(SESSION_COOKIE.length + 1).split(";")[0];
  assert.ok(decodeJwtPayload(jwt).includes(TOKEN), "token rides the session JWT");
});

test("a deactivated backend account cannot log in and gets no cookie", async () => {
  backend.setDown(false);
  backend.state.inactiveEmails.add("deactivated@example.test");
  const response = await loginPOST(
    jsonRequest("https://example.test/api/auth/login", {
      username: "deactivated@example.test",
      password: "password-123",
    }),
  );
  assert.equal(response.status, 401);
  assert.equal(response.headers.getSetCookie().length, 0, "no session cookie is issued");
});

test("registration echoes no token and signs the session cookie", async () => {
  const response = await registerPOST(
    jsonRequest("https://example.test/api/auth/register", {
      username: "newcustomer",
      email: "newcustomer@example.test",
      name: "New Customer",
      password: "password-123",
    }),
  );
  assert.equal(response.status, 201);
  const body = (await response.json()) as { user?: object; source?: string };
  assert.equal(body.source, "backend");
  assert.ok(
    !JSON.stringify(body).includes(TOKEN),
    "registration must not echo the token either",
  );
  assert.ok(
    response.headers
      .getSetCookie()
      .some((c) => c.startsWith(`${SESSION_COOKIE}=`) && c.includes("HttpOnly")),
  );
});

test("a backend registration rejection is final — never overridden locally", async () => {
  backend.state.registerStatus = 409;
  const response = await registerPOST(
    jsonRequest("https://example.test/api/auth/register", {
      username: "dupaccount",
      email: "duplicate@example.test",
      name: "Dup Account",
      password: "password-123",
    }),
  );
  assert.equal(response.status, 409, "the backend's 409 is passed through");
  assert.equal(
    await findUserByEmail("duplicate@example.test"),
    undefined,
    "no local account is created behind the backend's back",
  );
});

test("production registration requires the backend; local fallback is opt-in", async () => {
  setEnv({ NODE_ENV: "production", ALLOW_LOCAL_AUTH_FALLBACK: "false" });
  backend.setDown(true);

  // Unique per run: the local JSON store (.data/db.json) persists between runs,
  // so a fixed email would start tripping 409 duplicates from the second run on.
  const stamp = Date.now();
  const firstEmail = `gate1-${stamp}@example.test`;
  const secondEmail = `gate2-${stamp}@example.test`;

  const refused = await registerPOST(
    jsonRequest("https://example.test/api/auth/register", {
      username: `gateone${stamp % 100000}`,
      email: firstEmail,
      name: "Gate One",
      password: "password-123",
    }),
  );
  assert.equal(refused.status, 503, "backend down + none allowed → unavailable");
  assert.equal(await findUserByEmail(firstEmail), undefined);

  setEnv({ ALLOW_LOCAL_AUTH_FALLBACK: "true" });
  const allowed = await registerPOST(
    jsonRequest("https://example.test/api/auth/register", {
      username: `gatetwo${stamp % 100000}`,
      email: secondEmail,
      name: "Gate Two",
      password: "password-123",
    }),
  );
  assert.equal(allowed.status, 201, "explicit opt-in re-enables the fallback");
  assert.ok(await findUserByEmail(secondEmail), "local account created");
  const body = (await allowed.json()) as { source?: string };
  assert.equal(body.source, "local");
});

test("/api/auth/me coalesces a deactivated backend profile into 401", async () => {
  backend.state.inactiveProfile = true;
  const session = await signSession({
    id: "42",
    username: "profile@example.test",
    email: "profile@example.test",
    name: "Profile User",
    role: "CUSTOMER",
    token: TOKEN,
  });
  const response = await meGET(
    new Request("https://example.test/api/auth/me", {
      headers: { cookie: `${SESSION_COOKIE}=${session}` },
    }),
  );
  assert.equal(response.status, 401, "an inactive profile must not present as signed in");
});

test("logout clears the session and UI cookies", async () => {
  const session = await signSession({
    id: "7",
    username: "bye@example.test",
    email: "bye@example.test",
    name: "Bye",
    role: "CUSTOMER",
  });
  const response = await logoutPOST(
    new Request("https://example.test/api/auth/logout", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE}=${session}` },
    }),
  );
  assert.equal(response.status, 200);
  const cookies = response.headers.getSetCookie();
  const sessionCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  const uiCookie = cookies.find((c) => c.startsWith(`${UI_COOKIE}=`));
  assert.ok(sessionCookie?.includes("Max-Age=0"), "session cookie is cleared");
  assert.ok(uiCookie?.includes("Max-Age=0"), "UI cookie is cleared");
});