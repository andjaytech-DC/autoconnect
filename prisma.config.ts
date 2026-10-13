import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 config: schema location + datasource url (the .env file is NOT
// auto-loaded by the CLI in Prisma 7, so we parse it here for dev).
function loadEnvFile(): Record<string, string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const fs = require("node:fs") as typeof import("node:fs");
    const raw = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
    const env: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
      if (m) env[m[1]] = m[2];
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnvFile();

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  migrations: {
    path: path.join(__dirname, "prisma", "migrations"),
  },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      env.DATABASE_URL ??
      "postgres://postgres:postgres@localhost:51214/autoconnect?sslmode=disable",
    // Clean shadow database for `migrate dev` (the default prisma-dev shadow
    // carries stale objects, causing P3006 on replay).
    shadowDatabaseUrl:
      process.env.SHADOW_DATABASE_URL ??
      "postgres://postgres:postgres@localhost:51214/shadowdb?sslmode=disable",
  },
});
