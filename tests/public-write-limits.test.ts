import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { resetRateLimits, rateLimit } from "../app/lib/rate-limit";
import { resetLoginThrottle } from "../app/server/login-throttle";
import { POST as registerPOST } from "../app/api/auth/register/route";
import { POST as quotePOST } from "../app/api/insurance/quote/route";

/**
 * The last two public write endpoints had no rate limiting at all.
 *
 * The subtlety is that a plain per-IP limit is worse than useless in a
 * production deployment: `resolveClientIp` collapses every untrusted caller
 * into one shared bucket, so without `TRUST_PROXY_HEADERS` the Nth request
 * from *anyone* trips the limit and the site stops accepting sign-ups. The
 * `identifier` option exists so limits can be keyed on something the caller
 * supplied, which is always available.
 */

const ENV_KEYS = ["TRUST_PROXY_HEADERS", "TRUSTED_PROXIES", "NODE_ENV"] as const;
const originalEnv = new Map<string, string | undefined>(ENV_KEYS.map((k) => [k, process.env[k]]));

beforeEach(() => {
  resetRateLimits();
  resetLoginThrottle();
  for (const [k, v] of originalEnv) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
afterEach(() => {
  for (const [k, v] of originalEnv) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  resetRateLimits();
});

function req(path: string, body: unknown): Request {
  return new Request(`https://example.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("an identifier is discriminated independently of the caller", () => {
  // Two different identifiers from the same (unknown) caller must not share a
  // budget — this is the property that makes an untrusted deployment workable.
  for (let i = 0; i < 5; i++) {
    assert.ok(rateLimit(new Request("https://example.test/x"), {
      limit: 5,
      windowMs: 60_000,
      key: "probe",
      identifier: "alice@example.test",
    }).ok);
  }
  assert.equal(
    rateLimit(new Request("https://example.test/x"), {
      limit: 5,
      windowMs: 60_000,
      key: "probe",
      identifier: "alice@example.test",
    }).ok,
    false,
    "alice is now over budget",
  );
  assert.ok(
    rateLimit(new Request("https://example.test/x"), {
      limit: 5,
      windowMs: 60_000,
      key: "probe",
      identifier: "bob@example.test",
    }).ok,
    "a different identifier starts fresh",
  );
});

test("the identifier is normalised so case cannot buy a fresh budget", () => {
  for (let i = 0; i < 3; i++) {
    rateLimit(new Request("https://example.test/x"), {
      limit: 3,
      windowMs: 60_000,
      key: "probe",
      identifier: "Alice@Example.test",
    });
  }
  assert.equal(
    rateLimit(new Request("https://example.test/x"), {
      limit: 3,
      windowMs: 60_000,
      key: "probe",
      identifier: "  ALICE@EXAMPLE.TEST  ",
    }).ok,
    false,
    "case and whitespace must not create a new bucket",
  );
});

test("registration is throttled per identity even for an untrusted caller", async () => {
  // No proxy headers are sent, so every caller here resolves to "unidentified"
  // even though development defaults to trusting them. That is exactly the
  // production-without-TRUST_PROXY_HEADERS case: one shared bucket.
  process.env.TRUST_PROXY_HEADERS = "false";

  const statuses: number[] = [];
  for (let i = 0; i < 7; i++) {
    const res = await registerPOST(
      req("/api/auth/register", {
        username: "probeuser",
        email: "probe@example.test",
        password: "a-valid-password-123",
      }),
    );
    statuses.push(res.status);
  }

  // 201 (created), 409 (already exists) or 429 (throttled) — never 500/HTML.
  for (const status of statuses) {
    assert.ok(
      [201, 409, 429].includes(status),
      `unexpected register status ${status}`,
    );
  }
  assert.ok(
    statuses.slice(5).every((s) => s === 429),
    `registration must throttle after the identity budget, got ${statuses.join(",")}`,
  );
});

test("probing one address does not exhaust another", async () => {
  for (let i = 0; i < 6; i++) {
    await registerPOST(
      req("/api/auth/register", {
        username: "probeuser",
        email: "probe-a@example.test",
        password: "a-valid-password-123",
      }),
    );
  }
  // A different email must still be accepted, not blocked by the other's usage.
  const other = await registerPOST(
    req("/api/auth/register", {
      username: "probeuser",
      email: "probe-b@example.test",
      password: "a-valid-password-123",
    }),
  );
  assert.notEqual(other.status, 429, "a different identity must not be throttled");
});

test("a common username is never throttled by other people's sign-ups", async () => {
  // Regression: keying the limit on username locks a popular name for everyone
  // after N sign-ups, because usernames are drawn from a small pool.
  for (let i = 0; i < 5; i++) {
    await registerPOST(
      req("/api/auth/register", {
        username: "alex",
        email: `alex-${i}@example.test`,
        password: "a-valid-password-123",
      }),
    );
  }
  // Five different people have now taken the name "alex". A sixth must still
  // get a normal answer, not a 429 caused by the shared username.
  const sixth = await registerPOST(
    req("/api/auth/register", {
      username: "alex",
      email: "alex-the-sixth@example.test",
      password: "a-valid-password-123",
    }),
  );
  assert.notEqual(sixth.status, 429, "a popular username must not be locked out");
  assert.ok(
    [201, 409].includes(sixth.status),
    `expected a real answer, got ${sixth.status}`,
  );
});

test("a malformed registration body is not throttled", async () => {
  for (let i = 0; i < 8; i++) {
    const res = await registerPOST(
      req("/api/auth/register", { username: "x", email: "bad", password: "short" }),
    );
    assert.equal(res.status, 400, "validation failure happens before the limit");
  }
  const res = await registerPOST(
    req("/api/auth/register", {
      username: "probeuser",
      email: "validation-ok@example.test",
      password: "a-valid-password-123",
    }),
  );
  assert.notEqual(res.status, 429, "junk requests must not burn the budget");
});

test("the insurance quote calculator answers and is throttled", async () => {
  const valid = {
    idv: 500_000,
    vehicleAgeYears: 3,
    engineCc: 1200,
    coverType: "COMPREHENSIVE",
    ncbSlab: 20,
    addons: ["ZERO_DEP"],
  };

  const res = await quotePOST(req("/api/insurance/quote", valid));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.quote, "a quote is returned");
  assert.ok(body.quote.total > 0, "the total is computed");
  assert.equal(body.quote.gst > 0, true, "GST is applied");

  // Validation still rejects nonsense.
  const bad = await quotePOST(req("/api/insurance/quote", { ...valid, idv: 1 }));
  assert.equal(bad.status, 400);
});

test("the quote calculator can be throttled when hammered", async () => {
  const valid = {
    idv: 500_000,
    vehicleAgeYears: 3,
    engineCc: 1200,
    coverType: "COMPREHENSIVE",
    ncbSlab: 0,
    addons: [],
  };
  // 120/min is the documented ceiling; ask for 130 to prove it engages.
  let throttled = false;
  for (let i = 0; i < 130; i++) {
    const res = await quotePOST(req("/api/insurance/quote", valid));
    if (res.status === 429) {
      throttled = true;
      break;
    }
  }
  assert.ok(throttled, "the quote endpoint must eventually refuse requests");
});
