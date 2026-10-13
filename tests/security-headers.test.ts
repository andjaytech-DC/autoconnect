import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildHeaderRules,
  enforcedCspValue,
  reportOnlyCspValue,
  isTrueOrOn,
  defaultOn,
} from "../lib/security-headers.js";

/**
 * Sprint 3 — CSP & HTTP security headers.
 *
 * The header construction lives in lib/security-headers.js specifically so the
 * exact rules `next start` serves can be pinned here. The enforced policy keeps
 * `'unsafe-inline'` (Next.js inlines its bootstrap and React inlines styles
 * under the site's static/CDN-cached rendering model) while every other
 * directive is locked down; the report-only policy documents the strict target.
 */

test("the enforced policy is locked down in production", () => {
  const policy = enforcedCspValue({ isDev: false, isProd: true });
  for (const fragment of [
    "default-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "https://www.googletagmanager.com", // GA/GTM stay allowed
    "upgrade-insecure-requests",
  ]) {
    assert.ok(policy.includes(fragment), `missing ${fragment} in ${policy}`);
  }
  assert.ok(
    !policy.includes("unsafe-eval"),
    "the React dev overlay is the only reason 'unsafe-eval' exists",
  );
  assert.ok(policy.endsWith("upgrade-insecure-requests"));
});

test("development gets uneval'ed React but no TLS upgrade", () => {
  const policy = enforcedCspValue({ isDev: true, isProd: false });
  assert.ok(policy.includes("'unsafe-eval'"), "React dev overlay needs eval");
  assert.ok(!policy.includes("upgrade-insecure-requests"));
});

test("the strict report-only target has no unsafe-inline anywhere", () => {
  const strict = reportOnlyCspValue({ isDev: false, isProd: true });
  assert.ok(!strict.includes("'unsafe-inline'"), "target policy removes it");
  // The full cost of removing unsafe-inline is then observable per page.
  assert.ok(strict.includes("script-src 'self' https://www.googletagmanager.com"));
  assert.ok(strict.includes("style-src 'self'"));
});

test("the enforced+report-only headers are served on every route", () => {
  const rules = buildHeaderRules({
    isDev: false,
    isProd: true,
    trustProxyHeaders: false,
    reportOnly: true,
  });
  assert.equal(rules.length, 1, "without proxy trust there is exactly one rule");
  const headers = rules[0].headers;
  const keys = headers.map((h) => h.key);
  for (const key of [
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Content-Security-Policy",
    "Content-Security-Policy-Report-Only",
  ]) {
    assert.ok(keys.includes(key), `missing ${key}`);
  }
  assert.ok(!keys.includes("Strict-Transport-Security"));
  assert.equal(headers.find((h) => h.key === "X-Frame-Options")?.value, "DENY");
  assert.equal(headers.find((h) => h.key === "X-Content-Type-Options")?.value, "nosniff");
  assert.equal(
    headers.find((h) => h.key === "Referrer-Policy")?.value,
    "strict-origin-when-cross-origin",
  );
});

test("HSTS is opt-in, tightened to requests that arrive over TLS", () => {
  const rules = buildHeaderRules({ trustProxyHeaders: false, reportOnly: false });
  assert.equal(rules.length, 1);
  assert.ok(
    !rules[0].headers.some((h) => h.key === "Strict-Transport-Security"),
    "a deployment without a trusted proxy never emits HSTS",
  );

  const withHsts = buildHeaderRules({ trustProxyHeaders: true, reportOnly: false });
  assert.equal(withHsts.length, 2, "the HSTS rule is additive");
  const hstsRule = withHsts[1];
  assert.deepEqual(hstsRule.has, [
    { type: "header", key: "x-forwarded-proto", value: "https" },
  ], "HSTS only when the proxy vouches for a TLS request");
  const hsts = hstsRule.headers.find((h) => h.key === "Strict-Transport-Security");
  assert.ok(hsts, "HSTS header present on the https-only rule");
  assert.ok(hsts.value.startsWith("max-age=63072000"), `two years, got ${hsts.value}`);
  assert.ok(hsts.value.includes("includeSubDomains"));
});

test("the strict report-only policy can be disabled or pointed at a collector", () => {
  const off = buildHeaderRules({ reportOnly: false });
  assert.ok(
    !off[0].headers.some((h) => h.key === "Content-Security-Policy-Report-Only"),
    "CSP_REPORT_ONLY=off removes the header entirely",
  );

  const withUri = buildHeaderRules({ reportOnly: true, reportUri: "https://collector.example/csp" });
  const reportOnlyHeader = withUri[0].headers.find(
    (h) => h.key === "Content-Security-Policy-Report-Only",
  );
  assert.ok(
    reportOnlyHeader?.value.includes("report-uri https://collector.example/csp"),
    "violations can be shipped to a collector",
  );
});

test("env flag parsing: trust is explicit, report-only is default-on", () => {
  for (const value of ["1", "true", "YES", " on "]) {
    assert.equal(isTrueOrOn(value), true, `${value} is on`);
  }
  assert.equal(isTrueOrOn("0"), false);
  assert.equal(isTrueOrOn("false"), false);
  assert.equal(isTrueOrOn(""), false, "unset TRUST_PROXY_HEADERS is off");

  assert.equal(defaultOn(""), true, "unset CSP_REPORT_ONLY stays on");
  assert.equal(defaultOn("off"), false);
  assert.equal(defaultOn("0"), false);
  assert.equal(defaultOn("true"), true);
});