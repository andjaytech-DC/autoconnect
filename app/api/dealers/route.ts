/**
 * GET /api/dealers
 *
 * Returns the dealer directory, read from the NestJS API. There is no mock
 * fallback: the static dealer file holds invented businesses, so when the
 * backend is down this returns 503 rather than pretending.
 *
 * Query params:
 *   city  — filter by city name (case-insensitive). "All Cities" returns every dealer.
 *   q     — full-text search across dealer name and city (case-insensitive).
 *   featured — if "true", only return featured dealers.
 */

import { NextResponse } from "next/server";

import { requireUser } from "@/app/server/authz";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";

/**
 * The dealer directory is deliberately public — name, city, address and
 * inventory are the point of it. The contact details are not: `phone` is the
 * showroom's number and `email` comes from `d.user.email`, which is the dealer's
 * *login* identifier, not a published business address.
 *
 * Both are therefore released only to a signed-in session, exactly as
 * `/api/services/providers` does. `contactAvailable` in the response tells the
 * UI to prompt for sign-in instead of rendering a dead `tel:`/`mailto:` link.
 */
export const DEALER_CONTACT_GATED =
  "Sign in to view this showroom's contact details";

interface BackendDealer {
  id: number;
  businessName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  description?: string | null;
  logo?: string | null;
  isVerified: boolean;
  user?: { email?: string | null } | null;
  vehicles?: unknown[];
}

/** Map a backend dealer row to the stable frontend dealer shape. */
export function mapBackendDealer(
  d: BackendDealer,
  canSeeContact: boolean,
) {
  const name = d.businessName;
  return {
    id: d.id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    city: d.city,
    state: d.state,
    address: d.address,
    rating: 0,
    reviewCount: 0,
    carsAvailable: Array.isArray(d.vehicles) ? d.vehicles.length : 0,
    // Withheld for anonymous callers — see the note above.
    phone: canSeeContact ? d.phone : null,
    email: canSeeContact ? (d.user?.email ?? null) : null,
    website: "",
    description: d.description ?? "",
    logo: d.logo ?? name.slice(0, 2).toUpperCase(),
    logoGradient: "linear-gradient(135deg, #16a34a, #065f46)",
    lat: 0,
    lng: 0,
    openHours: [] as { day: string }[],
    services: [] as string[],
    // The Dealer model has no isFeatured column, so "featured" means verified.
    isFeatured: Boolean(d.isVerified),
    isVerified: Boolean(d.isVerified),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const q = searchParams.get("q");
  const featured = searchParams.get("featured");

  // Any valid session unlocks the contact fields; role is irrelevant.
  const canSeeContact = !((await requireUser(request)) instanceof NextResponse);

  // 1) NestJS backend (authoritative)
  try {
    const data = await backendFetch<BackendDealer[]>("/dealers");
    let filtered = (data ?? []).map((d) => mapBackendDealer(d, canSeeContact));

    if (city && city !== "All Cities") {
      filtered = filtered.filter(
        (d) => d.city.toLowerCase() === city.toLowerCase(),
      );
    }

    if (q && q.trim()) {
      const term = q.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(term) ||
          d.city.toLowerCase().includes(term),
      );
    }

    if (featured === "true") {
      filtered = filtered.filter((d) => d.isFeatured);
    }

    const cities = Array.from(
      new Set((data ?? []).map((d) => d.city).filter(Boolean)),
    );

    return NextResponse.json({
      dealers: filtered,
      total: filtered.length,
      cities,
      contactAvailable: canSeeContact,
      source: "backend",
    });
  } catch (err) {
    if (!isBackendUnreachable(err) && err instanceof BackendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
  }

  // Backend unreachable. There is deliberately no fixture fallback here: the
  // static dealer file contains invented business names, ratings and inventory
  // counts, so serving it would advertise dealerships that do not exist. An
  // empty list with `available: false` lets the UI say "unavailable" instead.
  return NextResponse.json(
    {
      dealers: [],
      total: 0,
      cities: [],
      contactAvailable: canSeeContact,
      source: "unavailable",
      available: false,
      error: "The dealer directory is temporarily unavailable.",
    },
    { status: 503 },
  );
}