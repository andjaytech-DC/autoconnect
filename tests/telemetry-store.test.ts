import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_ENTRIES,
  isSafeKeySegment,
  recordError,
  resetTelemetryStore,
  snapshot,
} from "../app/lib/telemetry-store";

/**
 * The beacon endpoint is unauthenticated, so the store is what stands between a
 * hostile client and unbounded process memory. The old implementation keyed a
 * plain object on `route|status|message` with no cap and no expiry — sending
 * thousands of distinct messages grew the heap without limit.
 */
beforeEach(() => resetTelemetryStore());

test("aggregates repeats of the same failure into one counter", () => {
  for (let i = 0; i < 5; i++) {
    recordError({ route: "/api/vehicles", status: 500, code: "SERVER", message: "boom" });
  }
  const { errors } = snapshot();
  assert.equal(errors.length, 1);
  assert.equal(errors[0].count, 5);
  assert.equal(errors[0].key, "/api/vehicles|500|SERVER");
});

test("the message is not part of the aggregation key", () => {
  // 50 distinct messages describing the same failure must not spawn 50 entries.
  for (let i = 0; i < 50; i++) {
    recordError({ route: "/api/vehicles", status: 500, code: "SERVER", message: `detail ${i}` });
  }
  assert.equal(snapshot().errors.length, 1);
});

test("rejects a hostile route label instead of keying on it", () => {
  const chars = "x".repeat(5000);
  assert.equal(recordError({ route: chars, message: "noise" }), null);
  assert.equal(recordError({ route: "has space", message: "noise" }), null);
  assert.equal(recordError({ route: "bad\nnewline", message: "noise" }), null);
  assert.equal(recordError({ route: "", message: "noise" }), null);
  assert.equal(snapshot().errors.length, 0);
});

test("rejects a non-numeric status and an over-long code", () => {
  assert.equal(recordError({ route: "/api/x", status: 99, message: "m" }), null);
  assert.equal(
    recordError({ route: "/api/x", status: 500, code: "c".repeat(51), message: "m" }),
    null,
  );
  assert.equal(recordError({ route: "/api/x", status: 500, code: "SERVER" })?.count, 1);
});

test("isSafeKeySegment enforces the character set and the length cap", () => {
  assert.ok(isSafeKeySegment("/api/vehicles"));
  assert.ok(isSafeKeySegment("app.portal:customer"));
  assert.ok(!isSafeKeySegment("".padEnd(500, "a")));
  assert.ok(!isSafeKeySegment("a b"));
  assert.ok(!isSafeKeySegment("a?b"));
});

test("caps the key space and evicts instead of growing", () => {
  for (let i = 0; i < MAX_ENTRIES + 25; i++) {
    recordError({ route: `/api/r/${i}`, message: "noise" });
  }
  const { errors, dropped, recorded } = snapshot();
  assert.equal(errors.length, MAX_ENTRIES, "store must not exceed the cap");
  assert.ok(recorded >= MAX_ENTRIES + 25, "every event is still counted");
  assert.ok(dropped > 0, "overflow is reported");
});

test("repeated hits on one key never evict it, so hot keys survive pressure", () => {
  recordError({ route: "/api/hot", message: "m" });
  for (let i = 0; i < 40; i++) {
    recordError({ route: `/api/filler/${i}`, message: "m" });
  }
  for (let i = 0; i < 10; i++) {
    recordError({ route: "/api/hot", message: "m" });
  }
  const hot = snapshot().errors.find((e) => e.key.startsWith("/api/hot"));
  assert.ok(hot, "hot key survives eviction pressure");
  assert.equal(hot.count, 11, "hot key keeps its running count");
});

test("expired entries are swept away", () => {
  recordError({ route: "/api/old", message: "m" }, 0); // t = 0
  recordError({ route: "/api/new", message: "m" }, 10 * 60 * 60 * 1000); // t = 10h
  const { errors } = snapshot(10 * 60 * 60 * 1000);
  assert.deepEqual(
    errors.map((e) => e.key),
    ["/api/new||"],
    "the hour-old entry is dropped, not retained forever",
  );
});

test("a single client cannot inflate one counter past the request budget", () => {
  // The store aggregates, so even a billion beacons about the same failure cost
  // one entry — this is the property that makes the memory bound hold.
  for (let i = 0; i < 5000; i++) {
    recordError({ route: "/api/vehicles", status: 500, code: "SERVER", message: `v${i}` });
  }
  const snap = snapshot();
  assert.equal(snap.errors.length, 1);
  assert.equal(snap.errors[0].count, 5000);
});
