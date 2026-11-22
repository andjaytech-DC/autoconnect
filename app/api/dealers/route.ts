/**
 * GET /api/dealers — the dealer directory, read from NestJS. There is no
 * fixture fallback: when the backend is down this returns 503 rather than
 * advertising dealerships that do not exist.
 *
 * NestJS lists approved dealerships only and releases the showroom phone to
 * authenticated callers only, so calling the API directly cannot get around it.
 * This route forwards the visitor's token and applies the UI filters.
 *
 * Query params:
 *   city     — filter by city (case-insensitive); "All Cities" returns every dealer.
 *   q        — search across dealer name and city.
 *   featured — "true" keeps verified dealers only.
 */

import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { mapDealer } from "@/app/lib/nest-mappers";
import type { NestDealer } from "@/app/lib/nest-types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const q = searchParams.get("q");
  const featured = searchParams.get("featured");

  const session = await verifySession(readSessionCookie(request));

  try {
    const data = (await backendFetch<NestDealer[]>("/dealers", { token: session?.token ?? null })) ?? [];
    // NestJS decides; if it withheld every phone the caller is effectively a guest.
    const canSeeContact = data.length > 0 ? data.some((d) => Boolean(d.phone)) : Boolean(session?.token);

    let dealers = data.map((d) => mapDealer(d, { canSeeContact }));

    if (city && city !== "All Cities") {
      dealers = dealers.filter((d) => d.city.toLowerCase() === city.toLowerCase());
    }
    if (q && q.trim()) {
      const term = q.toLowerCase();
      dealers = dealers.filter(
        (d) => d.name.toLowerCase().includes(term) || d.city.toLowerCase().includes(term),
      );
    }
    if (featured === "true") dealers = dealers.filter((d) => d.isFeatured);

    const cities = Array.from(new Set(data.map((d) => d.city).filter(Boolean)));
    return NextResponse.json({
      dealers,
      total: dealers.length,
      cities,
      contactAvailable: canSeeContact,
      source: "backend",
    });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
