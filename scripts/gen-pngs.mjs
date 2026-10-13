// Generates brand-specific PNG placeholder car images from SVG -> PNG via sharp.
// Run:  node scripts/gen-pngs.mjs
//
// Reads SVGs from public/cars/*.svg and produces PNG variants in public/cars/.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const carsDir = join(root, "public", "cars");
mkdirSync(carsDir, { recursive: true });

// Brand-specific color overlays and labels for PNG generation.
// Each entry: { file, svgSource, color, label }
// We recolor the SVG by string-replacing colors, then rasterise to PNG.
function recolorSVG(svgStr, fromColor, toColor) {
  return svgStr.split(fromColor).join(toColor);
}

function lighten(hex) {
  const c = hex.replace("#", "");
  const n = [c.slice(0, 2), c.slice(2, 4), c.slice(4, 6)].map((h) => {
    const v = parseInt(h, 16);
    return Math.min(255, Math.round(v + (255 - v) * 0.55))
      .toString(16)
      .padStart(2, "0");
  });
  return "#" + n.join("");
}

// Body-style SVG generators (same as gen-placeholders but inline for recoloring)
function suvSVG(color, accent) {
  const bg1 = accent, bg2 = lighten(accent);
  const b1 = lighten(color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b1}"/><stop offset="1" stop-color="${color}"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe8ff"/><stop offset="1" stop-color="#3b82f6"/></linearGradient>
  </defs>
  <rect width="640" height="400" fill="url(#bg)"/>
  <ellipse cx="320" cy="150" rx="430" ry="170" fill="${accent}" opacity="0.3"/>
  <ellipse cx="520" cy="330" rx="430" ry="170" fill="${accent}" opacity="0.2"/>
  <rect x="30" y="330" width="580" height="6" rx="3" fill="#1b2129"/>
  <g transform="translate(120 100)">
    <path d="M0 210 L30 170 Q80 100 140 85 L200 80 Q220 78 240 82 L280 95 Q320 105 350 115 L360 120 L360 210 L340 210 L140 210 Z" fill="url(#body)"/>
    <path d="M60 70 Q100 100 150 105 L150 210 L50 210 Z" fill="url(#glass)" opacity="0.95"/>
    <rect x="50" y="160" width="180" height="6" rx="3" fill="${color}"/>
    <rect x="280" y="130" width="80" height="4" rx="2" fill="${color}" opacity="0.6"/>
  </g>
  <g stroke="#141a21" stroke-width="10"><circle cx="210" cy="318" r="36" fill="url(#body)"/><circle cx="400" cy="318" r="36" fill="url(#body)"/></g>
  <g fill="#cbd5e1"><circle cx="210" cy="318" r="13"/><circle cx="400" cy="318" r="13"/></g>
</svg>`;
}

function sedanSVG(color, accent) {
  const bg2 = lighten(accent);
  const b1 = lighten(color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b1}"/><stop offset="1" stop-color="${color}"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe8ff"/><stop offset="1" stop-color="#3b82f6"/></linearGradient>
  </defs>
  <rect width="640" height="400" fill="url(#bg)"/>
  <ellipse cx="320" cy="160" rx="420" ry="160" fill="${accent}" opacity="0.25"/>
  <ellipse cx="500" cy="330" rx="400" ry="160" fill="${accent}" opacity="0.15"/>
  <rect x="30" y="330" width="580" height="6" rx="3" fill="#1b2129"/>
  <g transform="translate(130 130)">
    <path d="M0 180 L30 140 Q70 95 130 82 L210 78 Q280 90 320 105 L340 112 L340 180 L320 180 L120 180 Z" fill="url(#body)"/>
    <path d="M70 68 Q110 92 145 96 L145 180 L60 180 Z" fill="url(#glass)" opacity="0.95"/>
    <rect x="60" y="140" width="160" height="5" rx="2" fill="${color}"/>
  </g>
  <g stroke="#141a21" stroke-width="10"><circle cx="210" cy="318" r="32" fill="url(#body)"/><circle cx="395" cy="318" r="32" fill="url(#body)"/></g>
  <g fill="#cbd5e1"><circle cx="210" cy="318" r="11"/><circle cx="395" cy="318" r="11"/></g>
</svg>`;
}

function hatchbackSVG(color, accent) {
  const bg2 = lighten(accent);
  const b1 = lighten(color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b1}"/><stop offset="1" stop-color="${color}"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe8ff"/><stop offset="1" stop-color="#3b82f6"/></linearGradient>
  </defs>
  <rect width="640" height="400" fill="url(#bg)"/>
  <ellipse cx="320" cy="160" rx="400" ry="150" fill="${accent}" opacity="0.25"/>
  <ellipse cx="480" cy="330" rx="400" ry="150" fill="${accent}" opacity="0.15"/>
  <rect x="30" y="330" width="580" height="6" rx="3" fill="#1b2129"/>
  <g transform="translate(150 135)">
    <path d="M0 175 L25 135 Q60 90 120 78 L190 75 Q240 85 270 95 L280 100 L280 175 L260 175 L100 175 Z" fill="url(#body)"/>
    <path d="M55 62 Q90 85 120 90 L120 175 L45 175 Z" fill="url(#glass)" opacity="0.95"/>
    <rect x="45" y="135" width="130" height="5" rx="2" fill="${color}"/>
  </g>
  <g stroke="#141a21" stroke-width="10"><circle cx="210" cy="318" r="30" fill="url(#body)"/><circle cx="380" cy="318" r="30" fill="url(#body)"/></g>
  <g fill="#cbd5e1"><circle cx="210" cy="318" r="10"/><circle cx="380" cy="318" r="10"/></g>
</svg>`;
}

function evSVG(color, accent) {
  const bg2 = lighten(accent);
  const b1 = lighten(color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b1}"/><stop offset="1" stop-color="${color}"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe8ff"/><stop offset="1" stop-color="#38bdf8"/></linearGradient>
  </defs>
  <rect width="640" height="400" fill="url(#bg)"/>
  <ellipse cx="320" cy="155" rx="430" ry="165" fill="${accent}" opacity="0.25"/>
  <ellipse cx="510" cy="330" rx="420" ry="160" fill="${accent}" opacity="0.15"/>
  <rect x="30" y="330" width="580" height="6" rx="3" fill="#1b2129"/>
  <g transform="translate(135 115)">
    <path d="M0 200 L35 155 Q75 95 140 82 L215 78 Q290 95 330 110 L345 118 L345 200 L325 200 L130 200 Z" fill="url(#body)"/>
    <path d="M65 66 Q105 94 140 98 L140 200 L55 200 Z" fill="url(#glass)" opacity="0.95"/>
    <rect x="55" y="150" width="165" height="5" rx="2" fill="${color}"/>
    <circle cx="310" cy="155" r="12" fill="#22c55e" opacity="0.8"/>
    <text x="310" y="160" text-anchor="middle" font-family="Verdana" font-size="14" fill="#fff" font-weight="bold">E</text>
  </g>
  <g stroke="#141a21" stroke-width="10"><circle cx="210" cy="318" r="34" fill="url(#body)"/><circle cx="395" cy="318" r="34" fill="url(#body)"/></g>
  <g fill="#cbd5e1"><circle cx="210" cy="318" r="12"/><circle cx="395" cy="318" r="12"/></g>
</svg>`;
}

// Brand image definitions: each brand gets images matching their body types + colors.
const brandImages = [
  // Maruti Suzuki
  { file: "maruti-suzuki-suv.png",     svg: suvSVG,     color: "#1e40af", accent: "#3b82f6", label: "Maruti Suzuki SUV" },
  { file: "maruti-suzuki-sedan.png",   svg: sedanSVG,   color: "#dc2626", accent: "#f87171", label: "Maruti Suzuki Sedan" },
  { file: "maruti-suzuki-hatchback.png", svg: hatchbackSVG, color: "#059669", accent: "#34d399", label: "Maruti Suzuki Hatchback" },
  // Hyundai
  { file: "hyundai-suv.png",           svg: suvSVG,     color: "#1d4ed8", accent: "#60a5fa", label: "Hyundai SUV" },
  { file: "hyundai-sedan.png",         svg: sedanSVG,   color: "#111827", accent: "#6b7280", label: "Hyundai Sedan" },
  { file: "hyundai-hatchback.png",     svg: hatchbackSVG, color: "#f59e0b", accent: "#fbbf24", label: "Hyundai Hatchback" },
  // Tata
  { file: "tata-suv.png",              svg: suvSVG,     color: "#0f766e", accent: "#2dd4bf", label: "Tata SUV" },
  { file: "tata-ev.png",               svg: evSVG,      color: "#0284c7", accent: "#38bdf8", label: "Tata EV" },
  { file: "tata-sedan.png",            svg: sedanSVG,   color: "#4338ca", accent: "#818cf8", label: "Tata Sedan" },
  // Mahindra
  { file: "mahindra-suv.png",          svg: suvSVG,     color: "#b91c1c", accent: "#f87171", label: "Mahindra SUV" },
  { file: "mahindra-ev.png",           svg: evSVG,      color: "#dc2626", accent: "#fca5a5", label: "Mahindra EV" },
  // Kia
  { file: "kia-suv.png",               svg: suvSVG,     color: "#1e293b", accent: "#475569", label: "Kia SUV" },
  { file: "kia-sedan.png",             svg: sedanSVG,   color: "#0369a1", accent: "#38bdf8", label: "Kia Sedan" },
  // Toyota
  { file: "toyota-suv.png",            svg: suvSVG,     color: "#1f2937", accent: "#9ca3af", label: "Toyota SUV" },
  { file: "toyota-sedan.png",          svg: sedanSVG,   color: "#f97316", accent: "#fb923c", label: "Toyota Sedan" },
  // Honda
  { file: "honda-sedan.png",           svg: sedanSVG,   color: "#166534", accent: "#4ade80", label: "Honda Sedan" },
  { file: "honda-suv.png",             svg: suvSVG,     color: "#1e3a8a", accent: "#60a5fa", label: "Honda SUV" },
  // MG
  { file: "mg-suv.png",                svg: suvSVG,     color: "#7c2d12", accent: "#fb923c", label: "MG SUV" },
  { file: "mg-ev.png",                 svg: evSVG,      color: "#0e7490", accent: "#22d3ee", label: "MG EV" },
  // VW
  { file: "vw-sedan.png",              svg: sedanSVG,   color: "#1e40af", accent: "#60a5fa", label: "VW Sedan" },
  { file: "vw-suv.png",                svg: suvSVG,     color: "#1e3a5f", accent: "#3b82f6", label: "VW SUV" },
  // Skoda
  { file: "skoda-sedan.png",           svg: sedanSVG,   color: "#166534", accent: "#4ade80", label: "Skoda Sedan" },
  { file: "skoda-suv.png",             svg: suvSVG,     color: "#047857", accent: "#34d399", label: "Skoda SUV" },
  // Generic / category images
  { file: "suv-white.png",             svg: suvSVG,     color: "#d1d5db", accent: "#f3f4f6", label: "White SUV" },
  { file: "suv-black.png",             svg: suvSVG,     color: "#111827", accent: "#374151", label: "Black SUV" },
  { file: "suv-blue.png",              svg: suvSVG,     color: "#1e40af", accent: "#3b82f6", label: "Blue SUV" },
  { file: "sedan-white.png",           svg: sedanSVG,   color: "#d1d5db", accent: "#f3f4f6", label: "White Sedan" },
  { file: "sedan-red.png",             svg: sedanSVG,   color: "#dc2626", accent: "#f87171", label: "Red Sedan" },
  { file: "sedan-silver.png",          svg: sedanSVG,   color: "#9ca3af", accent: "#d1d5db", label: "Silver Sedan" },
  { file: "hatchback-blue.png",        svg: hatchbackSVG, color: "#1d4ed8", accent: "#60a5fa", label: "Blue Hatchback" },
  { file: "hatchback-white.png",       svg: hatchbackSVG, color: "#e5e7eb", accent: "#f9fafb", label: "White Hatchback" },
  { file: "ev-white.png",              svg: evSVG,      color: "#e5e7eb", accent: "#f9fafb", label: "White EV" },
  { file: "ev-silver.png",             svg: evSVG,      color: "#9ca3af", accent: "#d1d5db", label: "Silver EV" },
  { file: "compact-suv-grey.png",      svg: suvSVG,     color: "#4b5563", accent: "#9ca3af", label: "Grey Compact SUV" },
  { file: "compact-suv-red.png",       svg: suvSVG,     color: "#dc2626", accent: "#f87171", label: "Red Compact SUV" },
  { file: "luxury-black.png",          svg: sedanSVG,   color: "#030712", accent: "#1f2937", label: "Luxury Sedan" },
  { file: "mpv-white.png",             svg: suvSVG,     color: "#d1d5db", accent: "#f3f4f6", label: "White MPV" },
  // placeholder.png (missing fallback)
  { file: "placeholder.png",           svg: suvSVG,     color: "#6b7280", accent: "#9ca3af", label: "Progressive AutoHub" },
];

async function main() {
  let count = 0;
  for (const img of brandImages) {
    const svgStr = img.svg(img.color, img.accent);
    const pngBuf = await sharp(Buffer.from(svgStr)).png().toBuffer();
    writeFileSync(join(carsDir, img.file), pngBuf);
    count++;
  }
  console.log(`Generated ${count} PNG placeholder images in public/cars/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
