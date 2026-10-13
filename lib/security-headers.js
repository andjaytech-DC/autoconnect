"use strict";

/**
 * Security header and CSP construction, shared by next.config.js and the
 * header regression tests (tests/security-headers.test.ts).
 *
 * Two CSP layers are emitted:
 *
 *   • Content-Security-Policy (enforced) — the current, irreplaceable
 *     `'unsafe-inline'` policy. Removing `'unsafe-inline'` from script-src
 *     requires a nonce or a hash per script, and Next.js inlines its bootstrap
 *     at render time: hashes are not feasible for the framework scripts and a
 *     nonce forces every page to dynamic rendering, which this site's
 *     static/CDN-cached pages are not configured for. `'unsafe-inline'` is
 *     therefore documented as the known cost of the current rendering model,
 *     while every OTHER directive stays locked down.
 *
 *   • Content-Security-Policy-Report-Only (strict) — the target policy with no
 *     `'unsafe-inline'` anywhere. It never blocks anything; it only reports
 *     what WOULD be blocked, so the team can measure the real migration cost
 *     (starting with Next's own inlined bootstrap) before committing.
 *
 *     The JSON-LD blocks in app/cars/[id]/page.tsx and
 *     app/components/structuredData.tsx are `application/ld+json` data blocks;
 *     CSP does not govern non-executable script types, so they are compatible
 *     with the strict policy as-is and need no hash.
 */

const HSTS_VALUE = "max-age=63072000; includeSubDomains";

const ENFORCED_CSP_DIRECTIVES = {
  "default-src": "'self'",
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
  ],
  "style-src": "'self' 'unsafe-inline'",
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https://images.unsplash.com",
    "https://res.cloudinary.com",
    "https://*.cloudinary.com",
    "https://staticmap.openstreetmap.de",
    "http://localhost:5000",
  ],
  "font-src": "'self' data:",
  "connect-src": [
    "'self'",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "http://localhost:5000",
  ],
  "object-src": "'none'",
  "base-uri": "'self'",
  "form-action": "'self'",
  "frame-ancestors": "'none'",
  "worker-src": "'self' blob:",
  "manifest-src": "'self'",
};

/**
 * The target policy: identical to the enforced one except `'unsafe-inline'` is
 * gone from script-src and style-src. In report-only this measures exactly what
 * a hash/nonce migration would have to cover. `'unsafe-eval'` is still kept in
 * development (React's dev overlay), matching the enforced policy.
 */
const REPORT_ONLY_CSP_DIRECTIVES = {
  "default-src": "'self'",
  "script-src": [
    "'self'",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
  ],
  "style-src": "'self'",
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https://images.unsplash.com",
    "https://res.cloudinary.com",
    "https://*.cloudinary.com",
    "https://staticmap.openstreetmap.de",
    "http://localhost:5000",
  ],
  "font-src": "'self' data:",
  "connect-src": [
    "'self'",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "http://localhost:5000",
  ],
  "object-src": "'none'",
  "base-uri": "'self'",
  "form-action": "'self'",
  "frame-ancestors": "'none'",
  "worker-src": "'self' blob:",
  "manifest-src": "'self'",
};

function isTrueOrOn(raw) {
  return ["1", "true", "yes", "on"].includes((raw || "").trim().toLowerCase());
}

/** Default-on flag: unset/empty counts as enabled, explicit off disables. */
function defaultOn(raw) {
  const value = (raw || "").trim().toLowerCase();
  if (value === "") return true;
  return ["1", "true", "yes", "on"].includes(value);
}

function directiveString(name, sources, isDev) {
  const list = Array.isArray(sources) ? sources.slice() : [sources];
  // React's dev-mode error overlay needs `eval`; production builds do not.
  if (isDev && name === "script-src") list.push("'unsafe-eval'");
  return `${name} ${list.join(" ")}`.trim();
}

/**
 * Serialise a directives object into a header value. `upgrade-insecure-requests`
 * is appended only for production builds; in development an http:// origin must
 * be able to load its own local assets over plain HTTP.
 */
function buildCsp(directives, { isDev = false, isProd = false }) {
  return Object.entries(directives)
    .map(([name, sources]) => directiveString(name, sources, isDev))
    .join("; ")
    .concat(isProd ? "; upgrade-insecure-requests" : "");
}

function enforcedCspValue(flags) {
  return buildCsp(ENFORCED_CSP_DIRECTIVES, flags);
}

function reportOnlyCspValue(flags) {
  return buildCsp(REPORT_ONLY_CSP_DIRECTIVES, flags);
}

/**
 * A single Next.js response-header rule (the shape `next.config.js` `headers()`
 * consumes).
 *
 * @typedef {Object} HeaderRule
 * @property {string} source
 * @property {Array<{type: string, key?: string, value?: string, regex?: string}>} [has]
 * @property {Array<{key: string, value: string}>} headers
 */

/**
 * Build the response-header rules for every route.
 *
 * HSTS is opt-in and per-request: it is only ever attached when the deployment
 * vouches for TLS in `x-forwarded-proto` (`trustProxyHeaders`), so a plain-http
 * origin never sends a header that would make browsers refuse it later. The
 * correct place for HSTS in most setups remains the TLS terminator.
 *
 * @param {object} [options]
 * @param {boolean} [options.isDev]
 * @param {boolean} [options.isProd]
 * @param {boolean} [options.trustProxyHeaders]
 * @param {boolean} [options.reportOnly]
 * @param {string} [options.reportUri]
 * @returns {HeaderRule[]}
 */
function buildHeaderRules({
  isDev = false,
  isProd = false,
  trustProxyHeaders = false,
  reportOnly = true,
  reportUri,
}) {
  const baseHeaders = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Content-Security-Policy", value: enforcedCspValue({ isDev, isProd }) },
  ];

  if (reportOnly) {
    let value = reportOnlyCspValue({ isDev, isProd });
    if (reportUri) value += `; report-uri ${reportUri}`;
    baseHeaders.push({ key: "Content-Security-Policy-Report-Only", value });
  }

  const rules = [
    {
      source: "/:path*",
      headers: [{ key: "X-Frame-Options", value: "DENY" }, ...baseHeaders],
    },
  ];

  if (trustProxyHeaders) {
    rules.push({
      source: "/:path*",
      has: [{ type: "header", key: "x-forwarded-proto", value: "https" }],
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        ...baseHeaders,
        { key: "Strict-Transport-Security", value: HSTS_VALUE },
      ],
    });
  }

  return rules;
}

module.exports = {
  buildCsp,
  enforcedCspValue,
  reportOnlyCspValue,
  buildHeaderRules,
  isTrueOrOn,
  defaultOn,
  HSTS_VALUE,
  ENFORCED_CSP_DIRECTIVES,
  REPORT_ONLY_CSP_DIRECTIVES,
};