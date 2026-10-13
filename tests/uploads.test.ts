import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_PENDING_PER_USER,
  assetKind,
  canDeleteAsset,
  checkUploadQuota,
  claimPendingUpload,
  forgetUpload,
  localUploadName,
  pendingUploadCount,
  registerUpload,
  resetUploadRegistries,
} from "../app/server/uploads";
import type { SessionPayload } from "../app/lib/auth";

/**
 * `/api/upload/cleanup` deleted whatever local file or Cloudinary object a
 * caller named — without a role check and without an ownership check. The names
 * are random but published in `/api/vehicles`, so any signed-in user could delete
 * any listing's photos.
 */

beforeEach(() => resetUploadRegistries());

const dealerSession: SessionPayload = {
  id: "8",
  username: "deal",
  email: "d@x.test",
  name: "Deal",
  role: "DEALER",
};
const adminSession: SessionPayload = {
  id: "1",
  username: "adm",
  email: "a@x.test",
  name: "Adm",
  role: "ADMIN",
};
const customerSession: SessionPayload = {
  id: "7",
  username: "cust",
  email: "c@x.test",
  name: "Cust",
  role: "CUSTOMER",
};

test("only assets this app manages are deletable at all", () => {
  assert.equal(assetKind("/uploads/a-b-c.webp"), "local");
  assert.equal(assetKind("https://res.cloudinary.com/x/image/upload/a.webp"), "cloudinary");
  assert.equal(assetKind("https://evil.test/a.webp"), "external");
});

test("a bare filename is required; traversal is rejected", () => {
  assert.equal(localUploadName("/uploads/a-b-c.webp"), "a-b-c.webp");
  assert.equal(localUploadName("a-b-c.webp"), "a-b-c.webp");
  assert.equal(localUploadName("/uploads/..%2F..%2F.env"), null);
  assert.equal(localUploadName("/uploads/a b.webp"), null, "spaces are not filename-safe");
  assert.equal(localUploadName(""), null);
  assert.equal(localUploadName("/uploads/.hidden"), null);
  // NOTE: `split("/").pop()` reduces "/uploads/a/b.webp" to "b.webp", which is
  // legitimately shaped. The decisive defence is the `path.resolve` containment
  // check in the cleanup route (asserted in routes-401-403.test.ts); this helper
  // only rejects malformed names, and the route re-joins and re-checks.
  assert.equal(localUploadName("/uploads/a/b.webp"), "b.webp");
  assert.equal(localUploadName("/uploads/../secrets.env"), "secrets.env");
});

test("an unattached upload may be claimed by its uploader exactly once", () => {
  registerUpload("/uploads/fresh.webp", "8", 1024);
  assert.equal(pendingUploadCount(), 1);
  assert.equal(claimPendingUpload("/uploads/fresh.webp", "8"), true);
  assert.equal(pendingUploadCount(), 0, "a claim is consumed, not reusable");
  assert.equal(claimPendingUpload("/uploads/fresh.webp", "8"), false);
});

test("an unattached upload cannot be claimed by another user", () => {
  registerUpload("/uploads/fresh.webp", "8", 1024);
  assert.equal(claimPendingUpload("/uploads/fresh.webp", "7"), false);
  assert.equal(claimPendingUpload("/uploads/fresh.webp", "1"), false);
});

test("re-registering the same url under a different uploader drops the claim", () => {
  registerUpload("/uploads/a.webp", "8", 1024);
  registerUpload("/uploads/a.webp", "7", 1024);
  assert.equal(claimPendingUpload("/uploads/a.webp", "8"), false);
  assert.equal(claimPendingUpload("/uploads/a.webp", "7"), false);
});

test("forgetUpload releases a claim so the row that later attaches it owns it", () => {
  registerUpload("/uploads/a.webp", "8", 1024);
  forgetUpload("/uploads/a.webp");
  assert.equal(claimPendingUpload("/uploads/a.webp", "8"), false);
});

test("an external url is refused even for an admin", async () => {
  const check = await canDeleteAsset("https://evil.test/x.webp", { session: adminSession });
  assert.equal(check.deletable, false);
});

test("a customer session can never delete anything", async () => {
  // Even an upload a customer personally owns is out of reach: `canDeleteAsset`
  // is role-gated, not just ownership-gated.
  registerUpload("/uploads/a.webp", "7", 1024);
  const check = await canDeleteAsset("/uploads/a.webp", { session: customerSession });
  assert.equal(check.deletable, false);
  assert.match(check.reason ?? "", /role/i);
});

test("a dealer session can delete its own unattached upload", async () => {
  registerUpload("/uploads/mine.webp", "8", 1024);
  const check = await canDeleteAsset("/uploads/mine.webp", { session: dealerSession });
  assert.equal(check.deletable, true);
});

test("a dealer session cannot delete another dealer's unattached upload", async () => {
  registerUpload("/uploads/theirs.webp", "999", 1024);
  const check = await canDeleteAsset("/uploads/theirs.webp", { session: dealerSession });
  assert.equal(check.deletable, false);
});

test("the pending-upload registry is bounded per user", () => {
  for (let i = 0; i < MAX_PENDING_PER_USER + 10; i++) {
    registerUpload(`/uploads/p${i}.webp`, "8", 1024);
  }
  assert.equal(pendingUploadCount(), MAX_PENDING_PER_USER);
});

test("the daily upload budget is enforced by count and by bytes", () => {
  for (let i = 0; i < 200; i++) {
    assert.ok(checkUploadQuota("8", 1000).ok);
  }
  const exhausted = checkUploadQuota("8", 1000);
  assert.equal(exhausted.ok, false);
  assert.match(exhausted.reason ?? "", /limit/i);

  resetUploadRegistries();
  assert.ok(checkUploadQuota("8", 100).ok);
  const tooBig = checkUploadQuota("8", 300 * 1024 * 1024);
  assert.equal(tooBig.ok, false);
  assert.match(tooBig.reason ?? "", /MB/);
});

test("quota is per user, not global", () => {
  for (let i = 0; i < 200; i++) {
    checkUploadQuota("8", 1000);
  }
  assert.equal(checkUploadQuota("8", 1000).ok, false);
  assert.equal(checkUploadQuota("7", 1000).ok, true);
});

test("the daily window resets for a caller who starts the day over", () => {
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  checkUploadQuota("8", 1000, dayAgo);
  assert.ok(checkUploadQuota("8", 1000).ok, "yesterday's usage does not count today");
});
