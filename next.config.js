/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";
const isProd = process.env.NODE_ENV === "production";

const {
  buildHeaderRules,
  defaultOn,
  isTrueOrOn,
} = require("./lib/security-headers");

/**
 * Header construction now lives in lib/security-headers.js (pure functions so
 * the header regression tests in tests/security-headers.test.ts can assert the
 * exact rules production serves). This file only resolves the environment
 * flags. See that module for the CSP design notes — in short, two layers:
 *
 *   - an enforced `Content-Security-Policy` that locks down everything except
 *     the `'unsafe-inline'` entries Next.js's inline bootstrap and React's
 *     inline styles require under the current static/CDN-cached rendering
 *     model;
 *   - a strict `Content-Security-Policy-Report-Only` with no `'unsafe-inline'`,
 *     so the migration cost is measured without breaking the site.
 *
 * Both are toggled below: `CSP_REPORT_ONLY` (default on, `off`/`0`/`false` to
 * disable) and `CSP_REPORT_URI` to point reports at a collector.
 */
const trustProxyHeaders = isTrueOrOn(process.env.TRUST_PROXY_HEADERS);
const reportOnly = defaultOn(process.env.CSP_REPORT_ONLY);
const reportUri = (process.env.CSP_REPORT_URI ?? "").trim() || undefined;

const securityHeaderRules = buildHeaderRules({
  isDev,
  isProd,
  trustProxyHeaders,
  reportOnly,
  reportUri,
});

/**
 * HSTS is opt-in and only ever sent for requests that actually arrived over
 * TLS.
 *
 * `NODE_ENV` cannot gate this: `next start` sets it to "production" even when
 * serving plain HTTP, so an env-only guard emits
 * `Strict-Transport-Security: max-age=63072000; includeSubDomains` from an
 * http:// origin — which caches that decision in the browser for two years,
 * with subdomains, and cannot be undone from the server. A site that is ever
 * reached over HTTP becomes unreachable until the cache expires.
 *
 * The signal therefore has to be per-request, not per-process. When TLS
 * terminates at a proxy (`TRUST_PROXY_HEADERS`), the proxy reports the original
 * scheme in `x-forwarded-proto`, and Next's `has` matching lets us attach the
 * header only when that says `https`. Outside such a deployment the rule is
 * absent entirely and HSTS is simply not sent — the correct default, because
 * the header is meaningless unless the response travelled over TLS.
 *
 * Preferred for most setups: configure HSTS at the TLS terminator
 * (nginx/ALB/CloudFront/Cloudflare) instead, where the decision is made on the
 * wire rather than inferred. See docs/security-headers.md.
 */

const nextConfig = {
  reactStrictMode: true,

  turbopack: {
    root: __dirname,
  },

  allowedDevOrigins: ['192.168.1.4'],

  async headers() {
    // Includes the HSTS rule only when TRUST_PROXY_HEADERS is set, and that
    // rule matches exclusively on x-forwarded-proto: https.
    return securityHeaderRules;
  },

  images: {
    // Catalogue art (`/cars/*`, `/products/*`) and user uploads (`/uploads/*`)
    // are served by this app from `public/`, so the Image Optimizer never
    // fetches the NestJS origin to render them. The dev-only
    // `dangerouslyAllowLocalIP` relaxation was only ever needed while those
    // paths were rewritten to `http://localhost:5000`; now that they resolve
    // locally, the strict SSRF default applies in every environment and no
    // image needs to reach a private IP. `remotePatterns` still constrains
    // every accepted remote upstream.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'staticmap.openstreetmap.de',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
      },
      {
        // Seeded NewCar catalogue rows point at Unsplash stock photos. Without
        // this the homepage returns 500 on next/image.
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
      },
    ],
  },
};

module.exports = nextConfig;