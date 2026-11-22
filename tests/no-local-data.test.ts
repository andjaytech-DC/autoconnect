import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Definition of done for the single-source-of-truth migration:
 *   Browser → Next.js BFF → NestJS → PostgreSQL, and nothing else.
 *
 * Next.js must not open the database or keep a local copy of data. This test
 * fails if any file under app/ imports the Prisma client or the JSON store. The
 * only things allowed to mention them are the files that ARE the old access
 * layer (app/server/prisma.ts and the generated client) — delete those and the
 * `prisma`/`@prisma/*` dependencies once this passes.
 */

const APP = path.resolve(process.cwd(), "app");
const OLD_ACCESS_LAYER = new Set([
  path.join(APP, "server", "prisma.ts"),
]);
const FORBIDDEN =
  /from\s+["'](?:@\/app\/server\/(?:prisma|db)|\.{1,2}\/(?:prisma|db)|\.{1,2}\/server\/(?:prisma|db)|@\/app\/generated\/prisma[^"']*|@prisma\/[^"']+)["']/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (full === path.join(APP, "generated")) continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

test("no file under app/ imports the Prisma client or the local JSON store", () => {
  const offenders = walk(APP)
    .filter((file) => !OLD_ACCESS_LAYER.has(file))
    .filter((file) => FORBIDDEN.test(readFileSync(file, "utf8")))
    .map((file) => path.relative(process.cwd(), file));
  assert.deepEqual(offenders, [], `still reading the database from Next.js: ${offenders.join(", ")}`);
});

test("no route handler file exports anything but HTTP handlers and route config", () => {
  const ALLOWED = new Set([
    "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS",
    "runtime", "dynamic", "revalidate", "maxDuration", "preferredRegion", "fetchCache", "dynamicParams",
  ]);
  const bad: string[] = [];
  for (const file of walk(path.join(APP, "api")).filter((f) => f.endsWith(`${path.sep}route.ts`))) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function|const|let)\s+([A-Za-z0-9_]+)/gm)) {
      if (!ALLOWED.has(m[1])) bad.push(`${path.relative(APP, file)}: ${m[1]}`);
    }
  }
  assert.deepEqual(bad, [], "Next.js rejects non-handler exports from a route file");
});
