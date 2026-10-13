// Global mojibake fixer: UTF-8 bytes once mis-decoded as windows-1252 and
// re-saved as UTF-8. Reverses that transform run-by-run, with a guard:
// a run is only replaced if decoding yields no U+FFFD, so legit single
// chars (real em-dashes, bullets, ...) are left untouched.
// Also strips BOM. Usage: node scripts/fix-mojibake.cjs [--apply]
const fs = require("fs");
const path = require("path");
const fixer = require("./fix-mojibake-lib.cjs");

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", ".data"]);
const EXT_RE = /\.(tsx|ts|js|jsx|css|json|md)$/;
const APPLY = process.argv.includes("--apply");

function walk(dir, out) {
  out = out || [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    if (e.name === "package-lock.json") continue;
    if (/^(fix-mojibake|report-mojibake).*\.cjs$/.test(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT_RE.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(".");
let changedFiles = 0;
let totalRuns = 0;
for (const f of files) {
  const raw = fs.readFileSync(f, "utf8");
  let s = raw;
  let bom = false;
  if (s.charCodeAt(0) === 0xfeff) { s = s.slice(1); bom = true; }
  const reps = fixer.collectReplacements(s);
  if (reps.length > 0 || bom) {
    console.log((APPLY ? "FIX " : "WOULD-FIX ") + f + " runs=" + reps.length + (bom ? " BOM" : ""));
    changedFiles++;
    totalRuns += reps.length;
    if (APPLY) fs.writeFileSync(f, fixer.applyReplacements(s, reps), "utf8");
  }
}
console.log((APPLY ? "FIXED " : "DRY-RUN ") + changedFiles + " files, " + totalRuns + " runs");
