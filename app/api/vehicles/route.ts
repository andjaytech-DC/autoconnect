import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/server/prisma";
import { requireDealerStaff } from "@/app/server/authz";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import {
  backendFetch,
  BackendError,
  isBackendUnreachable,
} from "@/app/lib/backend";

export const runtime = "nodejs";

/* =========================================================
   Response mapping — the UI contract stays stable whether
   data comes from the NestJS backend or the local store.
   ========================================================= */

interface BackendVehicle {
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
  images: string[];
  status: string;
  city: string;
  state?: string | null;
  isCertified: boolean;
  isFeatured?: boolean;
  createdAt: string;
  brand?: { id: number; name: string; logo?: string | null } | null;
  category?: { id: number; name: string; slug: string } | null;
  dealer?: { id: number; businessName: string; city?: string | null } | null;
  // P0-11: these were absent from the projection, so the plate the backend
  // returns never reached the client even though it was stored correctly.
  registrationNumber?: string | null;
  registrationState?: string | null;
  features?: string[];
  highlights?: string[];
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  availableForFinance?: boolean;
  sellerType?: string;
  emi?: number | null;
  dealerId?: number;
  categoryId?: number;
}

/** Map a backend vehicle row to the UI vehicle shape. */
export function mapBackendVehicle(v: BackendVehicle) {
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
    image: Array.isArray(v.images) ? v.images[0] ?? null : null,
    images: Array.isArray(v.images) ? v.images : [],
    status: v.status,
    dealer: v.dealer?.businessName,
    dealerCity: v.dealer?.city,
    description: v.description,
    isCertified: v.isCertified,
    createdAt: v.createdAt,
    // P0-11: forwarded so the plate survives the round trip to the client.
    registrationNumber: v.registrationNumber ?? null,
    registrationState: v.registrationState ?? null,
    features: v.features ?? [],
    highlights: v.highlights ?? [],
    engine: v.engine ?? null,
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

/** Convert a "0-5" lakh budget chip into min/max price in rupees. */
function budgetToPrice(budget: string | null): {
  minPrice?: number;
  maxPrice?: number;
} {
  if (!budget) return {};
  const m = budget.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)?$/);
  if (!m) return {};
  const range: { minPrice?: number; maxPrice?: number } = {};
  const low = parseFloat(m[1]);
  const high = m[2] !== undefined ? parseFloat(m[2]) : undefined;
  range.minPrice = Math.round(low * 100000);
  if (high !== undefined) range.maxPrice = Math.round(high * 100000);
  return range;
}

/** Resolve a category name/slug to a backend categoryId. */
async function resolveCategoryId(type: string | null): Promise<number | undefined> {
  if (!type) return undefined;
  const slug = type.toLowerCase().replace(/\s+/g, "-");
  try {
    const categories = await backendFetch<
      { id: number; name: string; slug: string }[]
    >("/categories");
    const found = (categories ?? []).find(
      (c) => c.slug === slug || c.name.toLowerCase() === type.toLowerCase(),
    );
    return found?.id;
  } catch {
    return undefined;
  }
}

/** Resolve a brand name to a backend brandId. */
async function resolveBrandId(brand: string | null): Promise<number | undefined> {
  if (!brand) return undefined;
  try {
    const brands = await backendFetch<
      { id: number; name: string }[]
    >("/vehicles/popular-brands");
    const found = (brands ?? []).find(
      (b) => b.name.toLowerCase() === brand.toLowerCase(),
    );
    return found?.id;
  } catch {
    return undefined;
  }
}

const SORT_KEYS = new Set([
  "price-asc",
  "price-desc",
  "year-desc",
  "year-asc",
  "mileage-asc",
  "newest",
  "oldest",
]);

/** Sentinel used to route an authenticated drafts request to the local store. */
class SkipBackendError extends Error {
  constructor() {
    super("drafts request served by the local store");
    this.name = "SkipBackendError";
  }
}

/**
 * GET /api/vehicles — vehicle listing backed by the NestJS API.
 * Accepts: brandId, categoryId, status, fuel, transmission, city, dealerId,
 * search / q / brand, type (category slug/name), budget ("0-5" lakhs),
 * minPrice, maxPrice, page, limit, sort.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const direct = (key: string) => searchParams.get(key);

  const budget = budgetToPrice(direct("budget"));

  // Draft-visibility contract: includeDrafts=1 is honoured only for an
  // authenticated ADMIN/DEALER, and drafts live ONLY in the local Prisma
  // store (the backend has no listing-visibility concept) — so such a
  // request must be served locally, never from the backend.
  const wantsDrafts =
    direct("includeDrafts") === "1" &&
    (await (async () => {
      const s = await verifySession(readSessionCookie(request));
      return s?.role === "ADMIN" || s?.role === "DEALER";
    })());

  // Resolve friendly filters (type/brand names) to backend ids when possible.
  const [categoryId, brandId] = await Promise.all([
    resolveCategoryId(direct("type")),
    resolveBrandId(direct("brand")),
  ]);

  const query: Record<string, string> = {};
  const set = (key: string, value: string | null | undefined) => {
    if (value) query[key] = value;
  };

  if (categoryId) set("categoryId", String(categoryId));
  if (brandId) set("brandId", String(brandId));
  set("status", direct("status"));
  set("fuel", direct("fuel"));
  set("transmission", direct("transmission"));
  set("city", direct("city"));
  set("dealerId", direct("dealerId"));
  set("search", direct("search") || direct("q"));
  set("minPrice", direct("minPrice") || (budget.minPrice ? String(budget.minPrice) : null));
  set("maxPrice", direct("maxPrice") || (budget.maxPrice ? String(budget.maxPrice) : null));
  set("page", direct("page"));
  set("limit", direct("limit") || "50");
  const sort = direct("sort") && SORT_KEYS.has(direct("sort")!) ? direct("sort")! : null;

  const qs = new URLSearchParams(query).toString();
  const path = `/vehicles${qs ? `?${qs}` : ""}`;

  // 1) NestJS backend (authoritative)
  try {
    if (wantsDrafts) throw new SkipBackendError();

    const data = await backendFetch<{
      items: BackendVehicle[];
      meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    }>(path);

    let vehicles = (data.items ?? []).map(mapBackendVehicle);

    // The backend doesn't sort — apply the requested order to this page.
    if (sort) {
      const byPrice = (a: { price: number }, b: { price: number }) => a.price - b.price;
      const byYear = (a: { year: number }, b: { year: number }) => a.year - b.year;
      const byMileage = (a: { mileage: number }, b: { mileage: number }) => a.mileage - b.mileage;
      const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      const byOldest = (a: { createdAt: string }, b: { createdAt: string }) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      switch (sort) {
        case "price-asc": vehicles = vehicles.sort(byPrice); break;
        case "price-desc": vehicles = vehicles.sort((a, b) => byPrice(b, a)); break;
        case "year-desc": vehicles = vehicles.sort((a, b) => byYear(b, a)); break;
        case "year-asc": vehicles = vehicles.sort(byYear); break;
        case "mileage-asc": vehicles = vehicles.sort(byMileage); break;
        case "newest": vehicles = vehicles.sort(byNewest); break;
        case "oldest": vehicles = vehicles.sort(byOldest); break;
      }
    }

    return NextResponse.json({
      vehicles,
      meta: data.meta ?? {
        total: vehicles.length,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 50,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
      source: "backend",
    });
  } catch (err) {
    if (err instanceof SkipBackendError) {
      // Fall through to the local Prisma store below.
    } else if (!isBackendUnreachable(err) && err instanceof BackendError) {
      // Backend reachable but errored — surface the error rather than
      // silently serving different data.
      return NextResponse.json(
        { error: err.message },
        { status: err.status },
      );
    }
    // 2) Local fallback
  }

  try {
    const where: Record<string, unknown> = {};

    const localParams = new URL(request.url).searchParams;
    const ldirect = (key: string) => localParams.get(key);

    // Public listing filter: only PUBLISHED vehicles are served. Drafts are
    // visible to admins/dealers who explicitly pass includeDrafts=1 with a
    // valid session.
    let includeDrafts = false;
    if (ldirect("includeDrafts") === "1") {
      const session = await verifySession(readSessionCookie(request));
      includeDrafts = session?.role === "ADMIN" || session?.role === "DEALER";
    }
    if (!includeDrafts) where.listingStatus = "PUBLISHED";

    if (ldirect("brandId")) where.brandId = Number(ldirect("brandId"));
    if (ldirect("categoryId")) where.categoryId = Number(ldirect("categoryId"));
    if (ldirect("status")) where.status = ldirect("status");
    if (ldirect("fuel")) where.fuel = ldirect("fuel");
    if (ldirect("transmission")) where.transmission = ldirect("transmission");
    if (ldirect("city")) where.city = { equals: ldirect("city"), mode: "insensitive" as const };
    if (ldirect("dealerId")) where.dealerId = Number(ldirect("dealerId"));
    if (ldirect("model")) where.title = { contains: ldirect("model"), mode: "insensitive" as const };
    if (ldirect("minYear") || ldirect("maxYear")) {
      where.year = {
        ...(ldirect("minYear") ? { gte: Number(ldirect("minYear")) } : {}),
        ...(ldirect("maxYear") ? { lte: Number(ldirect("maxYear")) } : {}),
      };
    }
    if (ldirect("minMileage") || ldirect("maxMileage")) {
      where.mileage = {
        ...(ldirect("minMileage") ? { gte: Number(ldirect("minMileage")) } : {}),
        ...(ldirect("maxMileage") ? { lte: Number(ldirect("maxMileage")) } : {}),
      };
    }

    const search = ldirect("search") || ldirect("q") || ldirect("brand");
    if (search) where.title = { contains: search, mode: "insensitive" as const };

    const type = ldirect("type");
    if (type && !ldirect("categoryId")) {
      const slug = type.toLowerCase().replace(/\s+/g, "-");
      const category = await prisma.category.findFirst({
        where: { OR: [{ slug }, { name: { equals: type, mode: "insensitive" as const } }] },
      });
      if (category) where.categoryId = category.id;
      else if (!search) where.title = { contains: type, mode: "insensitive" as const };
    }

    const budgetLocal = ldirect("budget");
    if (budgetLocal) {
      const m = budgetLocal.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)?$/);
      if (m) {
        where.price = {
          gte: Math.round(parseFloat(m[1]) * 100000),
          ...(m[2] !== undefined ? { lte: Math.round(parseFloat(m[2]) * 100000) } : {}),
        };
      }
    }
    if (ldirect("minPrice") || ldirect("maxPrice")) {
      where.price = {
        ...((where.price as object) ?? {}),
        ...(ldirect("minPrice") ? { gte: Number(ldirect("minPrice")) } : {}),
        ...(ldirect("maxPrice") ? { lte: Number(ldirect("maxPrice")) } : {}),
      };
    }

    const page = Math.max(1, Number(ldirect("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(ldirect("limit")) || 10));

    const sortMap: Record<string, Record<string, "asc" | "desc">> = {
      "price-asc": { price: "asc" },
      "price-desc": { price: "desc" },
      "year-desc": { year: "desc" },
      "year-asc": { year: "asc" },
      "mileage-asc": { mileage: "asc" },
      newest: { createdAt: "desc" },
      oldest: { createdAt: "asc" },
    };
    const orderBy = sortMap[ldirect("sort") || ""] ?? { createdAt: "desc" as const };

    const [items, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        include: { brand: true, category: true, dealer: true },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.vehicle.count({ where }),
    ]);

    const vehicles = items.map((v) => ({
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
      image: Array.isArray(v.images) ? v.images[0] : null,
      images: Array.isArray(v.images) ? v.images : [],
      status: v.status,
      listingStatus: v.listingStatus,
      dealer: v.dealer?.businessName,
      dealerCity: v.dealer?.city,
      description: v.description,
      isCertified: v.isCertified,
      createdAt: v.createdAt,
    }));

    return NextResponse.json({
      vehicles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
      source: "local",
    });
  } catch (error) {
    console.error("Vehicles API error:", error);
    return NextResponse.json({ error: "Unable to fetch vehicles" }, { status: 500 });
  }
}

/* =========================================================
   POST /api/vehicles — create a vehicle.
   Admin: any dealer. Dealer: their own dealer profile.
   Backend (with token) first, local Prisma fallback.
   ========================================================= */

const PLACEHOLDER_IMAGE = "/cars/suv.png";

/**
 * Create-vehicle payload. The handler used to read raw JSON and coerce each
 * field with `String()`/`Number()`/`Boolean()`, so anything the form did not set
 * arrived as `NaN` or the literal string "undefined" and was written to the
 * database. Validating up front means the local branch only ever persists
 * values that passed a type and range check, and the backend branch only
 * forwards well-formed fields.
 *
 * `dealerId` and `isFeatured` are deliberately optional here: a DEALER may not
 * choose either, and both are overwritten below with server-derived values
 * before any branch runs.
 */
const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional(),
  price: z.coerce.number().nonnegative(),
  year: z.coerce.number().int().min(1900).max(2100),
  mileage: z.coerce.number().int().nonnegative(),
  fuel: z.string().min(1).max(30),
  transmission: z.string().min(1).max(30),
  color: z.string().max(40).optional(),
  engine: z.string().max(120).optional(),
  images: z.array(z.string().max(2048)).max(50).optional(),
  brandId: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive(),
  dealerId: z.coerce.number().int().positive(),
  city: z.string().min(1).max(80),
  state: z.string().max(80).optional(),
  bodyType: z.string().max(40).optional(),
  emi: z.coerce.number().nonnegative().optional(),
  sellerType: z.string().max(40).optional(),
  isCertified: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  registrationNumber: z.string().max(20).optional(),
  registrationState: z.string().max(40).optional(),
  pincode: z.string().max(12).optional(),
  features: z.array(z.string().max(120)).max(200).optional(),
  highlights: z.array(z.string().max(200)).max(200).optional(),
  listingStatus: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  status: z.string().max(30).optional(),
});

/** Map UI create fields to the backend CreateVehicleDto whitelist. */
function toBackendCreateBody(body: Record<string, unknown>) {
  const images = Array.isArray(body.images)
    ? (body.images as string[]).filter((s) => typeof s === "string" && s.trim() !== "")
    : [];
  return {
    title: String(body.title ?? ""),
    description: body.description ? String(body.description) : undefined,
    price: Number(body.price ?? 0),
    year: Number(body.year ?? new Date().getFullYear()),
    mileage: Number(body.mileage ?? 0),
    fuel: String(body.fuel ?? "PETROL"),
    transmission: String(body.transmission ?? "MANUAL"),
    color: String(body.color ?? "—"),
    engine: body.engine ? String(body.engine) : undefined,
    images: images.length ? images : [PLACEHOLDER_IMAGE],
    brandId: Number(body.brandId),
    categoryId: Number(body.categoryId),
    dealerId: Number(body.dealerId),
    city: String(body.city ?? ""),
    state: body.state ? String(body.state) : undefined,
    bodyType: body.bodyType ? String(body.bodyType) : undefined,
    emi: body.emi !== undefined ? Number(body.emi) : undefined,
    sellerType: body.sellerType ? String(body.sellerType) : undefined,
    isCertified: Boolean(body.isCertified),
    isFeatured: body.isFeatured !== undefined ? Boolean(body.isFeatured) : undefined,
    registrationNumber: body.registrationNumber ? String(body.registrationNumber) : undefined,
    registrationState: body.registrationState ? String(body.registrationState) : undefined,
    pincode: body.pincode ? String(body.pincode) : undefined,
    features: Array.isArray(body.features) ? body.features : undefined,
    highlights: Array.isArray(body.highlights) ? body.highlights : undefined,
    listingStatus: body.listingStatus ? String(body.listingStatus) : undefined,
  };
}

export async function POST(request: Request) {
  const session = await verifySession(readSessionCookie(request));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Creating inventory is an admin/dealer capability — a plain CUSTOMER
  // session must never be able to add vehicles. Checked before the payload
  // is parsed so the answer cannot depend on the body.
  if (session.role !== "ADMIN" && session.role !== "DEALER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid vehicle payload" },
      { status: 400 },
    );
  }
  const record = parsed.data as unknown as Record<string, unknown>;

  // Dealers are re-scoped to their own dealership before anything else, so
  // neither the backend path nor the local fallback can list under a
  // different dealer's id (the form locks this client-side too). Featuring is
  // an admin-only flag and is dropped for a dealer rather than forwarded.
  if (session.role === "DEALER") {
    const auth = await requireDealerStaff(request);
    if (auth instanceof NextResponse) return auth;
    record.dealerId = auth.dealer!.id;
    delete record.isFeatured;
  }

  const title = String(record.title || "").trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // 1) NestJS backend (authoritative)
  if (session.token) {
    try {
      const vehicle = await backendFetch("/vehicles", {
        method: "POST",
        token: session.token,
        body: toBackendCreateBody(record),
      });
      return NextResponse.json({ data: vehicle, source: "backend" }, { status: 201 });
    } catch (err) {
      if (!isBackendUnreachable(err) && err instanceof BackendError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      // Backend unreachable → local fallback below.
    }
  }

  // 2) Local fallback (admin/dealer creation via Prisma)
  const dealerId = Number(record.dealerId);
  const images = Array.isArray(record.images) ? (record.images as string[]) : [];
  try {
    const vehicle = await prisma.$transaction(async (tx) => {
      const created = await tx.vehicle.create({
        data: {
          title,
          description: record.description ? String(record.description) : null,
          price: Number(record.price),
          year: Number(record.year),
          mileage: Number(record.mileage),
          fuel: String(record.fuel) as never,
          transmission: String(record.transmission) as never,
          color: String(record.color || "—"),
          engine: record.engine ? String(record.engine) : null,
          bodyType: record.bodyType ? String(record.bodyType) : null,
          images,
          city: String(record.city || ""),
          state: record.state ? String(record.state) : null,
isCertified: Boolean(record.isCertified),
          isFeatured: session.role === "ADMIN" ? Boolean(record.isFeatured) : false,
          status: (record.status && record.status !== "DRAFT"
            ? String(record.status)
            : "AVAILABLE") as never,
          listingStatus: (record.listingStatus === "DRAFT" ||
            (!record.listingStatus && record.status === "DRAFT")
            ? "DRAFT"
            : "PUBLISHED") as never,
          brandId: Number(record.brandId),
          categoryId: Number(record.categoryId),
          dealerId,
        },
      });

      if (images.length > 0) {
        await tx.vehicleImage.createMany({
          data: images.map((imageUrl, index) => ({
            vehicleId: created.id,
            imageUrl,
            altText: `${title} ${index === 0 ? 'primary' : `photo ${index + 1}`}`,
            isPrimary: index === 0,
            sortOrder: index,
          })),
        });
      }

      return tx.vehicle.findUnique({
        where: { id: created.id },
        include: {
          brand: true,
          category: true,
dealer: true,
            vehicleImages: { orderBy: { sortOrder: "asc" } },
          },
        });
    });

    return NextResponse.json({ data: vehicle, source: "local" }, { status: 201 });
  } catch (error) {
    console.error("Vehicle create error:", error);
    return NextResponse.json({ error: "Unable to create vehicle" }, { status: 500 });
  }
}