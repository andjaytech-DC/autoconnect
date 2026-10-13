import { NextResponse } from "next/server";

import { prisma } from "@/app/server/prisma";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";

/**
 * GET /api/categories
 *
 * Returns: { categories: { id, name, slug, vehicleCount }[] }
 * Backed by the NestJS API when reachable.
 */
export async function GET() {
  // 1) NestJS backend (authoritative)
  try {
    const data = await backendFetch<
      {
        id: number;
        name: string;
        slug: string;
        vehicles?: unknown[];
      }[]
    >("/categories");
    const categories = (data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      isActive: true,
      vehicleCount: Array.isArray(c.vehicles) ? c.vehicles.length : 0,
    }));
    return NextResponse.json({ categories, source: "backend" });
  } catch (err) {
    if (!isBackendUnreachable(err) && err instanceof BackendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
  }

  // 2) Local fallback
  try {
    const rows = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { vehicles: true } } },
    });

    const categories = rows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      isActive: c.isActive,
      vehicleCount: c._count.vehicles,
    }));

    return NextResponse.json({ categories, source: "local" });
  } catch (error) {
    console.error("Categories API error:", error);
    return NextResponse.json({ error: "Unable to fetch categories" }, { status: 500 });
  }
}