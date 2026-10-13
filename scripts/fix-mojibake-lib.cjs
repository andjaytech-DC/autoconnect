// Shared mojibake decode logic (windows-1252 double-decode reversal).
const CP1252_SPECIAL = {
  0x80: "\u20ac", 0x82: "\u201a", 0x83: "\u0192", 0x84: "\u201e",
  0x85: "\u2026", 0x86: "\u2020", 0x87: "\u2021", 0x88: "\u02c6",
  0x89: "\u2030", 0x8a: "\u0160", 0x8b: "\u2039", 0x8c: "\u0152",
  0x8e: "\u017d", 0x91: "\u2018", 0x92: "\u2019", 0x93: "\u201c",
  0x94: "\u201d", 0x95: "\u2022", 0x96: "\u2013", 0x97: "\u2014",
  0x98: "\u02dc", 0x99: "\u2122", 0x9a: "\u0161", 0x9b: "\u203a",
  0x9c: "\u0153", 0x9e: "\u017e", 0x9f: "\u0178",
};
const ENCODE = {};
for (const [b, ch] of Object.entries(CP1252_SPECIAL)) ENCODE[ch] = Number(b);
const SPECIALS = new Set(Object.values(CP1252_SPECIAL));

function isSuspicious(ch) {
  const cp = ch.codePointAt(0);
  if (cp < 256) {
    if (cp < 128) return false;
    return true;
  }
  if (cp >= 0x80 && cp <= 0x9f) return true;
  return SPECIALS.has(ch);
}

function collapseRun(run) {
  const bytes = [];
  for (const ch of run) {
    if (ch in ENCODE) bytes.push(ENCODE[ch]);
    else {
      const cp = ch.codePointAt(0);
      if (cp < 256) bytes.push(cp);
      else {
        const b = Buffer.from(ch, "utf8");
        for (const x of b) bytes.push(x);
      }
    }
  }
  const fixed = Buffer.from(bytes).toString("utf8");
  if (fixed.includes("�")) return null;
  if (fixed === run) return null;
  return fixed;
}

// Returns list of {start,end,before,after} in code-point-agnostic index space
// (uses the for..of char array for indices in JS string offsets - careful:
// we track UTF-16 offsets).
function collectReplacements(s) {
  const chars = [...s];
  // map char-array index -> utf16 offset
  const offsets = [];
  let o = 0;
  for (const ch of chars) { offsets.push(o); o += ch.length; }
  offsets.push(o);
  const reps = [];
  let run = "";
  let runStart = 0;
  const flush = (endCi) => {
    if (!run) return;
    const fixed = collapseRun(run);
    if (fixed !== null) {
      reps.push({
        start: offsets[runStart],
        end: offsets[endCi],
        before: run,
        after: fixed,
      });
    }
    run = "";
  };
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (isSuspicious(ch)) {
      if (!run) runStart = i;
      run += ch;
    } else {
      flush(i);
    }
  }
  flush(chars.length);
  return reps;
}

function applyReplacements(s, reps) {
  let out = s;
  for (let i = reps.length - 1; i >= 0; i--) {
    const r = reps[i];
    out = out.slice(0, r.start) + r.after + out.slice(r.end);
  }
  return out;
}

module.exports = { collectReplacements, applyReplacements, collapseRun, isSuspicious };
