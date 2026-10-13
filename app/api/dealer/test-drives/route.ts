import { NextResponse } from "next/server";

import { prisma } from "@/app/server/prisma";
import { requireDealerStaff } from "@/app/server/authz";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";
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
 * GET /api/dealer/test-drives — test drives for the dealer's vehicles only.
 * Backed by the NestJS API when reachable. Error handling is centralized in
 * withErrorGuard so the route always returns JSON (never an HTML error page).
 */
const handler = async (request: Request): Promise<NextResponse> => {
  const session = await verifySession(readSessionCookie(request));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1) NestJS backend (authoritative)
  if (session.token) {
    try {
      const testDrives = await backendFetch<BackendTestDrive[]>(
        "/test-drives/dealer",
        { token: session.token },
      );
      return NextResponse.json({
        testDrives: (testDrives ?? []).map(mapTestDrive),
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
  const testDrives = await prisma.testDrive.findMany({
    where: { vehicle: { dealerId: auth.dealer!.id } },
    include: { vehicle: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ testDrives, source: "local" });
};

export const GET = withErrorGuard(handler, { route: "api/dealer/test-drives" });