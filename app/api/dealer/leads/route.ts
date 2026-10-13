import { NextResponse } from "next/server";

import { prisma } from "@/app/server/prisma";
import { requireDealerStaff } from "@/app/server/authz";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";
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

/**
 * GET /api/dealer/leads — leads for the dealer's vehicles only.
 * Backed by the NestJS API when reachable.
 */
const handler = async (request: Request): Promise<NextResponse> => {
  const session = await verifySession(readSessionCookie(request));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1) NestJS backend (authoritative) — /leads/dealer resolves the dealer
  //    from the authenticated user.
  if (session.token) {
    try {
      const leads = await backendFetch<BackendLead[]>("/leads/dealer", {
        token: session.token,
      });
      return NextResponse.json({
        leads: (leads ?? []).map(mapLead),
        source: "backend",
      });
    } catch (err) {
      if (!isBackendUnreachable(err) && err instanceof BackendError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
    }
  }

  // 2) Local fallback
  const auth = await requireDealerStaff(request);
  if (auth instanceof NextResponse) return auth;
  const leads = await prisma.lead.findMany({
    where: { vehicle: { dealerId: auth.dealer!.id } },
    include: { vehicle: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ leads, source: "local" });
};

export const GET = withErrorGuard(handler, { route: "api/dealer/leads" });