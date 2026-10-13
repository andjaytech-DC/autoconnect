import { NextResponse } from "next/server";

import { prisma } from "@/app/server/prisma";
import { requireUser } from "@/app/server/authz";
import { enforceRateLimit } from "@/app/lib/rate-limit";

/**
 * GET /api/services/providers — list active service providers.
 *
 * The directory itself (name, description, city, services) stays public. The
 * direct contact details — phone, email and full street address — are part of
 * what a customer is actually buying access to, and an unauthenticated caller
 * used to be handed every provider's phone number, email and address in one
 * unpaginated response. Those fields are now returned only to signed-in users;
 * anonymous callers get `contactAvailable: false` and null fields.
 *
 * Pagination bounds the response for every caller.
 */

const MAX_PAGE_SIZE = 50;

export async function GET(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 60, windowMs: 60_000, key: "providers" })).ok) {
    return NextResponse.json(
      { error: "Too many requests, try again shortly" },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const service = searchParams.get("service");

  // Any valid session (customer, dealer or admin) unlocks the contact fields.
  // Role is irrelevant here — this is not an authorization boundary, just a
  // paywall on public PII.
  const auth = await requireUser(request);
  const canSeeContact = !(auth instanceof NextResponse);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("limit")) || 24),
  );

  const where = {
    status: "ACTIVE",
    ...(city ? { city: { equals: city, mode: "insensitive" as const } } : {}),
    ...(service ? { services: { has: service } } : {}),
  };

  const rows = await prisma.serviceProvider.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      phone: true,
      email: true,
      city: true,
      address: true,
      services: true,
    },
    orderBy: { name: "asc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const providers = rows.map((p) =>
    canSeeContact
      ? p
      : {
          id: p.id,
          name: p.name,
          description: p.description,
          city: p.city,
          services: p.services,
          // Withheld for anonymous callers.
          phone: null,
          email: null,
          address: null,
        },
  );

  return NextResponse.json({
    providers,
    contactAvailable: canSeeContact,
    pagination: { page, limit },
  });
}
