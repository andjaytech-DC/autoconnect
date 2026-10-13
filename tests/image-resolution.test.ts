import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveImage } from "../app/lib/nest-images";
import { NEST_ORIGIN } from "../app/lib/nest";

/**
 * `resolveImage()` used to rewrite *every* root-relative reference to the
 * NestJS origin, so frontend-owned placeholder art such as
 * `/cars/suv-blue.png` was requested from `http://localhost:5000/cars/...`,
 * which 404s. The fix returns the frontend-owned roots unchanged (this app
 * serves them from `public/`) while leaving absolute URLs and backend-hosted
 * uploads exactly as they were.
 *
 * The allowlist must be a directory match, not a string prefix, and must not be
 * a path-traversal or prefix-confusion vector.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** A path that is NOT frontend-owned is rewritten against the backend origin. */
const backend = (p: string) => `${NEST_ORIGIN}${p}`;

test("frontend-owned catalogue art stays root-relative", () => {
  assert.equal(resolveImage("/cars/suv-blue.png"), "/cars/suv-blue.png");
  assert.equal(resolveImage("/cars/mpv-white.png"), "/cars/mpv-white.png");
  assert.equal(resolveImage("/products/tyre.svg"), "/products/tyre.svg");
  assert.equal(resolveImage("/products/spare-parts.svg"), "/products/spare-parts.svg");
});

test("the reported assets actually exist under public/", () => {
  for (const rel of ["/cars/suv-blue.png", "/products/tyre.svg"]) {
    assert.ok(existsSync(path.join(repoRoot, "public", rel)), `${rel} must exist in public/`);
    assert.equal(resolveImage(rel), rel);
  }
});

test("every shipped /cars and /products asset resolves frontend-relative", () => {
  for (const dir of ["cars", "products"]) {
    const abs = path.join(repoRoot, "public", dir);
    assert.ok(existsSync(abs), `public/${dir} must exist`);
    const files = readdirSync(abs);
    assert.ok(files.length > 0, `public/${dir} must not be empty`);
    for (const file of files) {
      const rel = `/${dir}/${file}`;
      assert.equal(resolveImage(rel), rel, `${rel} must stay frontend-relative`);
    }
  }
});

test("absolute URLs pass through untouched", () => {
  const absolute = [
    "https://images.unsplash.com/photo-123?w=800",
    "https://res.cloudinary.com/demo/image/upload/v1/cars/a.webp",
    "http://localhost:5000/cars/suv-blue.png",
    "data:image/png;base64,iVBORw0KGgo=",
    "blob:http://localhost:3000/abc-123",
  ];
  for (const url of absolute) {
    assert.equal(resolveImage(url), url);
  }
});

test("uploads this app stores under public/uploads stay frontend-relative", () => {
  // `/api/upload` writes to `public/uploads`, `/api/upload/cleanup` deletes
  // from it, and this app serves it statically, so `/uploads/*` is
  // frontend-owned rather than backend-hosted.
  assert.equal(resolveImage("/uploads/08959b94a9de2a07.webp"), "/uploads/08959b94a9de2a07.webp");
  assert.equal(resolveImage("/uploads/a-b-c.webp"), "/uploads/a-b-c.webp");
  // Any *other* unknown root-relative path still goes to the backend.
  assert.equal(resolveImage("/banners/promo.png"), backend("/banners/promo.png"));
});

test("the allowlist matches directory boundaries, not raw string prefixes", () => {
  const lookalikes = [
    "/cars-of-2024/suv.png",
    "/carsprite/suv.png",
    "/cars", // no trailing slash: not an asset inside the directory
    "/products-old/tyre.svg",
    "/productsX/tyre.svg",
    "/uploads-old/x.webp",
    "/uploadsX/x.webp",
    "/uploads", // no trailing slash: not an asset inside the directory
  ];
  for (const p of lookalikes) {
    assert.equal(resolveImage(p), backend(p), `${p} must not be treated as frontend-owned`);
  }
});

test("path traversal cannot escape a frontend root", () => {
  const traversal = [
    "/cars/../secrets.env",
    "/cars/../../etc/passwd",
    "/cars/%2e%2e/secrets.env",
    "/products/%252e%252e/secret.svg",
    "/cars/a/..%2f..%2fsecret.png",
    "/cars/./x.png",
    "/uploads/../secrets.env",
    "/uploads/%2e%2e/x.webp",
  ];
  for (const p of traversal) {
    assert.equal(resolveImage(p), backend(p), `${p} must not be treated as frontend-owned`);
  }
});

test("backslashes, control characters, and malformed encoding fall through safely", () => {
  const unsafe = [
    "/cars/..\\secrets.env",
    "/cars/sub\\file.png",
    "/cars/x\u0000.png",
    "/cars/100%.png", // invalid percent-encoding
    "/cars/%E0%A4%A.png", // truncated percent-encoding
    "/uploads/..\\secrets.env",
  ];
  for (const p of unsafe) {
    assert.equal(resolveImage(p), backend(p), `${p} must not be treated as frontend-owned`);
  }
});

test("a protocol-relative value is never returned as an external URL", () => {
  const out = resolveImage("//evil.test/x.png");
  assert.notEqual(out, "//evil.test/x.png");
  assert.equal(out, backend("//evil.test/x.png"));
});

test("empty and non-string values resolve to null", () => {
  assert.equal(resolveImage(null), null);
  assert.equal(resolveImage(undefined), null);
  assert.equal(resolveImage(""), null);
  assert.equal(resolveImage("   "), null);
  assert.equal(resolveImage(123 as unknown as string), null);
});

test("a bare relative value is left exactly as it was", () => {
  // Pre-existing behaviour for non-rooted strings: returned unchanged.
  assert.equal(resolveImage("cars/suv-blue.png"), "cars/suv-blue.png");
});

test("the image host allow-list stays closed and no environment relaxes the local-IP guard", () => {
  const req = createRequire(import.meta.url);
  const configPath = path.join(repoRoot, "next.config.js");
  // Next.js augments `ProcessEnv` with a readonly `NODE_ENV`, so writes have to
  // go through a mutable view of the same object.
  const env = process.env as unknown as Record<string, string | undefined>;
  const originalEnv = env.NODE_ENV;

  const load = (nodeEnv: string | undefined) => {
    if (nodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = nodeEnv;
    delete req.cache[req.resolve(configPath)];
    return req(configPath) as {
      images: {
        remotePatterns: Array<{ hostname: string }>;
        dangerouslyAllowLocalIP?: boolean;
      };
    };
  };

  try {
    for (const nodeEnv of [undefined, "development", "production"] as const) {
      const cfg = load(nodeEnv);
      assert.ok(Array.isArray(cfg.images.remotePatterns) && cfg.images.remotePatterns.length > 0);
      for (const pattern of cfg.images.remotePatterns) {
        assert.notEqual(pattern.hostname, "*", "a bare wildcard host defeats the allow-list");
        assert.notEqual(pattern.hostname, "**", "a bare wildcard host defeats the allow-list");
      }
      // Every image this app renders is now frontend-owned or a public remote,
      // so no environment needs the dev-only private-IP relaxation.
      assert.notEqual(
        cfg.images.dangerouslyAllowLocalIP,
        true,
        `local-IP image access must stay off (NODE_ENV=${String(nodeEnv)})`,
      );
    }
  } finally {
    if (originalEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = originalEnv;
    delete req.cache[req.resolve(configPath)];
  }
});
