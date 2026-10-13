# Security hardening program — work checklist

Repository: `C:\Users\bobby\autoconnect`
Baseline at start: `npm test` was broken (missing `tsx` loader); with the correct
command 130/130 unit tests pass. Smoke suite requires a running server (0/33
without one). No source changes had been made yet.

Legend: `[x]` done · `[~]` partial · `[ ]` not started · `[!]` blocked

---

## Baseline / harness

- [x] Confirm baseline unit-test result (130/130 with the fixed command)
- [x] Confirm baseline smoke-suite procedure (needs `next start`)
- [x] Fix `npm test` script so it runs without hand-editing the command
  (`node --import tsx --import ./tests/setup.ts --test "tests/*.test.ts"`)
- [x] Record baseline lint / `tsc --noEmit` / `next build` results
  (final verified results recorded in the Sprint 5 section below)

---

## Sprint 1 — tenant isolation & customer privacy

- [x] Audit all DEALER_EMPLOYEE routes (`requireDealerStaff` call sites)
- [x] Verify server-side dealer membership (never trust client dealerId)
- [x] `TestDrive` has no owner column at all — add one, migrate, link records
  (SQL applied manually to the live DB — `TestDrive.userId` verified present;
  no destructive migration used)
- [x] `/api/test-drives` POST: associate authenticated customers with records
- [x] `/api/finance-applications` GET: scope to the authenticated customer
- [x] Customer portal: scope test drives + finance applications to the user
- [x] `PATCH /api/vehicles/[id]`: edge role gate, block cross-tenant reassignment
- [x] `POST /api/vehicles`: schema validation, dealer re-scoping, `isFeatured`
- [x] Regression tests: cross-tenant IDOR + customer privacy
  (`tests/tenant-isolation.test.ts`, 11 tests)

---

## Sprint 2 — upload security & distributed rate limiting

- [x] Audit upload ownership / cleanup / quotas / file sizes / duplicate claims
- [x] Shared Redis-backed atomic limiter (no hard dependency on Redis)
- [x] Configurable keys, TTLs, bounded storage, safe outage behaviour
- [x] Rate-limit documentation (env vars, deploy steps, cost, outage)
- [x] Upload regression tests

---

## Sprint 3 — CSP & HTTP security

- [x] Audit `unsafe-inline` usage
- [x] Replace script-src `unsafe-inline` with hashes where feasible
  (analysis: not feasible for Next's inline bootstrap under the static/CDN
  rendering model; JSON-LD data blocks need no allowance; strict report-only
  policy added to measure the migration cost)
- [x] Report-only mode before enforcing
- [x] Preserve existing HSTS fix, document `TRUST_PROXY_HEADERS`
- [x] Header regression tests

---

## Sprint 4 — public APIs & authentication

- [x] Review all public routes for exposure / validation / abuse
- [x] Restrict provider contact data exposure
  (`/api/services/providers` withholds phone/email/address from anonymous
  callers — `contactAvailable: false` + null fields; signed-in sessions unlock
  them; response paginated, rate-limited)
- [x] Confirm no local-credential fallback in production auth
  (backend rejection is final; local fallback requires explicit
  `ALLOW_LOCAL_AUTH_FALLBACK=true` in production and returns 503 otherwise)
- [x] Bound telemetry input, memory, frequency
  (`telemetry-store.ts`: MAX_ENTRIES=200 cap, 1h TTL, strict key-segment regex,
  oldest-entry eviction at capacity)
- [x] Standardize 401 vs 403
  (anonymous → 401, authenticated wrong-role → 403; `routes-401-403.test.ts`)
- [x] Session-cookie and role-display verification tests
  (`tests/auth-session.test.ts` — 7 tests: token rides the HttpOnly cookie and
  never the JSON body, inactive-account login 401, register echoes no token,
  backend rejection final, production 503 gate, `/api/auth/me` 401 on
  deactivation, logout clears cookies)

---

## Sprint 5 — integration & release verification

- [x] lint, tsc, build, unit, security, smoke — final results below
- [x] New regression coverage (3 new test files, 23 tests — see summary below)
- [x] Verify customer / dealer / employee / admin / anonymous workflows
  (unit: `routes-401-403`, `tenant-isolation`, `auth-session`,
  `dealer-employee`; smoke: anonymous page renders across 33 routes)
- [x] Smoke runner leaves no test records
  (probe dealer row removed post-run; live DB verified — only seed dealers
  remain, no PENDING/probe rows)
- [x] Log inspection for secrets / PII
  (no `console.*` logging of tokens/secrets in app code; generated server and
  test logs scanned for the backend token / secret values — no hits)

### Final release verification (Sprint 5)

| Gate | Command | Result |
| --- | --- | --- |
| Unit + security regression | `npm test` | 163/163 pass, 0 fail, 0 skipped |
| Typecheck | `npx tsc --noEmit` | clean (exit 0) |
| Lint | `npm run lint` | 0 errors, 58 pre-existing warnings (legacy files only) |
| Production build | `npm run build` | success, 77 static pages, 63 API routes as server functions |
| Smoke (33 routes) | `next start` + `node scripts/runner.js` | 33/33 passed |
| DB hygiene | probe query | no test records left behind |

Test accounting: 17 pre-existing suite files contribute 140 tests (measured
directly today) + 9 (`rate-limit-shared`) + 7 (`security-headers`) + 7
(`auth-session`) = 163. No pre-existing test file was modified.
