import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";

import {
  enforceRateLimit,
  rateLimit,
  rateLimitBucketCount,
  resetRateLimits,
  resetSharedRateLimitState,
  RATE_LIMIT_MAX_BUCKETS,
} from "../app/lib/rate-limit";
import {
  encodeCommand,
  parseRedisUrl,
  parseResp,
  RedisClient,
} from "../app/lib/redis-client";

/**
 * Sprint 2 — distributed rate limiting.
 *
 * The shared limiter must be an accelerator, never a hard dependency: with
 * `REDIS_URL` set the budget is counted centrally, and with it unset (or Redis
 * down) the in-process limiter answers instead. These tests run against a fake
 * RESP server, so they exercise the real client and the real Lua-call shape
 * without needing a Redis install.
 */

interface FakeRedis {
  port: number;
  commands: string[][];
  counters: Map<string, { count: number; expiresAt: number }>;
  resetCommands(): void;
  close(): Promise<void>;
}

/** A loopback server that speaks just enough RESP for the limiter. */
function startFakeRedis(): Promise<FakeRedis> {
  const commands: string[][] = [];
  const counters = new Map<string, { count: number; expiresAt: number }>();

  function handle(parts: string[]): Buffer {
    const name = (parts[0] ?? "").toUpperCase();
    if (name === "PING") return Buffer.from("+PONG\r\n");
    if (name === "AUTH" || name === "SELECT") return Buffer.from("+OK\r\n");
    if (name === "EVAL") {
      const keyCount = Number(parts[2]);
      const keys = parts.slice(3, 3 + keyCount);
      const args = parts.slice(3 + keyCount);
      const windowMs = Number(args[0]);
      const key = keys[0];
      const now = Date.now();
      const existing = counters.get(key);
      const entry =
        existing && existing.expiresAt > now
          ? existing
          : { count: 0, expiresAt: now + windowMs };
      entry.count += 1;
      counters.set(key, entry);
      const ttl = Math.max(1, entry.expiresAt - now);
      return Buffer.from(`*2\r\n:${entry.count}\r\n:${ttl}\r\n`);
    }
    return Buffer.from(`-ERR unknown command '${name}'\r\n`);
  }

  const server = net.createServer((socket) => {
    let buffer = Buffer.alloc(0);
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        let parsed: { value: unknown; next: number } | null;
        try {
          parsed = parseResp(buffer, 0);
        } catch {
          socket.destroy();
          return;
        }
        if (!parsed) break;
        buffer = buffer.subarray(parsed.next);
        const parts = (Array.isArray(parsed.value) ? parsed.value : [parsed.value]).map(
          (value) => String(value),
        );
        commands.push(parts);
        socket.write(handle(parts));
      }
    });
    socket.on("error", () => undefined);
  });

  return new Promise<FakeRedis>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("fake redis did not bind a port"));
        return;
      }
      resolve({
        port: address.port,
        commands,
        counters,
        resetCommands: () => {
          commands.length = 0;
        },
        close: () =>
          new Promise<void>((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}

const ENV_KEYS = [
  "REDIS_URL",
  "RATE_LIMIT_PREFIX",
  "REDIS_CMD_TIMEOUT_MS",
  "RATE_LIMIT_BREAKER_MS",
  "TRUST_PROXY_HEADERS",
  "NODE_ENV",
] as const;
const originalEnv = new Map<string, string | undefined>(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

function restoreEnv(): void {
  for (const [key, value] of originalEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

let fake: FakeRedis;
const request = () => new Request("https://example.test/x");

before(async () => {
  fake = await startFakeRedis();
});

after(async () => {
  await fake.close();
});

beforeEach(() => {
  restoreEnv();
  delete process.env.REDIS_URL;
  // Deterministic bucket identity: every caller collapses to one bucket.
  process.env.TRUST_PROXY_HEADERS = "false";
  resetRateLimits();
  resetSharedRateLimitState();
});

afterEach(() => {
  resetSharedRateLimitState();
  resetRateLimits();
  restoreEnv();
});

// ── URL / protocol parsing ─────────────────────────────────────────────────

test("REDIS_URL parsing accepts redis/rediss and rejects anything else", () => {
  const basic = parseRedisUrl("redis://localhost:6379");
  assert.ok(basic);
  assert.equal(basic.host, "localhost");
  assert.equal(basic.port, 6379);
  assert.equal(basic.tls, false);
  assert.equal(basic.db, 0);
  assert.equal(basic.password, undefined);

  const full = parseRedisUrl("redis://alice:p%40ss@redis.example:6380/2");
  assert.ok(full);
  assert.equal(full.host, "redis.example");
  assert.equal(full.port, 6380);
  assert.equal(full.username, "alice");
  assert.equal(full.password, "p@ss", "url-escaped password is decoded");
  assert.equal(full.db, 2);

  const tls = parseRedisUrl("rediss://:secret@secure.example");
  assert.ok(tls);
  assert.equal(tls.tls, true);
  assert.equal(tls.username, undefined);
  assert.equal(tls.password, "secret");
  assert.equal(tls.port, 6379, "port defaults to 6379");

  for (const bad of ["", "http://redis", "not a url", "redis://host:0", "redis://host:99999"]) {
    assert.equal(parseRedisUrl(bad), null, `${JSON.stringify(bad)} must be rejected`);
  }
  assert.equal(parseRedisUrl(undefined), null);
  assert.equal(parseRedisUrl(null), null);
});

test("the RESP decoder handles every reply type and waits on partial input", () => {
  assert.deepEqual(parseResp(Buffer.from("+OK\r\n")), { value: "OK", next: 5 });
  assert.deepEqual(parseResp(Buffer.from(":42\r\n")), { value: 42, next: 5 });
  assert.deepEqual(parseResp(Buffer.from("$-1\r\n")), { value: null, next: 5 });
  assert.deepEqual(parseResp(Buffer.from("$3\r\nfoo\r\n")), { value: "foo", next: 9 });
  assert.deepEqual(parseResp(Buffer.from("*2\r\n:1\r\n:2\r\n")), { value: [1, 2], next: 12 });
  assert.deepEqual(parseResp(Buffer.from("-ERR bad\r\n")), {
    value: { error: "ERR bad" },
    next: 10,
  });

  // A reply split across TCP segments is incomplete, not an error.
  assert.equal(parseResp(Buffer.from("$5\r\nfoo")), null);
  assert.equal(parseResp(Buffer.from("*2\r\n:1\r\n")), null);
  // A binary-safe bulk string (the Lua script) survives embedded CRLFs.
  const script = "$4\r\na\r\nb\r\n";
  assert.deepEqual(parseResp(Buffer.from(script)), { value: "a\r\nb", next: script.length });
});

test("commands are encoded binary-safely", () => {
  assert.equal(encodeCommand(["PING"]).toString(), "*1\r\n$4\r\nPING\r\n");
  assert.equal(
    encodeCommand(["EVAL", "return 1", 1, "k", 1000]).toString(),
    "*5\r\n$4\r\nEVAL\r\n$8\r\nreturn 1\r\n$1\r\n1\r\n$1\r\nk\r\n$4\r\n1000\r\n",
  );
  assert.equal(encodeCommand([":"]).toString(), "*1\r\n$1\r\n:\r\n");
});

// ── The client talks to a real socket ──────────────────────────────────────

test("the client runs EVAL and PING over a live connection", async () => {
  const target = parseRedisUrl(`redis://127.0.0.1:${fake.port}`);
  assert.ok(target);
  const client = new RedisClient({ target, timeoutMs: 2000 });
  try {
    assert.equal(await client.ping(), true);
    const reply = await client.eval("return {1, 2}", ["k"], [1000]);
    assert.ok(Array.isArray(reply), "an array reply is decoded");
    assert.equal(Number(reply[0]), 1, "the counter starts at one");
    assert.ok(Number(reply[1]) > 0, "a TTL is reported");
  } finally {
    client.close();
  }
});

// ── Shared store: used when configured ────────────────────────────────────

test("a configured shared store enforces one budget across callers", async () => {
  process.env.REDIS_URL = `redis://127.0.0.1:${fake.port}`;
  process.env.RATE_LIMIT_PREFIX = "test:rl:";
  resetSharedRateLimitState();
  resetRateLimits();
  fake.resetCommands();

  const results = [];
  for (let i = 0; i < 4; i += 1) {
    results.push(await enforceRateLimit(request(), { limit: 3, windowMs: 60_000, key: "shared" }));
  }

  assert.deepEqual(
    results.map((r) => r.ok),
    [true, true, true, false],
    "the limit is enforced by the shared counter",
  );
  assert.ok(results[3].retryAfter >= 1, "a throttled caller is told when to retry");

  assert.equal(fake.commands.length, 4, "one EVAL per caller, nothing else");
  const evalCommand = fake.commands[0];
  assert.equal(evalCommand[0], "EVAL", "Redis was actually consulted");
  assert.ok(
    evalCommand[3].startsWith("test:rl:"),
    `shared keys are namespaced, got ${evalCommand[3]}`,
  );
});

test("two callers share the same bucket rather than each getting the full budget", async () => {
  process.env.REDIS_URL = `redis://127.0.0.1:${fake.port}`;
  resetSharedRateLimitState();
  resetRateLimits();

  const options = { limit: 2, windowMs: 60_000, key: "pair" };
  const first = await enforceRateLimit(request(), options);
  const second = await enforceRateLimit(request(), options);
  const third = await enforceRateLimit(request(), options);

  assert.deepEqual([first.ok, second.ok, third.ok], [true, true, false]);
  assert.equal(first.remaining, 1);
  assert.equal(second.remaining, 0);
  assert.equal(third.remaining, 0);
});

// ── Shared store: optional, and safe when it is missing ────────────────────

test("with no REDIS_URL the limiter stays in-process and never opens a socket", async () => {
  delete process.env.REDIS_URL;
  resetSharedRateLimitState();
  resetRateLimits();

  const commandsBefore = fake.commands.length;
  const results = [];
  for (let i = 0; i < 3; i += 1) {
    results.push(await enforceRateLimit(request(), { limit: 2, windowMs: 60_000, key: "mem" }));
  }

  assert.deepEqual(results.map((r) => r.ok), [true, true, false]);
  assert.equal(fake.commands.length, commandsBefore, "no shared store was configured");
});

test("an unreachable Redis degrades to the in-process limiter instead of failing", async () => {
  // Port 1 is reserved and never listening: connection is refused immediately.
  process.env.REDIS_URL = "redis://127.0.0.1:1";
  process.env.REDIS_CMD_TIMEOUT_MS = "500";
  process.env.RATE_LIMIT_BREAKER_MS = "1000";
  resetSharedRateLimitState();
  resetRateLimits();

  const errors: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  };
  try {
    const results = [];
    for (let i = 0; i < 3; i += 1) {
      results.push(await enforceRateLimit(request(), { limit: 2, windowMs: 60_000, key: "down" }));
    }
    assert.deepEqual(
      results.map((r) => r.ok),
      [true, true, false],
      "the fallback limiter still enforces the budget",
    );
  } finally {
    console.error = originalError;
  }

  assert.ok(
    errors.some((line) => line.includes("shared store unavailable")),
    "the outage is logged for observability",
  );
  assert.equal(
    errors.filter((line) => line.includes("shared store unavailable")).length,
    1,
    "the breaker logs once, not once per request",
  );
});

// ── Bounded memory ────────────────────────────────────────────────────────

test("the in-process store is bounded no matter how many distinct callers appear", () => {
  resetRateLimits();
  const total = RATE_LIMIT_MAX_BUCKETS + 5_000;
  for (let i = 0; i < total; i += 1) {
    rateLimit(request(), { limit: 1, windowMs: 3_600_000, key: "bounded", identifier: `caller-${i}` });
  }
  assert.ok(
    rateLimitBucketCount() <= RATE_LIMIT_MAX_BUCKETS,
    `store grew to ${rateLimitBucketCount()} (> ${RATE_LIMIT_MAX_BUCKETS})`,
  );
  assert.ok(rateLimitBucketCount() > 0, "the store is still working, not just emptied");
});
