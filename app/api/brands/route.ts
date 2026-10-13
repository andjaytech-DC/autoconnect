import { NextResponse } from "next/server";

import { prisma } from "@/app/server/prisma";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";

/**
 * GET /api/brands
 *
 * Returns: { brands: { id, name, country, vehicleCount }[] }
 * Backed by the NestJS API when reachable.
 */
export async function GET() {
  // 1) NestJS backend (authoritative)
  try {
    const data = await backendFetch<
      { id: number; name: string; logo?: string | null; vehicleCount?: number }[]
    >("/vehicles/popular-brands");
    const brands = (data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      logo: b.logo ?? null,
      country: null,
      isActive: true,
      vehicleCount: b.vehicleCount ?? 0,
    }));
    return NextResponse.json({ brands, source: "backend" });
  } catch (err) {
    if (!isBackendUnreachable(err) && err instanceof BackendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
  }

  // 2) Local fallback
  try {
    const rows = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { vehicles: true } } },
    });

    const brands = rows.map((b) => ({
      id: b.id,
      name: b.name,
      country: b.country,
      isActive: b.isActive,
      vehicleCount: b._count.vehicles,
    }));

    return NextResponse.json({ brands, source: "local" });
  } catch (error) {
    console.error("Brands API error:", error);
    return NextResponse.json({ error: "Unable to fetch brands" }, { status: 500 });
  }
}