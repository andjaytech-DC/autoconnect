import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";

export const runtime = "nodejs";

/**
 * GET /api/categories
 * Returns: { categories: { id, name, slug, isActive, vehicleCount }[] }
 */
export async function GET() {
  try {
    const data = await backendFetch<
      { id: number; name: string; slug: string; _count?: { vehicles?: number } }[]
    >("/categories");
    const categories = (data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      isActive: true,
      vehicleCount: c._count?.vehicles ?? 0,
    }));
    return NextResponse.json({ categories, source: "backend" });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
