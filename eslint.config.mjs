import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Irrecoverably mojibake-corrupted and already excluded from tsconfig.json.
    // Kept in the repo only so the damage is visible; they do not parse.
    "prisma/seed-all.ts",
    "prisma/seed-all-no-bom.ts",
  ]),

  // CommonJS maintenance tooling. `require()` is the correct module system in
  // these files, so the rule that bans it for app code does not apply.
  {
    files: [
      "scripts/**/*.js",
      "scripts/**/*.cjs",
      "scripts/**/*.mjs",
      "docs/**/*.ts",
      "check-db.js",
      "fix-bom.js",
      // next.config.js is loaded as CJS by the Next CLI (package.json has no
      // `type: module`), and it requires lib/security-headers.js which is CJS
      // by design so the same build path can load it.
      "next.config.js",
      "lib/security-headers.js",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // prisma.config.ts is executed by the Prisma CLI, which loads it as CJS.
  {
    files: ["prisma.config.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
