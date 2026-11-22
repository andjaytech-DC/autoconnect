import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";

export const runtime = "nodejs";

/** GET /api/new-cars — public: list new cars with optional brand/electric filters. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams();
  const brand = searchParams.get("brand");
  if (brand) query.set("brand", brand);
  if (searchParams.get("electric") === "true") query.set("electric", "true");

  try {
    const data = await backendFetch<{ cars: unknown[]; brands: string[] }>(
      `/new-cars${query.toString() ? `?${query}` : ""}`,
    );
    return NextResponse.json({ cars: data?.cars ?? [], brands: data?.brands ?? [] });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
