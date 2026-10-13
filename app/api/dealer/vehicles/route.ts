import { NextResponse } from "next/server";

import { prisma } from "@/app/server/prisma";
import { requireDealerStaff } from "@/app/server/authz";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";

export const runtime = "nodejs";

interface BackendVehicle {
  id: number;
  title: string;
  price: number;
  status: string;
  year: number;
  mileage: number;
  fuel: string;
  transmission: string;
  city: string;
  isCertified: boolean;
  createdAt: string;
  images: string[];
  brand?: { name?: string } | null;
  category?: { name?: string } | null;
  dealer?: { id?: number; businessName?: string } | null;
}

/** Map a backend vehicle to the dashboard inventory row. */
function mapVehicle(v: BackendVehicle) {
  return {
    id: v.id,
    title: v.title,
    price: v.price,
    status: v.status,
    viewCount: 0,
    year: v.year,
    mileage: v.mileage,
    fuel: v.fuel,
    transmission: v.transmission,
    city: v.city,
    isCertified: v.isCertified,
    createdAt: v.createdAt,
    image: Array.isArray(v.images) ? v.images[0] ?? null : null,
    brand: v.brand?.name ?? null,
    category: v.category?.name ?? null,
    _count: { leads: 0, testDrives: 0 },
  };
}

/**
 * GET /api/dealer/vehicles — dealer's own inventory only.
 * Backed by the NestJS API when reachable.
 */
export async function GET(request: Request) {
  const session = await verifySession(readSessionCookie(request));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1) NestJS backend (authoritative)
  if (session.token) {
    try {
      const vehicles = await backendFetch<BackendVehicle[]>(
        "/vehicles/my/listings",
        { token: session.token },
      );
      return NextResponse.json({
        vehicles: (vehicles ?? []).map(mapVehicle),
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
  const vehicles = await prisma.vehicle.findMany({
    where: { dealerId: auth.dealer!.id },
    include: {
      brand: true,
      category: true,
      _count: { select: { leads: true, testDrives: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ vehicles, source: "local" });
}