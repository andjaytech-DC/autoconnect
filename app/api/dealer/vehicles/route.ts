import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireRole } from "@/app/server/authz";

export const runtime = "nodejs";

interface BackendVehicle {
  id: number;
  title: string;
  price: number;
  status: string;
  listingStatus?: string;
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
  _count?: { leads?: number; testDrives?: number } | null;
}

/** Map a backend vehicle to the dashboard inventory row. */
function mapVehicle(v: BackendVehicle) {
  return {
    id: v.id,
    title: v.title,
    price: v.price,
    status: v.status,
    listingStatus: v.listingStatus ?? null,
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
    _count: { leads: v._count?.leads ?? 0, testDrives: v._count?.testDrives ?? 0 },
  };
}

/** GET /api/dealer/vehicles — the dealership's own inventory (drafts included). */
export async function GET(request: Request) {
  const auth = await requireRole(request, "DEALER", "DEALER_EMPLOYEE");
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  try {
    const vehicles = await backendFetch<BackendVehicle[]>("/dealers/me/vehicles", {
      token: auth.session.token,
    });
    return NextResponse.json({
      vehicles: (vehicles ?? []).map(mapVehicle),
      source: "backend",
    });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
