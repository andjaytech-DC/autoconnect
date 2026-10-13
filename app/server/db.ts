import fs from "node:fs/promises";
import path from "node:path";

import { buildSeed } from "./seed";
import type { Db } from "./types";

/**
 * Local persistence adapter — a JSON file under `.data/`.
 *
 * This is the SINGLE SEAM for backend data access. Every domain function in
 * this folder goes through `getDb`/`updateDb`, so swapping to Prisma or the
 * NestJS REST API later means replacing these two functions only.
 *
 * Route handlers run on the Node.js runtime, so `node:fs` is available here.
 * (Not importable from middleware or client components.)
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

let cache: Db | null = null;
let writeChain: Promise<void> = Promise.resolve();

/** Read the database, seeding it on first access. */
export async function getDb(): Promise<Db> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    cache = JSON.parse(raw) as Db;
    if (!Array.isArray(cache.users)) throw new Error("corrupt db");
  } catch {
    cache = buildSeed();
    await persist();
  }
  return cache;
}

/** Mutate the database and persist the result. */
export async function updateDb<T>(
  mutator: (db: Db) => T,
): Promise<{ db: Db; result: T }> {
  const db = await getDb();
  const result = mutator(db);
  await persist();
  return { db, result };
}

/** Serialised write so concurrent handlers never interleave partial JSON. */
function persist(): Promise<void> {
  const next = writeChain.then(async () => {
    if (!cache) return;
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(cache, null, 2), "utf8");
    await fs.rename(tmp, DB_FILE);
  });
  writeChain = next.catch(() => undefined);
  return next;
}

/** Generate a reasonably unique id without a uuid dependency. */
export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
