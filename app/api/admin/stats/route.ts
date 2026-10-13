import { NextResponse } from "next/server";

import { prisma } from "@/app/server/prisma";
import { requireAdminSession } from "@/app/server/authz";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";

export const runtime = "nodejs";

/**
 * GET /api/admin/stats — admin dashboard metrics.
 * Backed by the NestJS /admin/stats endpoint when reachable.
 */
export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  // 1) NestJS backend (authoritative)
  if (session.token) {
    try {
      const stats = await backendFetch<Record<string, number>>("/admin/stats", {
        token: session.token,
      });
      return NextResponse.json({ stats: stats ?? {}, source: "backend" });
    } catch (err) {
      if (!isBackendUnreachable(err) && err instanceof BackendError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
    }
  }

  // 2) Local fallback — the caller is already known to be an ADMIN, so no
  //    second authorization check is needed.
  const [
    totalVehicles,
    availableVehicles,
    soldVehicles,
    customers,
    dealers,
    pendingDealers,
    leads,
    newLeads,
    testDrives,
    financeApplications,
    sellerListings,
    inspections,
    insuranceEnquiries,
  ] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { status: "AVAILABLE" } }),
    prisma.vehicle.count({ where: { status: "SOLD" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.dealer.count({ where: { status: "APPROVED" } }),
    prisma.dealer.count({ where: { status: "PENDING" } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.testDrive.count(),
    prisma.financeApplication.count(),
    prisma.sellerListing.count({ where: { status: "PENDING" } }),
    prisma.inspectionRequest.count({ where: { status: "REQUESTED" } }),
    prisma.insuranceEnquiry.count({ where: { status: "NEW" } }),
  ]);

  return NextResponse.json({
    stats: {
      totalVehicles,
      availableVehicles,
      soldVehicles,
      customers,
      dealers,
      pendingDealers,
      leads,
      newLeads,
      testDrives,
      financeApplications,
      sellerListings,
      inspections,
      insuranceEnquiries,
    },
    source: "local",
  });
}