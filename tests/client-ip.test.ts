import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  trustProxyHeaders,
  resolveClientIp,
  UNIDENTIFIED_IP,
  isTrustedProxyHop,
} from "../app/lib/client-ip";
import { rateLimit, resetRateLimits } from "../app/lib/rate-limit";

/**
 * The limiter used to read `x-forwarded-for` unconditionally, so a caller could
 * mint a fresh identity — and therefore a fresh bucket — on every request.
 * The regression test for that is "a rotating header cannot buy extra budget".
 */

const ENV_KEYS = ["TRUST_PROXY_HEADERS", "TRUSTED_PROXIES", "NODE_ENV"] as const;
const originalEnv = new Map<string, string | undefined>(ENV_KEYS.map((k) => [k, process.env[k]]));

function setEnv(values: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

beforeEach(() => {
  setEnv(Object.fromEntries(ENV_KEYS.map((k) => [k, originalEnv.get(k)])));
  resetRateLimits();
});
afterEach(() => {
  setEnv(Object.fromEntries(ENV_KEYS.map((k) => [k, originalEnv.get(k)])));
  resetRateLimits();
});

function request(headers: Record<string, string>): Request {
  return new Request("https://example.test/api/probe", { headers });
}

test("proxy headers are ignored in production unless explicitly enabled", () => {
  setEnv({ NODE_ENV: "production", TRUST_PROXY_HEADERS: undefined });
  assert.equal(trustProxyHeaders(), false);

  const result = resolveClientIp(request({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "1.2.3.4" }));
  assert.deepEqual(result, { ip: UNIDENTIFIED_IP, trusted: false });
});

test("proxy headers are honoured in development by default", () => {
  setEnv({ NODE_ENV: "development", TRUST_PROXY_HEADERS: undefined });
  assert.equal(trustProxyHeaders(), true);
  assert.equal(resolveClientIp(request({ "x-forwarded-for": "1.2.3.4" })).ip, "1.2.3.4");
});

test("the explicit flag wins over the environment default in both directions", () => {
  setEnv({ NODE_ENV: "production", TRUST_PROXY_HEADERS: "true" });
  assert.equal(trustProxyHeaders(), true);
  setEnv({ NODE_ENV: "development", TRUST_PROXY_HEADERS: "false" });
  assert.equal(trustProxyHeaders(), false);
});

test("an unparseable flag value falls through to the environment default", () => {
  setEnv({ NODE_ENV: "development", TRUST_PROXY_HEADERS: "maybe" });
  assert.equal(trustProxyHeaders(), true);
});

test("the left-most hop of a trusted chain is the caller", () => {
  setEnv({ NODE_ENV: "development", TRUSTED_PROXIES: "10.0.0.5" });
  const result = resolveClientIp(
    request({ "x-forwarded-for": "203.0.113.9, 10.0.0.5" }),
  );
  assert.equal(result.ip, "203.0.113.9");
  assert.equal(result.trusted, true);
});

test("a chain ending at an untrusted hop is discarded entirely", () => {
  setEnv({ NODE_ENV: "development", TRUSTED_PROXIES: "10.0.0.5" });
  const result = resolveClientIp(
    request({ "x-forwarded-for": "203.0.113.9, 8.8.8.8" }),
  );
  assert.equal(result.trusted, false, "attacker-written chain must not be believed");
  assert.equal(result.ip, UNIDENTIFIED_IP);
});

test("CIDR blocks match, and a /0 entry trusts every hop", () => {
  setEnv({ TRUSTED_PROXIES: "192.168.0.0/16" });
  assert.ok(isTrustedProxyHop("192.168.17.42"));
  assert.ok(!isTrustedProxyHop("8.8.8.8"));

  setEnv({ TRUSTED_PROXIES: "0.0.0.0/0" });
  assert.ok(isTrustedProxyHop("8.8.8.8"), "/0 matches everything");
  const anyChain = resolveClientIp(request({ "x-forwarded-for": "203.0.113.9, 4.4.4.4" }));
  assert.equal(anyChain.trusted, true);
  assert.equal(anyChain.ip, "203.0.113.9");
});

test("an exact IP entry matches only itself", () => {
  setEnv({ TRUSTED_PROXIES: "10.0.0.5" });
  assert.ok(isTrustedProxyHop("10.0.0.5"));
  assert.ok(!isTrustedProxyHop("10.0.0.6"));
});

test("private and loopback caller claims are refused", () => {
  setEnv({ NODE_ENV: "development" });
  for (const claim of ["127.0.0.1", "10.1.2.3", "192.168.1.1", "172.16.0.9", "::1"]) {
    const result = resolveClientIp(request({ "x-forwarded-for": claim }));
    assert.equal(result.trusted, false, `${claim} must not become a bucket identity`);
    assert.equal(result.ip, UNIDENTIFIED_IP);
  }
});

test("rotating the forwarded header cannot buy extra request budget", () => {
  // Directly exposed app: no proxy header is trusted, so every caller shares
  // one bucket — which is the safe direction to fail.
  setEnv({ NODE_ENV: "production", TRUST_PROXY_HEADERS: "false", TRUSTED_PROXIES: "" });

  let allowed = 0;
  let blocked = 0;
  for (let i = 0; i < 40; i++) {
    const result = rateLimit(
      request({ "x-forwarded-for": `1.2.${Math.floor(i / 250)}.${i % 250}`, "x-real-ip": `9.9.9.${i}` }),
      { limit: 10, windowMs: 60_000, key: "probe" },
    );
    if (result.ok) allowed += 1;
    else blocked += 1;
  }
  assert.equal(allowed, 10, "only the first `limit` requests pass");
  assert.ok(blocked > 0, "further requests are throttled despite a new header each time");
});

test("when headers are trusted, distinct clients get distinct buckets", () => {
  setEnv({ NODE_ENV: "development", TRUSTED_PROXIES: "" });
  for (let i = 0; i < 40; i++) {
    const result = rateLimit(
      request({ "x-forwarded-for": `203.0.113.${i}` }),
      { limit: 10, windowMs: 60_000, key: "trusted" },
    );
    assert.ok(result.ok, `client ${i} should be independent`);
    assert.equal(result.trustedIp, true);
  }
});

test("the limiter result reports remaining budget and a retry hint", () => {
  setEnv({ NODE_ENV: "production", TRUST_PROXY_HEADERS: "false" });
  const first = rateLimit(request({}), { limit: 2, windowMs: 60_000, key: "budget" });
  assert.deepEqual(first, { ok: true, remaining: 1, trustedIp: false, retryAfter: 0 });

  const second = rateLimit(request({}), { limit: 2, windowMs: 60_000, key: "budget" });
  assert.equal(second.remaining, 0);

  const third = rateLimit(request({}), { limit: 2, windowMs: 60_000, key: "budget" });
  assert.equal(third.ok, false);
  assert.ok(third.retryAfter >= 1, "a throttled caller is told how long to wait");
});
