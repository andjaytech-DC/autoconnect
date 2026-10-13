import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/server/prisma";
import { audit, clientIp } from "@/app/server/audit";
import { requireAdmin, requireAdminOrDealer, requireDealerStaff } from "@/app/server/authz";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import {
  backendFetch,
  BackendError,
  isBackendUnreachable,
} from "@/app/lib/backend";

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

/** GET /api/vehicles/[id] — public vehicle detail (backend first). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const vehicleId = Number(id);
  if (!Number.isInteger(vehicleId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // 1) NestJS backend (authoritative)
  try {
    const v = await backendFetch<BackendVehicleDetail>(`/vehicles/${vehicleId}`);
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
    if (!isBackendUnreachable(err) && err instanceof BackendError) {
      if (err.status === 404) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
      }
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // 2) Local fallback
  }

  try {
    const v = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        brand: true,
        category: true,
        dealer: true,
        vehicleImages: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!v) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

    // DRAFT listings are admin/dealer-only — never served publicly here.
    if (v.listingStatus === "DRAFT") {
      const s = await verifySession(readSessionCookie(_request));
      const privileged = s?.role === "ADMIN" || s?.role === "DEALER";
      if (!privileged) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
      }
    }

    const related = await prisma.vehicle.findMany({
      where: {
        OR: [{ categoryId: v.categoryId }, { brandId: v.brandId }],
        id: { not: v.id },
        status: "AVAILABLE",
        // Drafts must never surface as related vehicles.
        listingStatus: "PUBLISHED",
      },
      include: { brand: true, category: true },
      take: 4,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      vehicle: {
        id: v.id,
        name: v.title,
        brand: v.brand?.name,
        brandId: v.brandId,
        year: v.year,
        price: v.price,
        type: v.category?.name,
        categorySlug: v.category?.slug,
        mileage: v.mileage,
        fuel: v.fuel,
        transmission: v.transmission,
        color: v.color,
        engine: v.engine,
        bodyType: v.bodyType,
        city: v.city,
        state: v.state,
        isCertified: v.isCertified,
        isFeatured: v.isFeatured,
        status: v.status,
        description: v.description,
        images: v.vehicleImages.length
          ? v.vehicleImages.map((g) => g.imageUrl)
          : v.images,
        features: v.features,
        dealer: v.dealer
          ? {
              id: v.dealer.id,
              name: v.dealer.businessName,
              city: v.dealer.city,
              state: v.dealer.state,
              phone: v.dealer.phone,
            }
          : null,
        createdAt: v.createdAt,
      },
      related: related.map((r) => ({
        id: r.id,
        name: r.title,
        brand: r.brand?.name,
        year: r.year,
        price: r.price,
        image: r.images[0] ?? null,
        fuel: r.fuel,
        transmission: r.transmission,
        mileage: r.mileage,
      })),
      source: "local",
    });
  } catch (error) {
    console.error("Vehicle detail error:", error);
    return NextResponse.json({ error: "Unable to fetch vehicle" }, { status: 500 });
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
 * Authorization runs at the edge, before either branch, and ownership is
 * resolved from the session. Two defects are closed here:
 *
 *   1. The backend path used to forward on the mere presence of a session
 *      token, so role enforcement was delegated entirely to NestJS. A CUSTOMER
 *      with a token reached `PATCH /vehicles/:id` in the backend. The role gate
 *      now runs first — the same shape DELETE already used.
 *   2. `dealerId` was accepted from the body and written straight through, so
 *      an owning dealer (or employee) could reassign a vehicle to another
 *      dealership on the local path. A non-ADMIN caller may not move a vehicle
 *      between tenants; `dealerId` is stripped and replaced with their own.
 *      `isFeatured` is likewise an admin-only flag.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const vehicleId = Number((await params).id);
  if (!Number.isInteger(vehicleId)) {
    return NextResponse.json({ error: "Invalid vehicle id" }, { status: 400 });
  }

  // ── Edge authorization gate ────────────────────────────────────────────
  // ADMIN: any vehicle. DEALER / DEALER_EMPLOYEE: their own dealership only.
  // CUSTOMER and anonymous callers never reach an update path.
  const session = await verifySession(readSessionCookie(request));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN" && session.role !== "DEALER" && session.role !== "DEALER_EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  // Only an ADMIN may move a vehicle between dealerships or flip the featured
  // flag. For everyone else the fields are dropped from the payload that is
  // sent to either branch, so neither can act on client-supplied tenancy.
  if (session.role !== "ADMIN") {
    delete parsed.data.dealerId;
    delete parsed.data.isFeatured;
  }

  // 1) NestJS backend (authoritative) — needs a backend token
  if (session.token) {
    try {
      const backendBody = toBackendPatchBody(parsed.data);
      const vehicle = await backendFetch(`/vehicles/${vehicleId}`, {
        method: "PATCH",
        token: session.token,
        body: backendBody,
      });
      // Status changes go through the dedicated backend endpoint.
      if (parsed.data.status) {
        await backendFetch(`/vehicles/${vehicleId}/status`, {
          method: "PATCH",
          token: session.token,
          body: { status: parsed.data.status },
        }).catch(() => undefined);
      }
      return NextResponse.json({ data: vehicle, source: "backend" });
    } catch (err) {
      if (!isBackendUnreachable(err) && err instanceof BackendError) {
        return NextResponse.json(
          { error: err.status === 404 ? "Not found" : err.message },
          { status: err.status },
        );
      }
      // Backend unreachable → local fallback below.
    }
  }

  // 2) Local fallback (admin/dealer staff, own vehicles only)
  // Dealership staff are included so employees can edit inventory; the
  // ownership check below is what confines them to their own dealership.
  const dealerAuth = await requireDealerStaff(request).catch(() => null);
  const auth =
    dealerAuth && !(dealerAuth instanceof NextResponse)
      ? dealerAuth
      : await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  if (
    (auth.session.role === "DEALER" || auth.session.role === "DEALER_EMPLOYEE") &&
    auth.dealer
  ) {
    const owner = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { dealerId: true },
    });
    if (!owner || owner.dealerId !== auth.dealer.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
const before = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const d = parsed.data;
    const { images, ...vehicleData } = d;

    const vehicle = await prisma.$transaction(async (tx) => {
      const updated = await tx.vehicle.update({
        where: { id: vehicleId },
        data: vehicleData as never,
      });

      if (images !== undefined) {
        const existingImages = await tx.vehicleImage.findMany({
          where: { vehicleId },
          orderBy: { sortOrder: "asc" },
        });

        const existingUrls = new Set(existingImages.map((img) => img.imageUrl));
        const newUrls = new Set(images);
        const toRemove = existingImages.filter((img) => !newUrls.has(img.imageUrl));
        const toAdd = images.filter((url) => !existingUrls.has(url));

        if (toRemove.length > 0) {
          await tx.vehicleImage.deleteMany({
            where: { id: { in: toRemove.map((img) => img.id) } },
          });
        }

        if (toAdd.length > 0) {
          const maxSortOrder = existingImages.length > 0
            ? Math.max(...existingImages.map((img) => img.sortOrder))
            : -1;
          await tx.vehicleImage.createMany({
            data: toAdd.map((imageUrl, index) => ({
              vehicleId,
              imageUrl,
              altText: `${updated.title} photo ${maxSortOrder + index + 2}`,
              isPrimary: false,
              sortOrder: maxSortOrder + index + 1,
            })),
          });
        }

        const remainingImages = await tx.vehicleImage.findMany({
          where: { vehicleId },
          orderBy: { sortOrder: "asc" },
        });

        if (remainingImages.length > 0) {
          await Promise.all(
            remainingImages.map((img, index) =>
              tx.vehicleImage.update({
                where: { id: img.id },
                data: { sortOrder: index, isPrimary: index === 0 },
              }),
            ),
          );
        }

        await tx.vehicle.update({
          where: { id: vehicleId },
          data: { images },
        });
      }

      return updated;
    });

    const changedFields = (Object.keys(d) as (keyof typeof d)[]).filter((f) => d[f] !== undefined);
    const metadata: Record<string, unknown> = { changedFields };
    if (d.listingStatus && before.listingStatus !== d.listingStatus) {
      metadata.listingStatus = { from: before.listingStatus, to: d.listingStatus };
    }
    if (d.status && before.status !== d.status) {
      metadata.status = { from: before.status, to: d.status };
    }
    if (d.images !== undefined) {
      const prev = new Set(before.images);
      const next = new Set(d.images);
      const removed = before.images.filter((u) => !next.has(u));
      const added = d.images.filter((u) => !prev.has(u));
      if (removed.length || added.length) {
        metadata.images = { added, removed };
      }
    }
    await audit({
      userId: auth.session.id,
      action: "VEHICLE_UPDATE",
      entity: "Vehicle",
      entityId: vehicleId,
      metadata,
      ipAddress: clientIp(request),
    });
    return NextResponse.json({ data: vehicle, source: "local" });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

/**
 * DELETE /api/vehicles/[id]
 *
 * P0-10. Previously this handler proxied to NestJS on the mere presence of a
 * session, so authorization for the delete was decided entirely by a
 * downstream service. Two defects:
 *
 *   1. No role gate at the edge. A CUSTOMER's delete was refused only because
 *      NestJS enforces `@Roles('ADMIN','DEALER')`. Relying on that means the
 *      correctness of a destructive operation depends on another service being
 *      reachable — and the moment it is not, control fell through to the local
 *      branch below.
 *   2. The local branch ran `prisma.vehicle.delete()` (HARD delete) while the
 *      backend performs a SOFT delete (`status = INACTIVE`). The same HTTP verb
 *      therefore had two different, irreversible-vs-reversible semantics
 *      depending on infrastructure health.
 *
 * Now: the role gate runs first, ownership is never taken from the client, and
 * both branches soft-delete identically.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const vehicleId = Number((await params).id);
  if (!Number.isInteger(vehicleId)) {
    return NextResponse.json({ error: "Invalid vehicle id" }, { status: 400 });
  }

  // ── Edge authorization gate ────────────────────────────────────────────
  // ADMIN: allowed. DEALER: allowed, and NestJS enforces dealership ownership
  // from the JWT (never from a client-supplied dealerId).
  // DEALER_EMPLOYEE / CUSTOMER: never.
  const auth = await requireAdminOrDealer(request);
  if (auth instanceof NextResponse) return auth;

  const session = auth.session;

  if (session.token) {
    try {
      await backendFetch(`/vehicles/${vehicleId}`, {
        method: "DELETE",
        token: session.token,
      });
      return NextResponse.json({ ok: true, source: "backend" });
    } catch (err) {
      if (!isBackendUnreachable(err) && err instanceof BackendError) {
        return NextResponse.json(
          { error: err.status === 404 ? "Not found" : err.message },
          { status: err.status },
        );
      }
    }
  }

  // ── Local fallback (backend unreachable) ───────────────────────────────
  // Soft delete, matching NestJS. Never a hard delete against the shared DB.
  // requireAdminOrDealer already resolved the dealer relationship for DEALER
  // sessions, so ownership is verified against that id and nothing else.
  if (session.role !== "ADMIN") {
    if (!auth.dealer) {
      return NextResponse.json({ error: "Forbidden — no dealer profile" }, { status: 403 });
    }
    const owned = await prisma.vehicle.findFirst({
      where: { id: vehicleId, dealerId: auth.dealer.id },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "You do not own this vehicle." }, { status: 403 });
    }
  }

  try {
    const existing = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const vehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: "INACTIVE" },
    });
    await audit({
      userId: session.id,
      action: "VEHICLE_DELETE",
      entity: "Vehicle",
      entityId: vehicleId,
      ipAddress: clientIp(request),
    });
    return NextResponse.json({ ok: true, source: "local", vehicle });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}