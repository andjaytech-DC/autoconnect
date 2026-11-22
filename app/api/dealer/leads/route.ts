import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireRole } from "@/app/server/authz";
import { withErrorGuard } from "@/app/lib/route-guard";

export const runtime = "nodejs";

interface BackendLead {
  id: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  vehicle?: { id?: number; title?: string } | null;
}

/** Map a backend lead to the dashboard row shape. */
function mapLead(l: BackendLead) {
  return {
    id: l.id,
    customerName: l.customerName,
    customerPhone: l.customerPhone,
    customerEmail: l.customerEmail ?? null,
    status: l.status,
    notes: l.notes ?? null,
    createdAt: l.createdAt,
    vehicle: l.vehicle
      ? { id: l.vehicle.id ?? null, title: l.vehicle.title ?? null }
      : null,
  };
}

/** GET /api/dealer/leads — leads for the dealership's own vehicles only. */
const handler = async (request: Request): Promise<NextResponse> => {
  const auth = await requireRole(request, "DEALER", "DEALER_EMPLOYEE");
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  try {
    const leads = await backendFetch<BackendLead[]>("/dealers/me/leads", {
      token: auth.session.token,
    });
    return NextResponse.json({ leads: (leads ?? []).map(mapLead), source: "backend" });
  } catch (err) {
    return backendErrorResponse(err);
  }
};

export const GET = withErrorGuard(handler, { route: "api/dealer/leads" });
