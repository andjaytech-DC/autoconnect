/**
 * Shared bootstrap for the node:test suites.
 *
 * Loaded via `node --import tsx --import ./tests/setup.ts --test`, which
 * guarantees this runs before any test file is imported.
 *
 * Next.js holds no database: every suite replaces NestJS with a fake `fetch`,
 * so no DATABASE_URL is needed and nothing here can read or write real data.
 * The `.env` is still read for AUTH_SECRET and friends so signed sessions in
 * the tests match the app's configuration.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

loadDotenv({ path: path.join(repoRoot, ".env"), quiet: true });

// A deterministic secret when no .env exists, so session signing still works.
process.env.AUTH_SECRET ??= "autoconnect-unit-test-secret";

if (!existsSync(path.join(repoRoot, ".env"))) {
  console.warn("[tests] no .env found — using the built-in test AUTH_SECRET.");
}
