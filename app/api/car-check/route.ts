import { NextResponse } from "next/server";

import { inspectionReports } from "@/app/server/seed";

export const runtime = "nodejs";

/**
 * GET /api/car-check?rc=MH12AB1234
 *
 * Serves the Progressive AutoHub inspection report dataset. Unknown plates
 * return `found: false` — reports are never fabricated for unknown RCs.
 *
 * P0-13: the dataset is now empty (the two invented reports were removed), so
 * every lookup returns `found: false`. The `source` field previously read
 * "sample", which implied demo data existed to try. It now reports
 * "not_found" so the UI cannot misrepresent an empty result as a sample.
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

  const report = inspectionReports.find((r) => r.rc === rc);
  if (!report) {
    return NextResponse.json({
      found: false,
      source: "not_found",
      rc,
      message:
        "No inspection report is on file for this registration number. Connect a verified inspection provider to enable live reports.",
    });
  }

  return NextResponse.json({ found: true, source: "provider", report });
}