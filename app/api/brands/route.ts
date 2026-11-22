import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";

export const runtime = "nodejs";

/**
 * GET /api/brands — popular brands with their live vehicle counts.
 * Returns: { brands: { id, name, logo, country, isActive, vehicleCount }[] }
 */
export async function GET() {
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
    return backendErrorResponse(err);
  }
}
