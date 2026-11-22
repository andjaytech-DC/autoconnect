/**
 * Backend vehicle row -> UI vehicle shape. NestJS is the only source of vehicle
 * data; the BFF routes reshape it for the UI. Lives outside the route file
 * because a Next.js route module may export only HTTP handlers and route config.
 */

export interface BackendVehicle {
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
    // Empty when the backend has no category; never an invented label.
    type: v.category?.name ?? "",
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
