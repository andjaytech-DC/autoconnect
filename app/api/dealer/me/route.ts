import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireRole } from "@/app/server/authz";

export const runtime = "nodejs";

interface BackendDealerProfile {
  id: number;
  businessName: string;
  city?: string | null;
  state?: string | null;
  status?: string | null;
  phone?: string | null;
  ownerName?: string | null;
  email?: string | null;
}

/**
 * GET /api/dealer/me — the caller's own dealer profile.
 * Lets the dealer portal lock the add-vehicle form to the right dealerId.
 * NestJS resolves the dealership from the token (owner, or active employee).
 */
export async function GET(request: Request) {
  const auth = await requireRole(request, "DEALER", "DEALER_EMPLOYEE");
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  try {
    const d = await backendFetch<BackendDealerProfile>("/dealers/me", {
      token: auth.session.token,
    });
    return NextResponse.json({
      dealer: {
        id: d.id,
        businessName: d.businessName,
        city: d.city ?? null,
        state: d.state ?? null,
        status: d.status ?? null,
        ownerName: d.ownerName ?? null,
        email: d.email ?? null,
        phone: d.phone ?? null,
      },
    });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
