// Generates crisp SVG placeholder images for cars and marketplace products.
// Run:  node scripts/gen-placeholders.mjs
//
// Writes into public/cars/*.svg and public/products/*.svg so that dynamic
// lists always have a valid, local image to render even when the database is
// empty or services are down.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const carsDir = join(root, "public", "cars");
const productsDir = join(root, "public", "products");
for (const d of [carsDir, productsDir]) mkdirSync(d, { recursive: true });

/* ------------------------------------------------------------------ */
/* Car silhouette: a stylised side-profile hatch/sedan/SUV/EV.         */
/* ------------------------------------------------------------------ */
function carSVG({ color, accent, label = "Progressive AutoHub" }) {
  const stops = (c2) => `
      <stop offset="0" stop-color="${color}"/>
      <stop offset="1" stop-color="${c2}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">${stops(accent)}
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">${stops(lighten(color))}
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#cfe8ff"/><stop offset="1" stop-color="#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="640" height="400" fill="url(#bg)"/>
  <ellipse cx="320" cy="150" rx="430" ry="170" fill="${accent}"/>
  <ellipse cx="520" cy="330" rx="430" ry="170" fill="${accent}"/>

  <!-- Ground -->
  <rect x="30" y="330" width="580" height="6" rx="3" fill="#1b2129"/>

  <!-- Car body -->
  <g transform="translate(140 120)">
    <path d="M0 200 L40 150 Q90 90 150 80 L220 78 Q300 110 330 120 L330 200 L320 200 L160 200 Z"
          fill="url(#body)"/>
    <path d="M78 66 Q120 96 150 100 L150 200 L70 200 Z" fill="url(#glass)" opacity="0.95"/>
    <rect x="70" y="150" width="150" height="6" rx="3" fill="${color}"/>
  </g>

  <!-- Wheels -->
  <g stroke="#141a21" stroke-width="10">
    <circle cx="220" cy="318" r="34" fill="url(#body)"/>
    <circle cx="392" cy="318" r="34" fill="url(#body)"/>
  </g>
  <g fill="#cbd5e1">
    <circle cx="220" cy="318" r="12"/><circle cx="392" cy="318" r="12"/>
  </g>

  <text x="640" y="376" text-anchor="end" font-family="Verdana, sans-serif"
        font-size="22" fill="#9aa4b2" letter-spacing="1">${label}</text>
</svg>`;
}

/* Lighten a hex colour so the body reads as a vertical gradient. */
function lighten(hex) {
  const c = hex.replace("#", "");
  const n = [c.slice(0, 2), c.slice(2, 4), c.slice(4, 6)].map((h) => {
    const v = parseInt(h, 16);
    const up = Math.min(255, Math.round(v + (255 - v) * 0.55));
    return up.toString(16).padStart(2, "0");
  });
  return "#" + n.join("");
}

/* ------------------------------------------------------------------ */
/* Marketplace product icon (used for all categories).                 */
/* ------------------------------------------------------------------ */
function productSVG({ color, accent, glyph, label }) {
  const bg = `linear-gradient(135deg, ${color}14 0%, #0c1117 55%, ${color}28 100%)`;
  const chip = `linear-gradient(180deg, ${color}66 0%, ${color}33 100%)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400" role="img">
  <defs>
    <linearGradient id="pb" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="400" fill="${color}22"/>
  <rect width="640" height="400" fill="#0b1016" opacity="0.35"/>
  <ellipse cx="320" cy="150" rx="430" ry="160" fill="${accent}12"/>
  <circle cx="320" cy="200" r="96" fill="#10151c"/>
  <circle cx="320" cy="200" r="90" fill="url(#pb)" opacity="0.9"/>
  <text x="320" y="230" text-anchor="middle" font-family="Verdana, sans-serif"
        font-size="84" fill="#e6ecf3">${glyph}</text>
  <text x="640" y="376" text-anchor="end" font-family="Verdana, sans-serif"
        font-size="26" fill="#9aa4b2" font-weight="600">${label}</text>
</svg>`;
}

const cars = [
  { file: "suv-graphite.svg",   color: "#1f2937", accent: "#334155", label: "SUV" },
  { file: "suv-emerald.svg",    color: "#065f46", accent: "#10b981", label: "SUV" },
  { file: "sedan-navy.svg",     color: "#1e3a8a", accent: "#3b82f6", label: "Sedan" },
  { file: "sedan-slate.svg",    color: "#334155", accent: "#64748b", label: "Sedan" },
  { file: "hatchback-red.svg",  color: "#b91c1c", accent: "#ef4444", label: "Hatchback" },
  { file: "hatchback-sky.svg",  color: "#0369a1", accent: "#0ea5e9", label: "Hatchback" },
  { file: "ev-blue.svg",        color: "#0b5cab", accent: "#38bdf8", label: "Electric" },
  { file: "compact-amber.svg",  color: "#b45309", accent: "#f59e0b", label: "Compact SUV" },
];

const products = [
  { file: "tyre.svg",     color: "#0f172a", accent: "#38bdf8", glyph: "T", label: "Tyres" },
  { file: "battery.svg",  color: "#312e81", accent: "#818cf8", glyph: "B", label: "Batteries" },
  { file: "car-care.svg", color: "#166534", accent: "#22c55e", glyph: "C", label: "Car Care" },
  { file: "electronics.svg", color: "#581c87", accent: "#a855f7", glyph: "E", label: "Electronics" },
  { file: "accessories.svg", color: "#7c2d12", accent: "#f97316", glyph: "A", label: "Accessories" },
  { file: "spare-parts.svg", color: "#334155", accent: "#94a3b8", glyph: "S", label: "Spare Parts" },
];

let n = 0;
for (const c of cars) {
  writeFileSync(join(carsDir, c.file), carSVG(c), "utf8");
  n++;
}
for (const p of products) {
  writeFileSync(join(productsDir, p.file), productSVG(p), "utf8");
  n++;
}
console.log(`Wrote ${n} SVG placeholders.`);