#!/usr/bin/env node
/**
 * Shared smoke runner — self-contained, no browser/Playwright dependency.
 *
 * Usage:
 *   node scripts/runner.js                       # against http://localhost:3000
 *   SMOKE_BASE_URL=https://example.com node scripts/runner.js
 *   node scripts/runner.js http://localhost:3001
 *
 * For each route: asserts HTTP 200, non-trivial HTML, and (where configured)
 * an expected text snippet in the rendered markup.
 */
'use strict';

const BASE = (process.argv[2] || process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const MIN_HTML_LEN = 5000; // rendered app shell should never be tiny

/**
 * Same DATABASE_URL the app reads, so the probe can clean up after itself when
 * run locally (CI has no database behind its placeholder). Ignoring a missing
 * file keeps `node scripts/runner.js` usable from any directory.
 */
try {
  const path = require('node:path');
  const fs = require('node:fs');
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath) && !process.env.DATABASE_URL) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (value) process.env[match[1]] = value;
    }
  }
} catch {
  /* DATABASE_URL cleanup is best-effort; the run still reports */
}

// route -> expected text substring in HTML (null = only status/length checks).
// Snippets are stable server-rendered copy; verified against the live app.
const ROUTES = [
  ['/', 'Everything Auto.'],
  ['/cars', 'Browse every certified car'],
  ['/electric-cars', 'Progressive AutoHub'],
  ['/marketplace', 'Accessories, tyres, batteries'],
  ['/brands/toyota', 'Toyota'],
  ['/login', 'Sign in to your account to continue'],
  ['/new-cars', null],
  ['/dealers', null],
  ['/finance', null],
  ['/services', null],
  ['/about', null],
  ['/sell', null],
  ['/car-check', null],
  ['/challan', null],
  ['/compare', null],
  ['/electric', null],
  ['/sitemap', null],
  ['/register', null],
  ['/privacy-policy', null],
  ['/terms', null],
  ['/careers', null],
  ['/insurance', null],
  ['/loans', null],
  ['/dealer/register', null],
  ['/wishlist', null],
  ['/bookings', null],
  ['/orders', null],
  ['/dashboard', null],
  ['/portal/admin', null],
  ['/portal/customer', null],
  ['/portal/dealer', null],
];

/**
 * Fixed identity for the dealer-registration probe.
 *
 * Deliberately NOT timestamped: the route detects duplicates by phone, so a
 * changing phone made every run insert a new PENDING Dealer row. With a fixed
 * payload a repeat run gets 409 instead, and the single row this probe creates
 * is deleted immediately afterwards (see cleanupSmokeDealer).
 */
const SMOKE_DEALER_BUSINESS_NAME = 'Smoke Motors';
const SMOKE_DEALER_PHONE = '9000000001';
const SMOKE_DEALER_EMAIL = 'smoke-dealer@example.com';

/**
 * Remove the Dealer row belonging to the registration probe.
 *
 * Deletes via SQL rather than an API endpoint: a DELETE route for dealers would
 * be production surface added purely so a test can tidy up, and smoke runs
 * should not depend on one existing.
 *
 * Guarded so it can only ever remove the untouched probe row: the match is on
 * the probe's fixed business name, phone and PENDING status, with no owning
 * user. When an id is supplied (the 201 case) it is pinned as well, so a
 * concurrent real registration can never be caught by accident.
 *
 * Called for both outcomes — a 201 means we just made the row, and a 409 means
 * an earlier run left one behind (typically a run whose database was
 * unreachable). Not retrying on 409 is how rows accumulated in the first
 * place, so cleanup is the single code path that handles both.
 *
 * Returns true when there is nothing left to clean (deleted, already gone, or
 * cleanup skipped because no database is reachable) and false when the probe
 * row is still there and worth reporting — the only case that fails the run.
 */
async function cleanupSmokeDealer(id) {
  if (process.env.SMOKE_CLEANUP === '0') {
    console.log('# cleanup skipped (SMOKE_CLEANUP=0) — probe dealer row kept for inspection');
    return true;
  }
  // CI provisions a placeholder DATABASE_URL with no server behind it, so a
  // failure to connect is expected there and must not fail the run.
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('# cleanup skipped — DATABASE_URL not set');
    return true;
  }

  let client;
  try {
    const { Client } = require('pg');
    client = new Client({ connectionString });
    await client.connect();

    const conditions = [
      '"businessName" = $1',
      'phone = $2',
      "status = 'PENDING'",
      '"userId" IS NULL',
    ];
    const params = [SMOKE_DEALER_BUSINESS_NAME, SMOKE_DEALER_PHONE];

    // Pin the id only when we know it; the fixed identity alone is enough to
    // identify the probe row on the 409 path.
    if (id !== null && id !== undefined) {
      params.push(id);
      conditions.push(`id = $${params.length}`);
    }

    const deleted = await client.query(
      `DELETE FROM "Dealer" WHERE ${conditions.join(' AND ')}`,
      params,
    );
    if (deleted.rowCount === 1) {
      console.log(`# cleanup removed probe dealer row${id ? ` #${id}` : ''}`);
      return true;
    }
    if (deleted.rowCount === 0) {
      // Nothing matched. Confirm there is genuinely nothing left, as opposed to
      // a row that has since been touched and must not be deleted blind.
      const still = await client.query(
        `SELECT id FROM "Dealer"
          WHERE "businessName" = $1 AND phone = $2 AND status = 'PENDING'`,
        [SMOKE_DEALER_BUSINESS_NAME, SMOKE_DEALER_PHONE],
      );
      return still.rowCount === 0;
    }

    // More than one row matched: the guard is too loose to be safe. Report it
    // rather than deleting rows this probe cannot vouch for.
    console.log(
      `# cleanup refused — ${deleted.rowCount} rows match the probe identity; ` +
        'delete them manually',
    );
    return false;
  } catch (err) {
    console.log(`# cleanup skipped — ${String(err.message || err)}`);
    return true;
  } finally {
    if (client) {
      try {
        await client.end();
      } catch {
        /* already closed */
      }
    }
  }
}

// Headless-style fetch: same as prior route QA sweep (dark=true UA)
async function fetchPage(path) {
  const res = await fetch(BASE + path, {
    redirect: 'follow',
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
      accept: 'text/html',
    },
  });
  const html = await res.text();
  return { res, html };
}

async function main() {
  let failures = 0;
  const results = [];

  for (const [route, expectedText] of ROUTES) {
    const errors = [];
    try {
      const { res, html } = await fetchPage(route);
      const ct = res.headers.get('content-type') || '';
      if (res.status !== 200) errors.push(`status ${res.status}`);
      if (!ct.includes('text/html')) errors.push(`bad content-type: "${ct}"`);
      if (html.length < MIN_HTML_LEN) errors.push(`html too short (${html.length} bytes)`);
      if (/<html/i.test(html) === false) errors.push('no <html> element');
      if (expectedText && !html.includes(expectedText)) {
        errors.push(`missing expected text: "${expectedText}"`);
      }
      results.push({ route, status: res.status, len: html.length, ok: errors.length === 0, errors });
    } catch (err) {
      results.push({ route, status: 0, len: 0, ok: false, errors: [String(err.message || err)] });
    }
    if (!results[results.length - 1].ok) failures++;
  }

  // Image upload continuity: multipart POST to /api/upload must stay a
  // JSON API (never an HTML crash page). Unauthenticated callers get a 401
  // JSON body — that proves the route, auth gate and multipart parsing are
  // wired end-to-end in CI. Full 201/sharp coverage needs a session cookie;
  // forging one is impossible here (AUTH_SECRET-signed JWT), so if
  // SMOKE_SESSION is set the runner replays it to assert the authenticated
  // path, otherwise the 401 contract is asserted.
  //   SMOKE_SESSION=$(node -e "…signSession…") node scripts/runner.js
  // Dealer registration regression guard: expect 201 { data: { id, status:
  // 'PENDING' } } or 409 — see the block below the handler for why the payload
  // is fixed and how the probe row is removed again.
  // Rate limit is 3/min/IP; CI runs once so this single probe never trips it.
  try {
    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(png1x1)], { type: 'image/png' }), 'smoke.png');
    const headers = {};
    if (process.env.SMOKE_SESSION) headers.Cookie = `pah_session=${process.env.SMOKE_SESSION}`;
    const res = await fetch(BASE + '/api/upload', { method: 'POST', body: form, headers });
    const ct = res.headers.get('content-type') || '';
    const errors = [];
    if (!ct.includes('application/json')) errors.push(`bad content-type: "${ct}"`);
    let body = null;
    try {
      body = await res.json();
    } catch {
      errors.push('response is not JSON');
    }
    if (body && typeof body === 'object' && !('url' in body) && !('error' in body)) {
      errors.push('missing url/error contract');
    }
    // 401 (no session) or 201 (SMOKE_SESSION present) are both wired;
    // anything else (500/HTML) means the pipeline broke.
    if (process.env.SMOKE_SESSION) {
      if (res.status !== 201) errors.push(`expected 201 with SMOKE_SESSION, got ${res.status}`);
      else if (!body?.url?.endsWith('.webp')) errors.push('missing sharp .webp url');
    } else if (res.status !== 401) {
      errors.push(`unexpected status ${res.status}`);
    }
    results.push({
      route: 'POST /api/upload (multipart)',
      status: res.status,
      len: JSON.stringify(body ?? '').length,
      ok: errors.length === 0,
      errors,
    });
    if (errors.length) failures++;
  } catch (err) {
    results.push({
      route: 'POST /api/upload (multipart)',
      status: 0,
      len: 0,
      ok: false,
      errors: [String(err.message || err)],
    });
    failures++;
  }

  // Dealer registration regression guard: POST a payload, expect 201
  // { data: { id, status: 'PENDING' } } or 409 (row already exists) — a
  // JSON answer either way, which is what proves the route, validation and
  // rate limiting are wired end-to-end in CI.
  //
  // Rate limit is 3/min/IP, so this single probe never trips it.
  //
  // Two things stop the probe from littering the database:
  //   1. the payload is FIXED, not timestamped. A per-run tag made every run
  //      create a new Dealer row (duplicate detection is by phone, and the
  //      phone changed every time), so a CI that runs daily accumulated
  //      hundreds of PENDING applications that no admin ever asked for.
  //   2. the probe row is deleted again afterwards, best-effort and only when
  //      a database is actually reachable. This runs for both 201 (we just
  //      created it) and 409 (an earlier run left it behind), so a run whose
  //      database was unreachable self-heals on the next attempt.
  //
  // Set SMOKE_CLEANUP=0 to keep the row for manual inspection.
  try {
    const res = await fetch(BASE + '/api/dealer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: SMOKE_DEALER_BUSINESS_NAME,
        ownerName: 'Smoke Owner',
        phone: SMOKE_DEALER_PHONE,
        email: SMOKE_DEALER_EMAIL,
        city: 'Noida',
        state: 'Uttar Pradesh',
        address: '12 Smoke Test Street',
        pincode: '201301',
      }),
    });
    const errors = [];
    let body = null;
    try {
      body = await res.json();
    } catch {
      errors.push('response is not JSON');
    }
    let createdId = null;
    if (res.status === 201) {
      if (body?.data?.status !== 'PENDING') errors.push('missing PENDING status in 201 body');
      createdId = body?.data?.id ?? null;
    } else if (res.status === 409) {
      if (!body?.error) errors.push('409 without JSON error message');
    } else {
      errors.push(`unexpected status ${res.status}`);
    }
    results.push({
      route: 'POST /api/dealer/register',
      status: res.status,
      len: JSON.stringify(body ?? '').length,
      ok: errors.length === 0,
      errors,
    });
    if (errors.length) failures++;

    // Only ever delete the row this probe is responsible for, and only while
    // it still looks like the untouched probe row (see cleanupSmokeDealer).
    const cleaned = await cleanupSmokeDealer(createdId);
    if (!cleaned) {
      results.push({
        route: 'cleanup probe dealer',
        status: 0,
        len: 0,
        ok: false,
        errors: ['probe dealer row left behind — delete it manually'],
      });
      failures++;
    }
  } catch (err) {
    results.push({
      route: 'POST /api/dealer/register',
      status: 0,
      len: 0,
      ok: false,
      errors: [String(err.message || err)],
    });
    failures++;
  }

  // Report in the same format as the earlier route QA sweep
  console.log(`# web smoke — ${BASE}`);
  for (const r of results) {
    const mark = r.ok ? 'ok  ' : 'FAIL';
    console.log(`${mark} ${r.status} ${r.route} len=${r.len}${r.errors.length ? ' :: ' + r.errors.join('; ') : ''}`);
  }
  console.log(`\n${results.length - failures}/${results.length} routes passed`);
  process.exitCode = failures ? 1 : 0;
}

main();
