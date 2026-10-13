import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";

import { resetRateLimits } from "../app/lib/rate-limit";
import { prisma } from "../app/server/prisma";
import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { GET as providersGET } from "../app/api/services/providers/route";

/**
 * `/api/services/providers` used to hand an anonymous caller every provider's
 * phone number, email and full street address in a single unpaginated response.
 * The directory (name, city, services) stays public; the contact details are
 * released only to a signed-in session.
 *
 * These assertions are only meaningful against a non-empty table, so a provider
 * is inserted for the run and removed afterwards.
 */

const user: SessionUser = {
  id: "7",
  username: "c",
  email: "c@x.test",
  name: "C",
  role: "CUSTOMER",
};

let token = "";
let seededId = 0;

const CONTACT = {
  phone: "+92-300-1234567",
  email: "workshop@example.test",
  address: "12 Garage Road, Model Colony, Karachi",
};

before(async () => {
  token = await signSession(user);
  const created = await prisma.serviceProvider.create({
    data: {
      name: "Autoconnect Test Garage",
      description: "Seeded by tests/providers.test.ts",
      ...CONTACT,
      city: "Karachi",
      services: ["SERVICE", "TYRES"],
      status: "ACTIVE",
    },
  });
  seededId = created.id;
});

after(async () => {
  if (seededId) await prisma.serviceProvider.delete({ where: { id: seededId } }).catch(() => {});
  await prisma.$disconnect();
});

beforeEach(() => {
  resetRateLimits();
});

function request(options: { signedIn?: boolean; query?: string } = {}): Request {
  const headers: Record<string, string> = {};
  if (options.signedIn) headers.cookie = `${SESSION_COOKIE}=${token}`;
  return new Request(
    `https://example.test/api/services/providers${options.query ? `?${options.query}` : ""}`,
    { headers },
  );
}

/** The seeded row, so every assertion runs against a known provider. */
async function seededDealerFrom(body: {
  providers: Array<{ id: number }>;
}): Promise<Record<string, unknown>> {
  const found = body.providers.find((p) => p.id === seededId);
  assert.ok(found, `seeded provider #${seededId} missing from the response`);
  return found as unknown as Record<string, unknown>;
}

test("an anonymous caller gets the directory without contact details", async () => {
  const response = await providersGET(request());
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.contactAvailable, false, "anonymous callers must be told contacts are withheld");

  const provider = await seededDealerFrom(body);
  assert.equal(provider.name, "Autoconnect Test Garage", "the directory entry is still listed");
  assert.equal(provider.city, "Karachi", "non-sensitive location is still listed");
  assert.deepEqual(provider.services, ["SERVICE", "TYRES"]);
  for (const field of Object.keys(CONTACT)) {
    assert.equal(provider[field], null, `anonymous caller received ${field}`);
  }
});

test("a signed-in caller is released the contact details", async () => {
  const anon = await providersGET(request()).then((r) => r.json());
  const signedIn = await providersGET(request({ signedIn: true })).then((r) => r.json());

  assert.equal(signedIn.contactAvailable, true);
  assert.equal(
    signedIn.providers.length,
    anon.providers.length,
    "gating must not change which providers are listed",
  );

  const provider = await seededDealerFrom(signedIn);
  assert.equal(provider.phone, CONTACT.phone, "signed-in callers get the phone");
  assert.equal(provider.email, CONTACT.email, "signed-in callers get the email");
  assert.equal(provider.address, CONTACT.address, "signed-in callers get the address");
});

test("a forged cookie is treated as anonymous", async () => {
  const response = await providersGET(
    new Request("https://example.test/api/services/providers", {
      headers: { cookie: `${SESSION_COOKIE}=not-a-signed-jwt` },
    }),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.contactAvailable, false);
  const provider = await seededDealerFrom(body);
  for (const field of Object.keys(CONTACT)) {
    assert.equal(provider[field], null, `forged cookie must not unlock ${field}`);
  }
});

test("a filter matching the seeded row still redacts contacts for anonymous callers", async () => {
  const body = await providersGET(request({ query: "city=Karachi" })).then((r) => r.json());
  const provider = await seededDealerFrom(body);
  assert.equal(provider.city, "Karachi");
  for (const field of Object.keys(CONTACT)) {
    assert.equal(provider[field], null, `filtered listing must still redact ${field}`);
  }
});

test("pagination is clamped in both directions", async () => {
  const oversized = await providersGET(request({ query: "limit=9999&page=999" })).then((r) =>
    r.json(),
  );
  assert.ok(
    oversized.pagination.limit <= 50,
    `limit must be capped, got ${oversized.pagination.limit}`,
  );
  assert.ok(oversized.pagination.page >= 1, "page must be at least 1");
  assert.ok(oversized.providers.length <= 50, "response must honour the cap");

  const negative = await providersGET(request({ query: "limit=-5&page=0" })).then((r) => r.json());
  assert.equal(negative.pagination.limit, 1, "a negative limit falls back to 1");
  assert.equal(negative.pagination.page, 1, "page 0 becomes page 1");
});

test("the seeded row is ordered deterministically so pagination is stable", async () => {
  const first = await providersGET(request()).then((r) => r.json());
  const second = await providersGET(request()).then((r) => r.json());
  assert.deepEqual(
    first.providers.map((p: { id: number }) => p.id),
    second.providers.map((p: { id: number }) => p.id),
    "ordering must be deterministic so paging does not repeat rows",
  );
});
