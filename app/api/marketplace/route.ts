import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";

export const runtime = "nodejs";

/** GET /api/marketplace — public: list marketplace products. */
export async function GET(request: Request) {
  const category = new URL(request.url).searchParams.get("category");
  try {
    const products = await backendFetch<unknown[]>(
      `/marketplace${category ? `?category=${encodeURIComponent(category)}` : ""}`,
    );
    return NextResponse.json({ products: products ?? [] });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
