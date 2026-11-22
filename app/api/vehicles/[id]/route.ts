import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/app/server/authz";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { backendFetch, BackendError } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";

export const runtime = "nodejs";

interface BackendVehicleDetail {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  year: number;
  mileage: number;
  fuel: string;
  transmission: string;
  color: string;
  engine?: string | null;
  bodyType?: string | null;
  city: string;
  state?: string | null;
  images: string[];
  status: string;
  isCertified: boolean;
  sellerType?: string;
  createdAt: string;
  // P0-11: the plate and the rest of the listing must survive the round trip.
  registrationNumber?: string | null;
  registrationState?: string | null;
  features?: string[];
  highlights?: string[];
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  availableForFinance?: boolean;
  emi?: number | null;
  dealerId?: number;
  categoryId?: number;
  brand?: { id: number; name: string; logo?: string | null } | null;
  category?: { id: number; name: string; slug: string } | null;
  dealer?: {
    id: number;
    businessName: string;
    city?: string | null;
    state?: string | null;
    phone?: string | null;
    // P0-1: `user` is deliberately NOT mapped. The backend no longer returns
    // credentials here, but the owner's email is personal data and has no place
    // in a public vehicle payload.
  } | null;
}

function mapDetail(v: BackendVehicleDetail) {
  return {
    id: v.id,
    name: v.title,
    brand: v.brand?.name ?? "—",
    brandId: v.brand?.id,
    year: v.year,
    price: v.price,
    type: v.category?.name ?? "Standard",
    categorySlug: v.category?.slug ?? "",
    mileage: v.mileage,
    fuel: v.fuel,
    transmission: v.transmission,
    color: v.color,
    engine: v.engine ?? null,
    bodyType: v.bodyType ?? null,
    city: v.city,
    state: v.state ?? null,
    isCertified: v.isCertified,
    status: v.status,
    description: v.description ?? null,
    images: Array.isArray(v.images) ? v.images : [],
    // P0-11: was hardcoded to [], so a vehicle's feature list never reached the
    // client even though the backend returns it.
    features: Array.isArray(v.features) ? v.features : [],
    specification: null,
    // P0-1: owner email removed from the public dealer block.
    dealer: v.dealer
      ? {
          id: v.dealer.id,
          name: v.dealer.businessName,
          city: v.dealer.city ?? null,
          state: v.dealer.state ?? null,
          phone: v.dealer.phone ?? null,
        }
      : null,
    createdAt: v.createdAt,
    registrationNumber: v.registrationNumber ?? null,
    registrationState: v.registrationState ?? null,
    highlights: Array.isArray(v.highlights) ? v.highlights : [],
    pincode: v.pincode ?? null,
    latitude: v.latitude ?? null,
    longitude: v.longitude ?? null,
    availableForFinance: v.availableForFinance,
    sellerType: v.sellerType,
    emi: v.emi ?? null,
    dealerId: v.dealerId,
    categoryId: v.categoryId,
  };
}

/**
 * GET /api/vehicles/[id] — vehicle detail.
 *
 * The session token (if any) is forwarded so NestJS can show a DRAFT listing to
 * an admin or to the dealer who owns it; anonymous callers get a 404 for drafts.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const vehicleId = Number(id);
  if (!Number.isInteger(vehicleId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const session = await verifySession(readSessionCookie(request));
  const token = session?.token ?? null;

  try {
    const v = await backendFetch<BackendVehicleDetail>(`/vehicles/${vehicleId}`, { token });
    const vehicle = mapDetail(v);

    let related: Array<Record<string, unknown>> = [];
    try {
      const rel = await backendFetch<{ items: BackendVehicleDetail[] }>(
        `/vehicles?categoryId=${v.category?.id ?? 0}&limit=4`,
      );
      related = (rel.items ?? [])
        .filter((r) => r.id !== vehicleId && r.status === "AVAILABLE")
        .slice(0, 4)
        .map((r) => ({
          id: r.id,
          name: r.title,
          brand: r.brand?.name ?? "—",
          year: r.year,
          price: r.price,
          image: Array.isArray(r.images) ? r.images[0] ?? null : null,
          fuel: r.fuel,
          transmission: r.transmission,
          mileage: r.mileage,
        }));
    } catch {
      // Related vehicles are non-critical.
    }

    return NextResponse.json({ vehicle, related, source: "backend" });
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    return backendErrorResponse(err);
  }
}

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  price: z.coerce.number().int().nonnegative().optional(),
  year: z.coerce.number().int().optional(),
  mileage: z.coerce.number().int().nonnegative().optional(),
  fuel: z.string().optional(),
  transmission: z.string().optional(),
  color: z.string().optional(),
  bodyType: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["AVAILABLE", "RESERVED", "SOLD", "INACTIVE"]).optional(),
  listingStatus: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  images: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional(),
  isCertified: z.boolean().optional(),
  brandId: z.coerce.number().int().optional(),
  categoryId: z.coerce.number().int().optional(),
  dealerId: z.coerce.number().int().optional(),
  // P0-11: these were missing from the schema, so zod stripped them on every
  // PATCH. The registration number in particular was collected by the form and
  // then silently discarded on save — which is why every seeded vehicle has an
  // empty plate and the VAHAN/RTO trust layer had nothing to query.
  registrationNumber: z.string().optional(),
  registrationState: z.string().optional(),
  features: z.array(z.string()).optional(),
  highlights: z.array(z.string()).optional(),
  engine: z.string().optional(),
  pincode: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  availableForFinance: z.boolean().optional(),
  sellerType: z.string().optional(),
  emi: z.coerce.number().optional(),
  // Premium classification — forwarded to NestJS PATCH /premium-vehicles/admin/vehicles/:id
  // (admin only; stripped for everyone else below).
  premium: z
    .object({
      isPremium: z.boolean().optional(),
      tagIds: z.array(z.number().int()).max(20).optional(),
      premiumBadge: z.string().max(40).nullable().optional(),
      premiumPriority: z.number().int().min(0).max(10000).optional(),
      showOnHomepagePremium: z.boolean().optional(),
      showOnPremiumPage: z.boolean().optional(),
      featuredUntil: z.string().datetime().nullable().optional(),
    })
    .optional(),
});

/** Map UI patch fields to the backend UpdateVehicleDto whitelist. */
function toBackendPatchBody(parsed: z.infer<typeof patchSchema>) {
  const body: Record<string, unknown> = {};
  if (parsed.title !== undefined) body.title = parsed.title;
  if (parsed.price !== undefined) body.price = parsed.price;
  if (parsed.year !== undefined) body.year = parsed.year;
  if (parsed.mileage !== undefined) body.mileage = parsed.mileage;
  if (parsed.fuel !== undefined) body.fuel = parsed.fuel;
  if (parsed.transmission !== undefined) body.transmission = parsed.transmission;
  if (parsed.color !== undefined) body.color = parsed.color;
  if (parsed.bodyType !== undefined) body.bodyType = parsed.bodyType;
  if (parsed.city !== undefined) body.city = parsed.city;
  if (parsed.state !== undefined) body.state = parsed.state;
  if (parsed.description !== undefined) body.description = parsed.description;
  if (parsed.images !== undefined) body.images = parsed.images;
  if (parsed.isCertified !== undefined) body.isCertified = parsed.isCertified;
  if (parsed.isFeatured !== undefined) body.isFeatured = parsed.isFeatured;
  if (parsed.listingStatus !== undefined) body.listingStatus = parsed.listingStatus;
  if (parsed.brandId !== undefined) body.brandId = parsed.brandId;
  if (parsed.categoryId !== undefined) body.categoryId = parsed.categoryId;
  if (parsed.dealerId !== undefined) body.dealerId = parsed.dealerId;
  // P0-11: forwarded so the plate and the rest of the listing survive an edit.
  if (parsed.registrationNumber !== undefined)
    body.registrationNumber = parsed.registrationNumber;
  if (parsed.registrationState !== undefined)
    body.registrationState = parsed.registrationState;
  if (parsed.features !== undefined) body.features = parsed.features;
  if (parsed.highlights !== undefined) body.highlights = parsed.highlights;
  if (parsed.engine !== undefined) body.engine = parsed.engine;
  if (parsed.pincode !== undefined) body.pincode = parsed.pincode;
  if (parsed.latitude !== undefined) body.latitude = parsed.latitude;
  if (parsed.longitude !== undefined) body.longitude = parsed.longitude;
  if (parsed.availableForFinance !== undefined)
    body.availableForFinance = parsed.availableForFinance;
  if (parsed.sellerType !== undefined) body.sellerType = parsed.sellerType;
  if (parsed.emi !== undefined) body.emi = parsed.emi;
  return body;
}

/**
 * PATCH /api/vehicles/[id] — update.
 *
 * The role gate runs here for a fast 401/403, but NestJS is what decides: it
 * resolves the caller's dealership from the token, refuses a vehicle the caller
 * does not own, and drops `dealerId` / `isFeatured` for anyone but an admin.
 * (Dealership employees have no backend permission to edit inventory yet, so
 * they are refused here too rather than half-served.)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const vehicleId = Number((await params).id);
  if (!Number.isInteger(vehicleId)) {
    return NextResponse.json({ error: "Invalid vehicle id" }, { status: 400 });
  }

  const auth = await requireRole(request, "ADMIN", "DEALER");
  if (!auth.ok) return auth.response;
  const session = auth.session;
  if (!session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  // Tenancy, featuring and premium classification are admin decisions. They are
  // dropped for everyone else so the request sent on is already well-formed.
  if (session.role !== "ADMIN") {
    delete parsed.data.dealerId;
    delete parsed.data.isFeatured;
    delete parsed.data.premium;
  }

  try {
    const vehicle = await backendFetch(`/vehicles/${vehicleId}`, {
      method: "PATCH",
      token: session.token,
      body: toBackendPatchBody(parsed.data),
    });

    // Availability changes go through the dedicated backend endpoint. A failure
    // here is reported — the rest of the edit has already been saved.
    if (parsed.data.status) {
      try {
        await backendFetch(`/vehicles/${vehicleId}/status`, {
          method: "PATCH",
          token: session.token,
          body: { status: parsed.data.status },
        });
      } catch (err) {
        const message = err instanceof BackendError ? err.message : "Backend error";
        return NextResponse.json(
          { error: `Vehicle saved, but its status was not: ${message}` },
          { status: err instanceof BackendError && err.status > 0 ? err.status : 502 },
        );
      }
    }

    // Premium settings go to their own admin endpoint; a failure is reported.
    if (parsed.data.premium && session.role === "ADMIN") {
      try {
        await backendFetch(`/premium-vehicles/admin/vehicles/${vehicleId}`, {
          method: "PATCH",
          token: session.token,
          body: parsed.data.premium,
        });
      } catch (err) {
        const message = err instanceof BackendError ? err.message : "Backend error";
        return NextResponse.json(
          { error: `Vehicle saved, but premium settings were not: ${message}` },
          { status: err instanceof BackendError && err.status > 0 ? err.status : 502 },
        );
      }
    }
    return NextResponse.json({ data: vehicle, source: "backend" });
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return backendErrorResponse(err);
  }
}

/**
 * DELETE /api/vehicles/[id] — soft delete (status INACTIVE).
 *
 * ADMIN or DEALER only; NestJS checks the dealer owns the vehicle from the
 * token, never from anything the client sends.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const vehicleId = Number((await params).id);
  if (!Number.isInteger(vehicleId)) {
    return NextResponse.json({ error: "Invalid vehicle id" }, { status: 400 });
  }

  const auth = await requireRole(request, "ADMIN", "DEALER");
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }

  try {
    await backendFetch(`/vehicles/${vehicleId}`, {
      method: "DELETE",
      token: auth.session.token,
    });
    return NextResponse.json({ ok: true, source: "backend" });
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return backendErrorResponse(err);
  }
}
