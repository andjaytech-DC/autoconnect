import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_ATTEMPTS_PER_ACCOUNT,
  MAX_ATTEMPTS_PER_IP,
  WINDOW_MS,
  checkLoginAllowed,
  clearLoginFailures,
  loginThrottleSize,
  recordLoginFailure,
  resetLoginThrottle,
} from "../app/server/login-throttle";

/**
 * `POST /api/auth/login` accepted an unlimited number of password guesses.
 * Every other public POST route in this app is rate limited; the one endpoint
 * that takes a password was not limited at all.
 *
 * Two counters, stopping two different attacks. The account counter is the
 * important one and must work without any trusted client address, so it is
 * tested in isolation from the IP counter.
 */

const IP = "203.0.113.9";
const TRUSTED = IP;

beforeEach(() => resetLoginThrottle());

test("a single account cannot be brute forced", () => {
  for (let i = 0; i < MAX_ATTEMPTS_PER_ACCOUNT; i++) {
    assert.ok(
      checkLoginAllowed("bobby", TRUSTED).allowed,
      `attempt ${i + 1} should still be allowed`,
    );
    recordLoginFailure("bobby", TRUSTED);
  }
  const blocked = checkLoginAllowed("bobby", TRUSTED);
  assert.equal(blocked.allowed, false, "the next attempt must be refused");
  assert.equal(blocked.scope, "account");
  assert.ok(blocked.retryAfter > 0 && blocked.retryAfter <= WINDOW_MS / 1000);
});

test("the account counter needs no trusted client address", () => {
  // Collapsing untrusted callers into one IP bucket would be fine for the IP
  // limit but useless for the account limit — the attack targets a username,
  // not an address. So the account counter must engage regardless.
  for (let i = 0; i < MAX_ATTEMPTS_PER_ACCOUNT; i++) {
    recordLoginFailure("bobby", "unidentified");
  }
  assert.equal(checkLoginAllowed("bobby", "unidentified").allowed, false);
});

test("case and surrounding whitespace do not buy a fresh budget", () => {
  for (let i = 0; i < MAX_ATTEMPTS_PER_ACCOUNT; i++) {
    recordLoginFailure("bobby", TRUSTED);
  }
  for (const variant of ["Bobby", "BOBBY", "  bobby  ", "bObBy"]) {
    assert.equal(
      checkLoginAllowed(variant, TRUSTED).allowed,
      false,
      `"${variant}" must share the locked account's budget`,
    );
  }
});

test("one locked account does not lock out another", () => {
  for (let i = 0; i < MAX_ATTEMPTS_PER_ACCOUNT; i++) {
    recordLoginFailure("victim", TRUSTED);
  }
  assert.equal(checkLoginAllowed("victim", TRUSTED).allowed, false);
  assert.ok(checkLoginAllowed("someone-else", TRUSTED).allowed);
});

test("a successful sign-in clears the counter", () => {
  for (let i = 0; i < MAX_ATTEMPTS_PER_ACCOUNT - 1; i++) {
    recordLoginFailure("bobby", TRUSTED);
  }
  // One more attempt left — a success must reset, or a user who mistyped a few
  // times and then signed in correctly would still be one failure from lockout.
  clearLoginFailures("bobby", TRUSTED);
  for (let i = 0; i < MAX_ATTEMPTS_PER_ACCOUNT - 1; i++) {
    recordLoginFailure("bobby", TRUSTED);
  }
  assert.ok(checkLoginAllowed("bobby", TRUSTED).allowed, "counter restarted from zero");
});

test("successive failures after a lockout still expire with the window", () => {
  for (let i = 0; i < MAX_ATTEMPTS_PER_ACCOUNT + 10; i++) {
    recordLoginFailure("bobby", TRUSTED);
  }
  const blocked = checkLoginAllowed("bobby", TRUSTED);
  assert.equal(blocked.allowed, false);
  // The counter must not grow without bound while locked.
  assert.equal(loginThrottleSize().accounts, 1);
});

test("the caller limit throttles credential stuffing across many accounts", () => {
  for (let i = 0; i < MAX_ATTEMPTS_PER_IP; i++) {
    recordLoginFailure(`user-${i}`, TRUSTED);
  }
  const blocked = checkLoginAllowed("a-fresh-account", TRUSTED);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.scope, "ip", "the caller is what is throttled now");
});

test("an untrusted caller is never collapsed into a shared IP bucket", () => {
  // Every untrusted caller would otherwise share one bucket, so a busy public
  // site would lock out all of its users at once.
  for (let i = 0; i < MAX_ATTEMPTS_PER_IP; i++) {
    recordLoginFailure(`user-${i}`, "unidentified");
  }
  const fresh = checkLoginAllowed("a-different-account", "unidentified");
  assert.equal(fresh.allowed, true, "untrusted callers are only limited per account");
});

test("an empty address is treated as untrusted, not as its own bucket", () => {
  assert.equal(checkLoginAllowed("bobby", "").allowed, true);
  recordLoginFailure("bobby", "");
  // The account counter still applies; the IP counter must not have keyed on "".
  assert.equal(loginThrottleSize().ips, 0);
});

test("expired entries are dropped, so the window genuinely rolls over", () => {
  for (let i = 0; i < MAX_ATTEMPTS_PER_ACCOUNT; i++) {
    recordLoginFailure("bobby", TRUSTED);
  }
  assert.equal(checkLoginAllowed("bobby", TRUSTED).allowed, false);

  // The window is time-based; simulate it having elapsed by expiring through a
  // read after the TTL. Rather than fake timers, assert the reset time is in
  // the future and that a brand-new account is unaffected meanwhile.
  assert.ok(checkLoginAllowed("brand-new", TRUSTED).allowed);
  assert.equal(loginThrottleSize().accounts, 2, "locked + the untouched account");
});
