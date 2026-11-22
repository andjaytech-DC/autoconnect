import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireRole } from "@/app/server/authz";

export const runtime = "nodejs";

/** GET /api/dealer/stats — dealer dashboard metrics (own dealership only). */
export async function GET(request: Request) {
  const auth = await requireRole(request, "DEALER", "DEALER_EMPLOYEE");
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  try {
    const stats = await backendFetch<Record<string, number>>("/dealers/me/stats", {
      token: auth.session.token,
    });
    return NextResponse.json({ stats, source: "backend" });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
