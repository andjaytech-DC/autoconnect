import { NextResponse } from "next/server";

import { prisma } from "@/app/server/prisma";
import { requireAdminSession } from "@/app/server/authz";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";

export const runtime = "nodejs";

/**
 * GET /api/admin/lookups
 *
 * Admin-only: all brands, categories and dealers for the Add New Car form
 * selectors. Backed by the NestJS API when reachable.
 */
export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  // 1) NestJS backend (authoritative)
  if (session.token) {
    try {
      const [brands, categories, dealers] = await Promise.all([
        backendFetch<{ id: number; name: string; logo?: string | null }[]>(
          "/vehicles/popular-brands",
          { token: session.token },
        ).catch(() => null),
        backendFetch<{ id: number; name: string; slug: string }[]>(
          "/categories",
          { token: session.token },
        ).catch(() => null),
        backendFetch<
          { id: number; businessName: string; city: string; state: string }[]
        >("/dealers", { token: session.token }).catch(() => null),
      ]);

      return NextResponse.json({
        brands: (brands ?? []).map((b) => ({
          id: b.id,
          name: b.name,
          country: null,
        })),
        categories: categories ?? [],
        dealers: (dealers ?? []).map((d) => ({
          id: d.id,
          name: d.businessName,
          city: d.city,
          state: d.state,
        })),
        source: "backend",
      });
    } catch (err) {
      if (!isBackendUnreachable(err) && err instanceof BackendError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
    }
  }

  // 2) Local fallback
  try {
    const [brands, categories, dealers] = await Promise.all([
      prisma.brand.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
// Dealer has no isActive flag; `status` carries the lifecycle instead.
        prisma.dealer.findMany({
          where: { status: { not: "REJECTED" } },
          orderBy: { businessName: "asc" },
        }),
    ]);

    return NextResponse.json({
      brands: brands.map((b) => ({
        id: b.id,
        name: b.name,
        country: b.country,
      })),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
      })),
      dealers: dealers.map((d) => ({
        id: d.id,
        name: d.businessName,
        city: d.city,
        state: d.state,
      })),
      source: "local",
    });
  } catch (error) {
    console.error("Admin lookups API error:", error);
    return NextResponse.json({ error: "Unable to fetch lookups" }, { status: 500 });
  }
}