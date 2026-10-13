/**
 * Shared bootstrap for the node:test suites.
 *
 * The route modules import the Prisma client at module scope, and Prisma
 * refuses to construct without DATABASE_URL. Loaded via
 * `node --import tsx --import ./tests/setup.ts --test`, which guarantees this
 * runs before any test file is imported.
 *
 * Reads the real `.env` so the database-backed read paths (the vehicle lookup in
 * app/server/uploads.ts) execute for real. Nothing in the suite writes: the
 * authorization assertions all reject before a query runs, and the only query
 * that does run is a `findFirst` select.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

loadDotenv({ path: path.join(repoRoot, ".env"), quiet: true });

// Fall back to a syntactically valid placeholder only when no .env exists, so
// the suites still construct a client rather than throwing at import time.
process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/autoconnect-tests";
process.env.AUTH_SECRET ??= "autoconnect-unit-test-secret";

if (!existsSync(path.join(repoRoot, ".env"))) {
  // Announce it so a green run against the placeholder is never mistaken for a
  // green run against the real database.
  console.warn(
    "[tests] no .env found — database-backed assertions are running against a placeholder DATABASE_URL.",
  );
}
