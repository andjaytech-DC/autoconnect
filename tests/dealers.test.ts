import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { resetRateLimits } from "../app/lib/rate-limit";
import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { mapDealer } from "../app/lib/nest-mappers";
import { GET as dealerByIdGET } from "../app/api/dealers/[id]/route";

/**
 * The dealer directory publishes contact details to anyone who asks, and the
 * email it publishes is `d.user.email` — the dealer's login identifier, not a
 * business address.
 *
 * There are two independent data paths, and both have to be gated:
 *   - NestJS itself (phone only for signed-in callers; email never sent)
 *   - mapDealer, the shared mapper (fail-closed default)
 * Missing either one leaves the numbers publicly readable.
 */

const user: SessionUser = {
  id: "7",
  username: "c",
  email: "c@x.test",
  name: "C",
  role: "CUSTOMER",
};

let token = "";

beforeEach(async () => {
  resetRateLimits();
  token = await signSession(user);
});

const BACKEND_DEALER = {
  id: 42,
  businessName: "AutoHub Prime Motors",
  phone: "+91-98765-43210",
  address: "12 Ring Road",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400001",
  description: "Certified showroom",
  logo: null,
  isVerified: true,
  user: { email: "prime@login-identifier.test" },
  vehicles: [{ id: 1 }, { id: 2 }],
};

const CONTACT_FIELDS = ["phone", "email"] as const;

test("mapDealer counts vehicles from the directory's _count when no array is sent", () => {
  const { vehicles: _omit, ...listRow } = BACKEND_DEALER;
  const mapped = mapDealer({ ...listRow, _count: { vehicles: 5 } } as never);
  assert.equal(mapped.carsAvailable, 5);
  assert.equal(mapped.name, "AutoHub Prime Motors");
  assert.equal(mapped.address, "12 Ring Road");
});

test("mapDealer (the server-component path) is gated on the same rule", () => {
  const anon = mapDealer(BACKEND_DEALER);
  assert.equal(anon.phone, null, "anonymous callers get no phone");
  assert.equal(anon.email, null, "the login identifier must not be published");

  const signedIn = mapDealer(BACKEND_DEALER, { canSeeContact: true });
  assert.equal(signedIn.phone, "+91-98765-43210");
  assert.equal(signedIn.email, "prime@login-identifier.test");
});

test("mapDealer defaults to gated so a forgotten flag publishes nothing", () => {
  // Fail-closed: the default is the safe one.
  const byDefault = mapDealer(BACKEND_DEALER, {});
  for (const field of CONTACT_FIELDS) {
    assert.equal(byDefault[field], null, `${field} must default to null`);
  }
});

test("featured is derived from verification, so the filter can match", () => {
  const verified = mapDealer(BACKEND_DEALER);
  assert.equal(verified.isFeatured, true, "verified dealer is featured");
  assert.equal(verified.isVerified, true);

  const unverified = mapDealer({ ...BACKEND_DEALER, isVerified: false });
  assert.equal(unverified.isFeatured, false);
  // And through the server-component mapper, which had the same dead default.
  assert.equal(mapDealer({ ...BACKEND_DEALER, isVerified: false }).isFeatured, false);
  assert.equal(mapDealer(BACKEND_DEALER).isFeatured, true);
});

test("/api/dealers/[id] never answers an anonymous caller with an auth error", async () => {
  // NestJS is not running here and there is no fixture fallback,
  // so this resolves to 503 rather than a listing. What matters is that the
  // dealer route is not gated as a whole — the directory stays public and only
  // the contact fields are withheld.
  const responses = await Promise.all([
    dealerByIdGET(new Request("https://example.test/api/dealers/42"), {
      params: Promise.resolve({ id: "42" }),
    }),
    dealerByIdGET(
      new Request("https://example.test/api/dealers/42", {
        headers: { cookie: `${SESSION_COOKIE}=${token}` },
      }),
      { params: Promise.resolve({ id: "42" }) },
    ),
  ]);

  for (const [i, response] of responses.entries()) {
    const label = i === 0 ? "anonymous" : "signed-in";
    assert.notEqual(response.status, 401, `${label} caller must not be challenged`);
    assert.notEqual(response.status, 403, `${label} caller must not be forbidden`);
    // Whatever the body is, it must not carry contact details.
    const text = await response.text();
    assert.ok(!text.includes("prime@login-identifier.test"), `${label} body must not leak email`);
    assert.ok(!text.includes("98765"), `${label} body must not leak phone`);
  }
});

/**
 * The mapper leaves several fields at placeholder values because NestJS does
 * not supply them yet. The pages rendered them raw, which produced a dead
 * "Website" link (empty href), a "Services offered" heading over an empty
 * list, and "0.0 / 5 (0 reviews)" presented as a real score.
 *
 * These assertions describe the contract the UI depends on: the placeholders
 * are still there — the pages are what must not display them.
 */
test("unsupplied mapper fields stay at their placeholder values", () => {
  const mapped = mapDealer(BACKEND_DEALER, { canSeeContact: true });
  assert.equal(mapped.website, "");
  assert.deepEqual(mapped.services, []);
  assert.equal(mapped.rating, 0);
  assert.equal(mapped.reviewCount, 0);
  // ...so `reviewCount > 0` is a reliable "the backend sent real data" signal.
  assert.equal(
    mapDealer({ ...BACKEND_DEALER }, { canSeeContact: true }).reviewCount > 0,
    false,
    "no fake ratings may slip into the UI",
  );
});
