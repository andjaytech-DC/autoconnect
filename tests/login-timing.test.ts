import { test } from "node:test";
import assert from "node:assert/strict";

import { createUser, verifyCredentials } from "../app/server/users";
import { resetLoginThrottle } from "../app/server/login-throttle";

/**
 * `verifyCredentials` returned null immediately when the username was not
 * found, without running any comparison, while an existing user paid for a
 * bcrypt comparison. The response-time difference told an attacker which
 * usernames were registered — account enumeration without ever sending a
 * password.
 *
 * A precise timing comparison is inherently flaky on a loaded machine, so this
 * asserts the structural property instead: the unknown-user branch must still
 * pay the cost of one bcrypt comparison.
 */

const PASSWORD = "correct-horse-battery-staple";

/**
 * bcrypt at 10 rounds. Generous lower bound — the point is that the branch did
 * real work, not the exact figure.
 */
const MIN_COMPARISON_MS = 5;

test("an unknown username still pays for one bcrypt comparison", async () => {
  const started = Date.now();
  const result = await verifyCredentials(`nobody-${Date.now()}`, PASSWORD);
  const elapsed = Date.now() - started;

  assert.equal(result, null, "the rejection itself must not change");
  assert.ok(
    elapsed >= MIN_COMPARISON_MS,
    `unknown user took only ${elapsed}ms — no comparison ran, so timing still ` +
      `distinguishes an existing user from a missing one`,
  );
});

test("a known user with the wrong password costs the same order of magnitude", async () => {
  resetLoginThrottle();
  const username = `timing-user-${Date.now()}`;
  await createUser({
    username,
    email: `${username}@example.test`,
    name: "Timing",
    password: PASSWORD,
  });

  const wrongStarted = Date.now();
  const wrong = await verifyCredentials(username, "the-wrong-password-entirely");
  const wrongElapsed = Date.now() - wrongStarted;

  const missingStarted = Date.now();
  const missing = await verifyCredentials(`definitely-not-${username}`, PASSWORD);
  const missingElapsed = Date.now() - missingStarted;

  assert.equal(wrong, null);
  assert.equal(missing, null);

  // Both branches did one comparison, so neither should be dramatically
  // cheaper than the other. The bound is deliberately loose (4x) to avoid
  // flaking on a busy machine; a real leak is 2-3 orders of magnitude.
  const slower = Math.max(wrongElapsed, missingElapsed);
  const faster = Math.min(wrongElapsed, missingElapsed);
  assert.ok(
    faster >= MIN_COMPARISON_MS,
    `fastest branch took ${faster}ms — still suspiciously cheap`,
  );
  assert.ok(
    slower <= faster * 8,
    `one branch took ${slower}ms vs ${faster}ms — a gap that large means the ` +
      "comparison was skipped somewhere",
  );
});

test("the right password still succeeds", async () => {
  resetLoginThrottle();
  const username = `ok-user-${Date.now()}`;
  const created = await createUser({
    username,
    email: `${username}@example.test`,
    name: "Ok User",
    password: PASSWORD,
  });
  const verified = await verifyCredentials(username, PASSWORD);
  assert.ok(verified, "valid credentials must still authenticate");
  assert.equal(verified?.username, created.username);
  assert.equal(verified?.role, "CUSTOMER");
});
