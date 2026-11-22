import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireAdminSession } from "@/app/server/authz";

export const runtime = "nodejs";

/**
 * GET /api/admin/lookups — admin-only brands, categories and dealers for the
 * vehicle form selectors. NestJS owns the lists; rejected dealers are left out.
 */
export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }

  try {
    const data = await backendFetch<{
      brands?: { id: number; name: string }[];
      categories?: { id: number; name: string; slug: string }[];
      dealers?: { id: number; businessName: string; city: string; state: string; status?: string }[];
    }>("/admin/lookups", { token: auth.session.token });

    return NextResponse.json({
      brands: (data?.brands ?? []).map((b) => ({ id: b.id, name: b.name, country: null })),
      categories: data?.categories ?? [],
      dealers: (data?.dealers ?? [])
        .filter((d) => d.status !== "REJECTED")
        .map((d) => ({ id: d.id, name: d.businessName, city: d.city, state: d.state, status: d.status })),
      source: "backend",
    });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
