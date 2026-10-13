import { NextResponse } from "next/server";

import { backendFetch, isBackendUnreachable } from "@/app/lib/backend";

export const runtime = "nodejs";

/**
 * GET /api/listings/counts
 *
 * How many real listings fall in each price band.
 *
 * Previously counted a static `app/data/cars` fixture, so the badges on the
 * site described invented inventory. Counts now come from the backend; when it
 * is unreachable every band reports 0 rather than a fabricated number.
 */

// Price band definitions, in lakhs. `max` of Infinity represents "above".
const bands: Record<string, { label: string; min: number; max: number }> = {
  "under-5": { label: "Under ₹5 Lakh", min: 0, max: 5 },
  "5-10": { label: "₹5 - ₹10 Lakh", min: 5, max: 10 },
  "10-15": { label: "₹10 - ₹15 Lakh", min: 10, max: 15 },
  "above-15": { label: "Above ₹15 Lakh", min: 15, max: Infinity },
};

export async function GET() {
  const counts: Record<string, number> = {
    "under-5": 0,
    "5-10": 0,
    "10-15": 0,
    "above-15": 0,
  };

  let source = "backend";
  let available = true;

  try {
    const data = await backendFetch<{
      data?: { items?: { price: number }[] };
      items?: { price: number }[];
    }>("/vehicles?limit=200");

    const items = data?.data?.items ?? data?.items ?? [];

    for (const car of items) {
      const price = typeof car?.price === "number" ? car.price : NaN;
      if (Number.isNaN(price)) continue;
      const lakhs = price / 100_000;
      for (const [key, b] of Object.entries(bands)) {
        // max === Infinity => the "above" band matches everything >= min
        if (lakhs >= b.min && lakhs < b.max) {
          counts[key] += 1;
          break;
        }
      }
    }
  } catch (err) {
    if (isBackendUnreachable(err)) {
      // No inventory source: report zero, not a made-up total.
      available = false;
      source = "unavailable";
    } else {
      available = false;
      source = "error";
    }
  }

  return NextResponse.json({ counts, bands, source, available });
}
