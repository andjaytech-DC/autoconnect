import { NextResponse } from "next/server";

import { normaliseRc } from "@/app/lib/rc";
import { enforceRateLimit } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/car-check?rc=MH12AB1234
 *
 * No inspection-report provider is connected and NestJS holds no reports keyed
 * by registration number, so every valid lookup answers `found: false`. Reports
 * are never fabricated. When a verified provider is added it belongs in NestJS
 * (like vehicle-history's lookup service); this route then forwards to it.
 */
export async function GET(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 30, key: "car-check" })).ok) {
    return NextResponse.json({ error: "Too many requests, try again later" }, { status: 429 });
  }

  const rc = normaliseRc(new URL(request.url).searchParams.get("rc"));
  if (!rc) {
    return NextResponse.json(
      { error: "Provide a valid registration number, e.g. MH12AB1234" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    found: false,
    source: "not_found",
    rc,
    message:
      "No inspection report is on file for this registration number. Connect a verified inspection provider to enable live reports.",
  });
}
