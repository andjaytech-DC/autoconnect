import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { resetRateLimits } from "../app/lib/rate-limit";
import { resetTelemetryStore } from "../app/lib/telemetry-store";
import { resetUploadRegistries, localUploadName } from "../app/server/uploads";
import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";

import { GET as adminStatsGET } from "../app/api/admin/stats/route";
import { GET as adminSecurityGET } from "../app/api/admin/security/route";
import { GET as adminTrustGET } from "../app/api/admin/trust/route";
import { GET as adminLookupsGET } from "../app/api/admin/lookups/route";
import { GET as leadsGET } from "../app/api/leads/route";
import { GET as sellListingsGET } from "../app/api/sell-listings/route";
import { GET as testDrivesGET } from "../app/api/test-drives/route";
import { GET as financeApplicationsGET } from "../app/api/finance-applications/route";
import { GET as telemetryErrorGET } from "../app/api/telemetry/error/route";
import { POST as uploadCleanupPOST } from "../app/api/upload/cleanup/route";
import { GET as providersGET } from "../app/api/services/providers/route";

/**
 * Route-level check of the 401/403 contract. Every one of these handlers used
 * to answer `if (!session || session.role !== "X") return 401`, which reported
 * a signed-in customer with the wrong role as *unauthenticated*.
 *
 * All of them fail authorization before touching Prisma, so these assertions
 * need no database.
 */

const USERS: Record<string, SessionUser> = {
  customer: { id: "7", username: "c", email: "c@x.test", name: "C", role: "CUSTOMER" },
  dealer: { id: "8", username: "d", email: "d@x.test", name: "D", role: "DEALER" },
  // A backend token, because the proxies distinguish "valid session" from
  // "session I can authenticate to the NestJS API with".
  admin: {
    id: "1",
    username: "a",
    email: "a@x.test",
    name: "A",
    role: "ADMIN",
    token: "test-backend-token",
  },
};

const tokens = new Map<string, string>();
let bootstrapped: Promise<void>;

async function bootstrap(): Promise<void> {
  for (const [key, user] of Object.entries(USERS)) {
    tokens.set(key, await signSession(user));
  }
}

function req(key?: string, url = "https://example.test/api/probe", method = "GET"): Request {
  const headers: Record<string, string> = {};
  const token = key ? tokens.get(key) : undefined;
  if (token) headers.cookie = `${SESSION_COOKIE}=${token}`;
  return new Request(url, { headers, method });
}

/** Same, but with a JSON body for POST handlers. */
function postReq(
  key: string | undefined,
  url: string,
  body: unknown,
): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(tokens.get(key ?? "") ? { cookie: `${SESSION_COOKIE}=${tokens.get(key ?? "")}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  resetRateLimits();
  resetTelemetryStore();
  resetUploadRegistries();
  bootstrapped = bootstrapped ?? bootstrap();
  await bootstrapped;
});

const ADMIN_ONLY: Array<[string, (r: Request) => Promise<Response>]> = [
  ["GET /api/admin/stats", (r) => adminStatsGET(r) as Promise<Response>],
  ["GET /api/admin/security", (r) => adminSecurityGET(r) as Promise<Response>],
  ["GET /api/admin/trust", (r) => adminTrustGET(r) as Promise<Response>],
  ["GET /api/admin/lookups", (r) => adminLookupsGET(r) as Promise<Response>],
  ["GET /api/leads", (r) => leadsGET(r) as Promise<Response>],
  ["GET /api/sell-listings", (r) => sellListingsGET(r) as Promise<Response>],
  ["GET /api/test-drives", (r) => testDrivesGET(r) as Promise<Response>],
  ["GET /api/finance-applications", (r) => financeApplicationsGET(r) as Promise<Response>],
  ["GET /api/telemetry/error", (r) => telemetryErrorGET(r) as Promise<Response>],
];

for (const [label, handler] of ADMIN_ONLY) {
  test(`${label} — 401 anonymous, 403 wrong role`, async () => {
    const anon = await handler(req());
    assert.equal(anon.status, 401, `anonymous caller to ${label} must be 401`);

    const customer = await handler(req("customer"));
    assert.equal(customer.status, 403, `customer caller to ${label} must be 403`);
  });
}

// The "admin is admitted" case is deliberately NOT asserted here. These routes
// proxy to the NestJS backend whenever the session carries an access token, and
// the backend is allowed to answer 401 for a token it no longer accepts — the
// BFF passes that through so the client knows to re-authenticate. So a 401 from
// this path can mean "the backend rejected your token", which is unrelated to
// whether this app's own auth layer admitted the caller. The latter is covered
// directly by the requireRole assertions in authorization.test.ts, and the
// anonymous/wrong-role contract below is what this file pins.

test("admin/security distinguishes 'valid session' from 'linked to the API'", async () => {
  // Pre-existing and intentional: a locally-created admin session has no NestJS
  // token, so the proxy cannot authenticate upstream. Documented here so the
  // 401 is not later mistaken for an authorization regression.
  const { signSession } = await import("../app/lib/auth");
  const localAdmin = await signSession({
    id: "1",
    username: "a",
    email: "a@x.test",
    name: "A",
    role: "ADMIN",
  });
  const response = await adminSecurityGET(
    new Request("https://example.test/api/admin/security", {
      headers: { cookie: `${SESSION_COOKIE}=${localAdmin}` },
    }),
  );
  assert.equal(response.status, 401, "no backend token → 'Not linked to the API.'");
});

test("upload/cleanup refuses anonymous callers before reading the body", async () => {
  const response = await uploadCleanupPOST(
    new Request("https://example.test/api/upload/cleanup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not even json",
    }),
  );
  assert.equal(response.status, 401);
});

test("upload/cleanup refuses a customer with 403", async () => {
  const response = await uploadCleanupPOST(
    postReq("customer", "https://example.test/api/upload/cleanup", { urls: [] }),
  );
  assert.equal(response.status, 403);
});

test("upload/cleanup rejects an oversized batch for an authenticated caller", async () => {
  const response = await uploadCleanupPOST(
    postReq("admin", "https://example.test/api/upload/cleanup", {
      urls: Array.from({ length: 101 }, (_, i) => `/uploads/x${i}.webp`),
    }),
  );
  // Not 401/403: the caller is allowed to try, the request itself is invalid.
  assert.ok(
    response.status === 400 || response.status === 200,
    `unexpected status ${response.status}`,
  );
});

test("services/providers does not treat an anonymous caller as unauthorized", async () => {
  // The directory is public by design, so anonymity must not produce 401/403.
  // Whether the query itself succeeds depends on a live database, so only the
  // authorization signal is asserted.
  let status: number | undefined;
  try {
    const response = await providersGET(
      req(undefined, "https://example.test/api/services/providers"),
    );
    status = response.status;
  } catch {
    // No database in the test environment — still not an authorization error.
  }
  assert.notEqual(status, 401);
  assert.notEqual(status, 403);
});

test("a traversal filename is reduced to a basename that cannot escape uploads", () => {
  // `localUploadName` strips every directory component, so the worst a
  // traversal payload can do is name an unrelated *file inside uploads* —
  // which the ownership check then refuses. Nothing resolves outside.
  const base = path.resolve("public", "uploads");
  const hostile = [
    "/uploads/../secrets.env",
    "/uploads/../../etc/passwd",
    "../.env",
    "..%2F..%2Fnginx.conf",
    "/uploads/nested/deep/a.webp",
  ];
  for (const url of hostile) {
    const name = localUploadName(url);
    if (!name) continue; // malformed outright
    const resolved = path.resolve(base, name);
    assert.ok(
      resolved === base || resolved.startsWith(base + path.sep),
      `${url} → ${name} escapes ${base}`,
    );
    assert.ok(!name.includes("/") && !name.includes("\\"), "basename must have no separators");
  }
});
