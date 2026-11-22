import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { enforceRateLimit } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/services/categories — the service catalogue with REAL availability.
 *
 * `bookable`, `providerCount` and `cities` are derived by NestJS from active
 * providers, so a category nobody offers is never shown as bookable. This route
 * adds nothing and has no fallback list: if the backend is down the answer is a
 * 503, not an invented catalogue.
 */
export async function GET(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 60, windowMs: 60_000, key: "service-categories" })).ok) {
    return NextResponse.json({ error: "Too many requests, try again shortly" }, { status: 429 });
  }
  try {
    const categories = await backendFetch<unknown[]>("/services/categories");
    return NextResponse.json({ categories: categories ?? [] });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
