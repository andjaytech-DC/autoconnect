import { NextResponse } from "next/server";

import { requireDealerStaff } from "@/app/server/authz";

export const runtime = "nodejs";

/**
 * GET /api/dealer/me — the caller's own dealer profile.
 * Lets the dealer portal lock the add-vehicle form to the right dealerId.
 */
export async function GET(request: Request) {
  const auth = await requireDealerStaff(request);
  if (auth instanceof NextResponse) return auth;
  const d = auth.dealer!;
  return NextResponse.json({
    dealer: {
      id: d.id,
      businessName: d.businessName,
      city: d.city,
      state: d.state,
      status: (d as Record<string, unknown>).status,
      ownerName: (d as Record<string, unknown>).ownerName,
      email: (d as Record<string, unknown>).email,
      phone: (d as Record<string, unknown>).phone,
    },
  });
}
