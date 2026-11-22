import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { SESSION_COOKIE, signSession, type SessionUser } from "../app/lib/auth";
import { resetRateLimits } from "../app/lib/rate-limit";
import { POST as uploadPOST } from "../app/api/upload/route";
import { POST as cleanupPOST } from "../app/api/upload/cleanup/route";

/**
 * Upload and cleanup hold no files and no ownership state: NestJS stores the
 * image and decides who may delete it. The BFF gates the role, pre-checks the
 * obvious, and forwards with the caller's token.
 */

const u = (id: string, role: SessionUser["role"], token?: string): SessionUser => ({
  id, username: role, email: `${role}@x.test`, name: role, role, ...(token ? { token } : {}),
});
const ADMIN = u("1", "ADMIN", "admin-token");
const DEALER = u("20", "DEALER", "dealer-token");
const CUSTOMER = u("7", "CUSTOMER", "cust-token");
const NO_TOKEN = u("22", "DEALER");

interface Call { method: string; path: string; auth: string | null; contentType: string | null; body: unknown }
type Out = { status?: number; data?: unknown; message?: string } | "down";
const realFetch = globalThis.fetch;
let calls: Call[] = [];

function fakeBackend(r: (c: Call) => Out): void {
  calls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const headers = new Headers(init?.headers);
    const body = init?.body instanceof FormData ? init.body : typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    const call: Call = {
      method: init?.method ?? "GET",
      path: url.pathname.replace(/^\/api/, ""),
      auth: headers.get("authorization"),
      contentType: headers.get("content-type"),
      body,
    };
    calls.push(call);
    const out = r(call);
    if (out === "down") throw new TypeError("fetch failed");
    const status = out.status ?? 200;
    return new Response(
      JSON.stringify(status >= 400 ? { message: out.message ?? "error" } : { success: true, data: out.data }),
      { status, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
}
beforeEach(() => resetRateLimits());
afterEach(() => { globalThis.fetch = realFetch; });

async function cookie(who?: SessionUser): Promise<Record<string, string>> {
  return who ? { cookie: `${SESSION_COOKIE}=${await signSession(who)}` } : {};
}

async function upload(who: SessionUser | undefined, file?: File): Promise<Response> {
  const form = new FormData();
  if (file) form.append("file", file);
  return uploadPOST(new Request("https://example.test/api/upload", { method: "POST", headers: await cookie(who), body: form }));
}
async function cleanup(who: SessionUser | undefined, body: unknown): Promise<Response> {
  return cleanupPOST(new Request("https://example.test/api/upload/cleanup", {
    method: "POST",
    headers: { "content-type": "application/json", ...(await cookie(who)) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })) as Promise<Response>;
}
const jpeg = (size = 10, type = "image/jpeg") => new File([new Uint8Array(size)], "car.jpg", { type });

test("upload: 401 anonymous, 403 customer, 401 when the session has no backend token", async () => {
  fakeBackend(() => ({ data: {} }));
  assert.equal((await upload(undefined, jpeg())).status, 401);
  assert.equal((await upload(CUSTOMER, jpeg())).status, 403);
  assert.equal((await upload(NO_TOKEN, jpeg())).status, 401);
  assert.equal(calls.length, 0);
});

test("upload: bad requests never reach NestJS", async () => {
  fakeBackend(() => ({ data: {} }));
  assert.equal((await upload(ADMIN)).status, 400, "no file");
  assert.equal((await upload(ADMIN, jpeg(10, "application/pdf"))).status, 415);
  assert.equal((await upload(ADMIN, jpeg(10 * 1024 * 1024 + 1))).status, 413);
  assert.equal(calls.length, 0);
});

test("upload: forwards the file with the caller's token and returns url/thumbUrl/size", async () => {
  fakeBackend(() => ({ status: 201, data: { url: "/uploads/a.webp", thumbUrl: "/uploads/a_thumb.webp", size: 1234 } }));
  for (const who of [ADMIN, DEALER]) {
    const res = await upload(who, jpeg());
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { url: "/uploads/a.webp", thumbUrl: "/uploads/a_thumb.webp", size: 1234 });
  }
  assert.deepEqual(calls.map((c) => [c.method, c.path, c.auth]), [
    ["POST", "/uploads/images", "Bearer admin-token"],
    ["POST", "/uploads/images", "Bearer dealer-token"],
  ]);
  assert.ok(calls[0].body instanceof FormData);
  assert.ok((calls[0].body as FormData).get("file") instanceof File);
  assert.equal(calls[0].contentType, null, "multipart boundary must be left to the runtime");
});

test("upload: NestJS refusals pass through, outage is 503", async () => {
  fakeBackend(() => ({ status: 429, message: "Daily upload limit reached (200 files). Try again tomorrow." }));
  const quota = await upload(ADMIN, jpeg());
  assert.equal(quota.status, 429);
  assert.match((await quota.json()).error, /Daily upload limit/);

  fakeBackend(() => ({ status: 400, message: "The uploaded file could not be read as an image." }));
  assert.equal((await upload(ADMIN, jpeg())).status, 400);

  fakeBackend(() => "down");
  assert.equal((await upload(ADMIN, jpeg())).status, 503);
});

test("cleanup: 401 anonymous, 403 customer, 401 without a backend token", async () => {
  fakeBackend(() => ({ data: { removed: 0 } }));
  assert.equal((await cleanup(undefined, "not even json")).status, 401);
  assert.equal((await cleanup(CUSTOMER, { urls: [] })).status, 403);
  assert.equal((await cleanup(NO_TOKEN, { urls: ["/uploads/a.webp"] })).status, 401);
  assert.equal(calls.length, 0);
});

test("cleanup: validates the body locally, caps the batch, skips empty work", async () => {
  fakeBackend(() => ({ data: { removed: 0 } }));
  assert.equal((await cleanup(ADMIN, "{nope")).status, 400);
  const big = await cleanup(ADMIN, { urls: Array.from({ length: 101 }, (_, i) => `/uploads/x${i}.webp`) });
  assert.equal(big.status, 400);
  const none = await cleanup(ADMIN, { urls: [] });
  assert.deepEqual(await none.json(), { removed: 0 });
  assert.equal(calls.length, 0);
});

test("cleanup: forwards only string urls with the token and returns the count", async () => {
  fakeBackend(() => ({ data: { removed: 2 } }));
  const res = await cleanup(DEALER, { urls: ["/uploads/a.webp", 5, null, "", "/uploads/b.webp"] });
  assert.deepEqual(await res.json(), { removed: 2 });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].body, { urls: ["/uploads/a.webp", "/uploads/b.webp"] });
  assert.equal(calls[0].auth, "Bearer dealer-token");
  assert.equal(calls[0].path, "/uploads/cleanup");
});

test("cleanup: backend refusal and outage", async () => {
  fakeBackend(() => ({ status: 403, message: "No dealer profile." }));
  assert.equal((await cleanup(DEALER, { urls: ["/uploads/a.webp"] })).status, 403);
  fakeBackend(() => "down");
  assert.equal((await cleanup(ADMIN, { urls: ["/uploads/a.webp"] })).status, 503);
});
