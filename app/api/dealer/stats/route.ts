import { NextResponse } from "next/server";

import { prisma } from "@/app/server/prisma";
import { requireDealerStaff } from "@/app/server/authz";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";

export const runtime = "nodejs";

/**
 * GET /api/dealer/stats — dealer dashboard metrics (own data only).
 * Computed from the NestJS API when reachable.
 */
export async function GET(request: Request) {
  const session = await verifySession(readSessionCookie(request));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1) NestJS backend (authoritative) — compute from the dealer-scoped endpoints.
  if (session.token) {
    try {
      const [vehicles, leads, testDrives] = await Promise.all([
        backendFetch<{ status: string }[]>("/vehicles/my/listings", {
          token: session.token,
        }).catch(() => null),
        backendFetch<unknown[]>("/leads/dealer", { token: session.token }).catch(
          () => null,
        ),
        backendFetch<unknown[]>("/test-drives/dealer", {
          token: session.token,
        }).catch(() => null),
      ]);

      const inventory = vehicles?.length ?? 0;
      const active = (vehicles ?? []).filter(
        (v) => v.status === "AVAILABLE",
      ).length;
      const sold = (vehicles ?? []).filter((v) => v.status === "SOLD").length;

      return NextResponse.json({
        stats: {
          inventory,
          active,
          sold,
          leads: leads?.length ?? 0,
          testDrives: testDrives?.length ?? 0,
          finance: 0,
        },
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
  const dealerId = auth.dealer!.id;

  const [total, active, sold, leads, testDrives, finance] = await Promise.all([
    prisma.vehicle.count({ where: { dealerId } }),
    prisma.vehicle.count({ where: { dealerId, status: "AVAILABLE" } }),
    prisma.vehicle.count({ where: { dealerId, status: "SOLD" } }),
    prisma.lead.count({ where: { vehicle: { dealerId } } }),
    prisma.testDrive.count({ where: { vehicle: { dealerId } } }),
    prisma.financeApplication.count({ where: { vehicle: { dealerId } } }),
  ]);

  return NextResponse.json({
    stats: { inventory: total, active, sold, leads, testDrives, finance },
    source: "local",
  });
}