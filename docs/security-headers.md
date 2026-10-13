# HTTP security headers — CSP & HSTS

All response-header rules are defined in `lib/security-headers.js` (pure
functions) and asserted by `tests/security-headers.test.ts`. `next.config.js`
only resolves environment flags and passes them in.

## Content Security Policy

Two headers are served on every route:

| Header | Policy | Effect |
| --- | --- | --- |
| `Content-Security-Policy` | Enforced (lockdown, keeps `'unsafe-inline'`) | Blocks inline eval, external script hosts, framing, form exfiltration, object/base-uri abuse. |
| `Content-Security-Policy-Report-Only` | Strict target (no `'unsafe-inline'`) | Never blocks; reports what a hash/nonce migration *would* block. |

### Why `'unsafe-inline'` is still in the enforced policy

Next.js inlines its framework bootstrap scripts, and React renders inline
`style={{...}}` attributes throughout the UI. Removing `'unsafe-inline'`
requires one of:

- **Nonces** — force every page to dynamic rendering, disabling the static
  generation and CDN caching this site relies on; or
- **Hashes** — not feasible for Next's per-build (and in some cases per-request)
  inline bootstrap: the hash changes on every deploy/request, so the policy
  cannot be static.

The app's only deliberate inline scripts are the `application/ld+json` schema
blocks. CSP does not govern non-executable script types, so those already
satisfy the strict target with no allowance at all.

The **report-only** header therefore measures the real migration cost without
breaking the site. To migrate to a strict nonce policy: 1) collect a few days of
reports, 2) confirm the only violations are Next.js bootstrap + inline styles,
3) adopt `proxy.ts` with per-request nonces (see
`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`) and
drop `'unsafe-inline'` from `script-src`/`style-src`.

### Env flags

> **Read at build time.** In this Next.js version `next.config.js` `headers()`
> rules are resolved when the app is compiled and stamped into the build output.
> `next start` does not re-read these flags later. You must therefore set
> `TRUST_PROXY_HEADERS`, `CSP_REPORT_ONLY` and `CSP_REPORT_URI` **when the
> production image is built** (Docker build `ARG`/`ENV`, CI env, or
> `TRUST_PROXY_HEADERS=1 npm run build`), not at container run time. This was
> verified empirically with `next start` on a plain-http listener: with the flag
> present at build, `x-forwarded-proto: https` requests receive the HSTS header
> and plain-http requests do not; with the flag absent at build, HSTS is never
> emitted regardless of the request.

| Variable | Default | Meaning |
| --- | --- | --- |
| `CSP_REPORT_ONLY` | on | `off`/`0`/`false`/`no` to stop serving the report-only header. |
| `CSP_REPORT_URI` | *(unset)* | When set, violations are POSTed here (`report-uri`, CSP level 2 — works with every browser that enforces CSP). Point it at your collector (e.g. `https://your-reporter.example/csp`). |

## HSTS

`Strict-Transport-Security` is **opt-in and per-request**: it is emitted only
when the deployment tells Next that the request really arrived over TLS.

| Variable | Default | Meaning |
| --- | --- | --- |
| `TRUST_PROXY_HEADERS` | unset | Explicit `1`/`true`/`on`/`yes` to enable the HSTS rule (this header-side flag is never on implicitly — it must be set). Must be present **at build time** (see note above). |
| `TRUSTED_PROXIES` | *(unset)* | Optional comma-separated proxy IPs / CIDRs (see `app/lib/client-ip.ts`). When set, an XFF chain is trusted only if its last hop is one of these. |

With `TRUST_PROXY_HEADERS=true`, an HSTS rule is added that matches **only**
requests whose `x-forwarded-proto` is `https`. A plain-http origin never
receives an HSTS header — crucial because `max-age=63072000; includeSubDomains`
locks the browser decision in for two years and cannot be revoked from the
server.

Prefer configuring HSTS at the TLS terminator (nginx/ALB/CloudFront/Cloudflare)
over the app layer. See `app/lib/client-ip.ts` for why trusting
`x-forwarded-for` unconditionally is unsafe — the same flag governs rate-limit
bucket identity (`docs/rate-limiting.md`).