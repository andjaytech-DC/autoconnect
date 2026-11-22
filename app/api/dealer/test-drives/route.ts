import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireRole } from "@/app/server/authz";
import { withErrorGuard } from "@/app/lib/route-guard";

export const runtime = "nodejs";

interface BackendTestDrive {
  id: number;
  customerName: string;
  customerPhone: string;
  preferredDate: string;
  preferredTime?: string | null;
  createdAt: string;
  vehicle?: { id?: number; title?: string } | null;
}

/** Map a backend test drive to the dashboard row shape. */
function mapTestDrive(t: BackendTestDrive) {
  return {
    id: t.id,
    customerName: t.customerName,
    customerPhone: t.customerPhone,
    preferredDate: t.preferredDate,
    preferredTime: t.preferredTime ?? null,
    status: "SCHEDULED",
    createdAt: t.createdAt,
    vehicle: t.vehicle
      ? { id: t.vehicle.id ?? null, title: t.vehicle.title ?? null }
      : null,
  };
}

/**
 * GET /api/dealer/test-drives — test drives for the dealership's own vehicles
 * only. Error handling is centralized in withErrorGuard so the route always
 * returns JSON (never an HTML error page).
 */
const handler = async (request: Request): Promise<NextResponse> => {
  const auth = await requireRole(request, "DEALER", "DEALER_EMPLOYEE");
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  try {
    const testDrives = await backendFetch<BackendTestDrive[]>("/dealers/me/test-drives", {
      token: auth.session.token,
    });
    return NextResponse.json({
      testDrives: (testDrives ?? []).map(mapTestDrive),
      source: "backend",
    });
  } catch (err) {
    return backendErrorResponse(err);
  }
};

export const GET = withErrorGuard(handler, { route: "api/dealer/test-drives" });
