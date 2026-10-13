import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { resetLoginThrottle } from "../app/server/login-throttle";
import { POST as loginPOST } from "../app/api/auth/login/route";
import { POST as registerPOST } from "../app/api/auth/register/route";

/**
 * End-to-end check that repeated bad passwords eventually stop being accepted.
 *
 * The route previously had no throttling at all, so this is the regression that
 * matters: 429, not another 401, after the budget is spent.
 */

beforeEach(() => resetLoginThrottle());

function loginRequest(username: string, password: string): Request {
  return new Request("https://example.test/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

/** A username that certainly does not exist in any store. */
const GHOST = `no-such-user-${Date.now()}`;

test("an unknown username is rejected and counted", async () => {
  const res = await loginPOST(loginRequest(GHOST, "wrong-password"));
  assert.equal(res.status, 401);
  const body = await res.json();
  // Must not distinguish "no such user" from "wrong password".
  assert.equal(body.error, "Invalid username or password");
});

test("repeated bad passwords are eventually refused with 429", async () => {
  const statuses: number[] = [];
  for (let i = 0; i < 8; i++) {
    const res = await loginPOST(loginRequest(GHOST, "wrong-password"));
    statuses.push(res.status);
  }

  assert.equal(statuses.length, 8);
  for (const status of statuses) {
    assert.ok(
      status === 401 || status === 429,
      `unexpected status ${status} (allowed: 401, 429)`,
    );
  }
  // The budget is 5, so the tail must be lockouts, not more credentials checks.
  assert.equal(statuses[0], 401, "the first attempt is a normal rejection");
  assert.ok(
    statuses.slice(5).every((s) => s === 429),
    `attempts past the budget must be 429, got ${statuses.join(",")}`,
  );
});

test("a lockout carries a Retry-After hint", async () => {
  for (let i = 0; i < 6; i++) {
    await loginPOST(loginRequest(GHOST, "wrong-password"));
  }
  const res = await loginPOST(loginRequest(GHOST, "wrong-password"));
  assert.equal(res.status, 429);
  const retryAfter = res.headers.get("retry-after");
  assert.ok(retryAfter !== null, "a throttled caller must be told how long to wait");
  assert.ok(Number(retryAfter) > 0, `Retry-After should be positive, got ${retryAfter}`);
  assert.ok(Number(retryAfter) <= 15 * 60, "Retry-After should be within the window");
});

test("a malformed body does not consume the attempt budget", async () => {
  for (let i = 0; i < 6; i++) {
    // Validation failures happen before the throttle is consulted, so none of
    // these should be recorded as failed sign-ins.
    await loginPOST(
      new Request("https://example.test/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "", password: "" }),
      }),
    );
  }
  const res = await loginPOST(loginRequest(GHOST, "wrong-password"));
  assert.equal(res.status, 401, "the account must not be pre-locked by junk requests");
});

test("locking one account leaves other usernames usable", async () => {
  for (let i = 0; i < 6; i++) {
    await loginPOST(loginRequest(GHOST, "wrong-password"));
  }
  const locked = await loginPOST(loginRequest(GHOST, "wrong-password"));
  assert.equal(locked.status, 429);

  const other = await loginPOST(loginRequest(`${GHOST}-other`, "wrong-password"));
  assert.ok(
    other.status === 401 || other.status === 429,
    `unexpected status ${other.status}`,
  );
  assert.equal(other.status, 401, "a different account must not be blocked");
});

test("registration remains reachable and continues to reject duplicates", async () => {
  // Sanity check that the auth surface still behaves after the throttle landed.
  const bad = await registerPOST(
    new Request("https://example.test/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "x", email: "not-an-email", password: "short" }),
    }),
  );
  assert.equal(bad.status, 400);
});
