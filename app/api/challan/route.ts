import { NextResponse } from "next/server";

import { normaliseRc } from "@/app/lib/rc";
import { enforceRateLimit } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/challan?rc=MH12AB1234
 *
 * The government/RTO challan API is not connected, so every lookup answers
 * "coming soon" and nothing is fabricated. When a provider is added it belongs
 * in NestJS (its key and billing stay server-side with the other lookups); this
 * route then forwards to it and the response shape stays stable.
 */
export async function GET(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 30, key: "challan" })).ok) {
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
    source: "coming_soon",
    rc,
    message: "Challan lookup integration coming soon. Connect a verified provider to enable live lookups.",
  });
}
