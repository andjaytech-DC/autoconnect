import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { resetRateLimits } from "../app/lib/rate-limit";
import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { GET as dealerByIdGET } from "../app/api/dealers/[id]/route";
import { PATCH as leadPATCH, DELETE as leadDELETE } from "../app/api/leads/[id]/route";

/**
 * `backendFetch` interpolates path segments straight into the backend URL and
 * Next.js URL-decodes route params, so a value of `../admin` turned
 * `/dealers/../admin` into a request for an unrelated backend endpoint.
 *
 * On the public dealer route that was an unauthenticated read primitive for any
 * path the caller supplied; the response was returned to them. The lead route
 * had the same flaw, though admin-gated.
 *
 * These tests assert the raw shape is refused before it can be interpolated.
 */

let adminToken = "";

const admin: SessionUser = {
  id: "1",
  username: "a",
  email: "a@x.test",
  name: "A",
  role: "ADMIN",
  token: "test-backend-token",
};

beforeEach(async () => {
  resetRateLimits();
  adminToken = await signSession(admin);
});

function dealerReq(id: string, signedIn = false): Request {
  return new Request(`https://example.test/api/dealers/${encodeURIComponent(id)}`, {
    headers: signedIn ? { cookie: `${SESSION_COOKIE}=${adminToken}` } : {},
  });
}

/** Every shape an attacker could send that must never be interpolated. */
const HOSTILE_IDS = [
  "../admin",
  "../../admin/users",
  "../../etc/passwd",
  "..",
  ".",
  "./admin",
  "..%2Fadmin",
  "1/../../admin",
  "1?id=2",
  "-1",
  "0",
  "abc",
  "1e3",
  "",
  "%00",
  "<script>alert(1)</script>",
];

test("the dealer route refuses a non-numeric id with 400", async () => {
  for (const id of HOSTILE_IDS) {
    const res = await dealerByIdGET(dealerReq(id), {
      params: Promise.resolve({ id }),
    });
    assert.equal(
      res.status,
      400,
      `dealer id "${id}" must be refused, got ${res.status}`,
    );
  }
});

test("the dealer route refuses a hostile id whether or not the caller is signed in", async () => {
  // A valid session does not unlock the traversal — the guard is structural.
  for (const id of ["../admin", "abc"]) {
    const res = await dealerByIdGET(dealerReq(id, true), {
      params: Promise.resolve({ id }),
    });
    assert.equal(res.status, 400, `signed-in caller must also be refused "${id}"`);
  }
});

test("a valid numeric id still reaches the backend (not a 400)", async () => {
  const res = await dealerByIdGET(dealerReq("42"), {
    params: Promise.resolve({ id: "42" }),
  });
  // Backend unreachable in tests + empty mock list → 404, never 400.
  assert.notEqual(res.status, 400, "a well-formed id must not be rejected as invalid");
  assert.ok(
    [404, 200, 503].includes(res.status),
    `unexpected status ${res.status}`,
  );
});

test("the lead routes refuse a non-numeric id before touching the backend", async () => {
  for (const id of HOSTILE_IDS) {
    const params = Promise.resolve({ id });
    const patch = await leadPATCH(
      new Request("https://example.test/api/leads/x", {
        method: "PATCH",
        headers: {
          cookie: `${SESSION_COOKIE}=${adminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: "CLOSED" }),
      }),
      { params },
    );
    assert.equal(patch.status, 400, `PATCH lead id "${id}" must be refused`);

    const del = await leadDELETE(
      new Request("https://example.test/api/leads/x", {
        method: "DELETE",
        headers: { cookie: `${SESSION_COOKIE}=${adminToken}` },
      }),
      { params },
    );
    assert.equal(del.status, 400, `DELETE lead id "${id}" must be refused`);
  }
});

test("the lead routes still authorize before validating the id", async () => {
  // Anonymous callers must get 401, not 400 — the auth check comes first, and
  // a 400 would confirm the endpoint exists.
  const anon = await leadDELETE(new Request("https://example.test/api/leads/1"), {
    params: Promise.resolve({ id: "1" }),
  });
  assert.equal(anon.status, 401);
});
