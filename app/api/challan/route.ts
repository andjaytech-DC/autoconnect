import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/challan?rc=MH12AB1234
 *
 * Challan lookup provider abstraction. The government/RTO challan API is
 * NOT connected yet, so every lookup returns a "coming soon" response.
 *
 * To integrate a real provider later:
 *   1. Set CHALLAN_PROVIDER_API_KEY in the environment.
 *   2. Implement fetchChallanFromProvider(rc) below.
 *   3. The rest of the response shape stays stable for the frontend.
 */
const RC_PATTERN = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/;

function normaliseRc(raw: string | null): string | null {
  if (!raw) return null;
  const rc = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return RC_PATTERN.test(rc) ? rc : null;
}

export async function GET(request: Request) {
  const rc = normaliseRc(new URL(request.url).searchParams.get("rc"));
  if (!rc) {
    return NextResponse.json(
      { error: "Provide a valid registration number, e.g. MH12AB1234" },
      { status: 400 },
    );
  }

  // No provider configured — do not fabricate results.
  return NextResponse.json({
    found: false,
    source: "coming_soon",
    rc,
    message: "Challan lookup integration coming soon. Connect a verified provider to enable live lookups.",
  });
}
