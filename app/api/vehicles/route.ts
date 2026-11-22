import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/app/server/authz";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { mapBackendVehicle, type BackendVehicle } from "@/app/lib/vehicle-mapper";

export const runtime = "nodejs";

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


/**
 * GET /api/vehicles — vehicle listing backed by the NestJS API.
 * Accepts: brandId, categoryId, status, fuel, transmission, city, dealerId,
 * search / q / model, brand, type (category slug/name), budget ("0-5" lakhs),
 * minPrice, maxPrice, minYear, maxYear, minMileage, maxMileage, page, limit,
 * sort.
 *
 * `includeDrafts=1` is honoured only for a signed-in ADMIN or DEALER and is
 * answered by the staff endpoint, which NestJS scopes to the caller's own
 * dealership (an admin sees all). Everyone else gets published stock only.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const direct = (key: string) => searchParams.get(key);

  const budget = budgetToPrice(direct("budget"));

  let staffToken: string | null = null;
  if (direct("includeDrafts") === "1") {
    const s = await verifySession(readSessionCookie(request));
    if ((s?.role === "ADMIN" || s?.role === "DEALER") && s.token) staffToken = s.token;
  }

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
  set("search", direct("search") || direct("q") || direct("model"));
  set("minPrice", direct("minPrice") || (budget.minPrice ? String(budget.minPrice) : null));
  set("maxPrice", direct("maxPrice") || (budget.maxPrice ? String(budget.maxPrice) : null));
  set("minYear", direct("minYear"));
  set("maxYear", direct("maxYear"));
  set("minMileage", direct("minMileage"));
  set("maxMileage", direct("maxMileage"));
  set("page", direct("page"));
  set("limit", direct("limit") || "50");
  if (staffToken) set("listingStatus", direct("listingStatus"));
  // Sorting and these filters are applied by NestJS across the whole result
  // set (sorting only the current page gave wrong order between pages).
  const sort = direct("sort");
  if (sort && SORT_KEYS.has(sort)) set("sort", sort);
  set("bodyType", direct("bodyType"));
  if (direct("isCertified") === "true" || direct("isCertified") === "1") set("isCertified", "true");
  if (direct("availableForFinance") === "true" || direct("availableForFinance") === "1") set("availableForFinance", "true");

  const qs = new URLSearchParams(query).toString();
  const base = staffToken ? "/vehicles/admin/all" : "/vehicles";
  const path = `${base}${qs ? `?${qs}` : ""}`;

  try {
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
    }>(path, { token: staffToken });

    const vehicles = (data.items ?? []).map(mapBackendVehicle);

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
    return backendErrorResponse(err);
  }
}

/* =========================================================
   POST /api/vehicles — create a vehicle.
   Admin: any dealer. Dealer: their own dealer profile
   (NestJS resolves it from the token).
   ========================================================= */


/**
 * Create-vehicle payload. The handler used to read raw JSON and coerce each
 * field with `String()`/`Number()`/`Boolean()`, so anything the form did not set
 * arrived as `NaN` or the literal string "undefined" and was written to the
 * database. Validating up front means the local branch only ever persists
 * values that passed a type and range check, and the backend branch only
 * forwards well-formed fields.
 *
 * `dealerId` and `isFeatured` are optional here: a DEALER may choose neither, so
 * both are dropped for them below; NestJS re-derives the dealership from the
 * token and is the one that enforces it.
 */
const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional(),
  price: z.coerce.number().min(1, "Price is required").max(1_000_000_000),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
  mileage: z.coerce.number().int().nonnegative().max(2_000_000),
  fuel: z.enum(["PETROL", "DIESEL", "ELECTRIC", "HYBRID", "CNG"]),
  transmission: z.enum(["MANUAL", "AUTOMATIC", "AMT", "DCT", "CVT"]),
  color: z.string().trim().min(1, "Color is required").max(40),
  engine: z.string().max(120).optional(),
  images: z.array(z.string().max(2048)).max(50).optional(),
  brandId: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive(),
  dealerId: z.coerce.number().int().positive().optional(),
  city: z.string().min(1).max(80),
  state: z.string().max(80).optional(),
  bodyType: z.string().max(40).optional(),
  emi: z.coerce.number().nonnegative().optional(),
  sellerType: z.string().max(40).optional(),
  isCertified: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  registrationNumber: z.string().trim().min(1, "Registration number is required").max(20),
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
    color: String(body.color ?? ""),
    engine: body.engine ? String(body.engine) : undefined,
    images,
    brandId: Number(body.brandId),
    categoryId: Number(body.categoryId),
    ...(body.dealerId !== undefined ? { dealerId: Number(body.dealerId) } : {}),
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
  // Creating inventory is an admin/dealer capability — a plain CUSTOMER
  // session must never be able to add vehicles. Checked before the payload
  // is parsed so the answer cannot depend on the body.
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid vehicle payload" },
      { status: 400 },
    );
  }
  const record = parsed.data as unknown as Record<string, unknown>;

  if (session.role === "DEALER") {
    // A dealer lists under their own dealership and cannot feature a vehicle.
    // NestJS re-derives the dealership from the token; the fields are dropped
    // here so the request is well-formed rather than relied on.
    delete record.dealerId;
    delete record.isFeatured;
  } else if (record.dealerId === undefined) {
    return NextResponse.json({ error: "dealerId is required" }, { status: 400 });
  }

  try {
    const vehicle = await backendFetch("/vehicles", {
      method: "POST",
      token: session.token,
      body: toBackendCreateBody(record),
    });
    return NextResponse.json({ data: vehicle, source: "backend" }, { status: 201 });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
