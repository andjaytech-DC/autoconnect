import { NextResponse } from "next/server";
import { z } from "zod";

import { enforceRateLimit } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Rate limit for the quote calculator.
 *
 * Purely computational — no database, no network — so this is not about cost so
 * much as denying an easy CPU-exhaustion target. The bucket is deliberately
 * generous because untrusted callers share one entry (see lib/client-ip.ts) and
 * a tight limit would throttle legitimate visitors alongside an abuser. Any
 * deployment behind a proxy should set TRUST_PROXY_HEADERS, which splits that
 * bucket per client and makes this far more precise.
 */
const QUOTE_LIMIT = { limit: 120, windowMs: 60_000, key: "insurance-quote" };

/**
 * POST /api/insurance/quote
 *
 * Deterministic premium model for indicative car-insurance quotes:
 *   own-damage base     = IDV × ownDamageRate × ageLoad
 *   third-party         = flat statutory-style component by engine band
 *   add-ons             = itemised fixed/percentage components
 *   no-claim bonus      = discount on the own-damage component only
 *   GST                 = 18% on the total
 *
 * These are OUR calculations for guidance — no insurer prices are faked.
 * A live insurer/broker integration would replace `computeQuote` only.
 */

const quoteSchema = z.object({
  idv: z.number().min(50_000).max(5_000_000),
  vehicleAgeYears: z.number().int().min(0).max(20),
  engineCc: z.number().int().min(600).max(6_000),
  coverType: z.enum(["COMPREHENSIVE", "THIRD_PARTY"]),
  ncbSlab: z.union([z.literal(0), z.literal(20), z.literal(25), z.literal(35), z.literal(45), z.literal(50)]),
  addons: z.array(
    z.enum(["ZERO_DEP", "ENGINE_PROTECT", "ROADSIDE_ASSISTANCE", "NCB_PROTECT"]),
  ),
});

function inr(value: number): number {
  return Math.round(value);
}

function computeQuote(input: z.infer<typeof quoteSchema>) {
  const lines: { label: string; amount: number }[] = [];

  // Third-party component — statutory-style, banded by engine capacity.
  const thirdParty =
    input.engineCc <= 1000 ? 2_092 : input.engineCc <= 1500 ? 3_416 : 6_712;

  let ownDamage = 0;
  if (input.coverType === "COMPREHENSIVE") {
    const ownDamageRate = 0.0312;
    // Older vehicles attract a loading factor (wear/tear risk), capped at +30%.
    const ageLoad = 1 + Math.min(input.vehicleAgeYears * 0.015, 0.3);
    ownDamage = input.idv * ownDamageRate * ageLoad;
  }

  const ncbDiscount = (ownDamage * input.ncbSlab) / 100;
  const ownDamageNet = ownDamage - ncbDiscount;

  const addonRates: Record<string, { label: string; amount: number }> = {
    ZERO_DEP: { label: "Zero depreciation", amount: Math.max(input.idv * 0.0015, 1_500) },
    ENGINE_PROTECT: { label: "Engine protect", amount: 2_200 },
    ROADSIDE_ASSISTANCE: { label: "Roadside assistance", amount: 550 },
    NCB_PROTECT: { label: "No-claim bonus protect", amount: 900 },
  };

  if (input.coverType === "COMPREHENSIVE") {
    lines.push({
      label: `Own damage (IDV ₹${input.idv.toLocaleString("en-IN")})`,
      amount: inr(ownDamageNet),
    });
  }
  lines.push({ label: "Third-party liability", amount: thirdParty });
  if (ncbDiscount > 0) {
    lines.push({ label: `No-claim bonus (−${input.ncbSlab}%)`, amount: -inr(ncbDiscount) });
  }

  for (const addon of input.addons) {
    const rate = addonRates[addon];
    if (rate && input.coverType === "COMPREHENSIVE") {
      lines.push({ label: rate.label, amount: inr(rate.amount) });
    }
  }

  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  return {
    idv: input.idv,
    coverType: input.coverType,
    lines: lines.map((l) => ({ ...l, amount: inr(l.amount) })),
    subtotal: inr(subtotal),
    gst: inr(gst),
    total: inr(total),
  };
}

export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, QUOTE_LIMIT)).ok) {
    return NextResponse.json(
      { error: "Too many requests, try again shortly" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ quote: computeQuote(parsed.data) });
}