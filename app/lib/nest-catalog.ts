import { nest, type NestOptions } from "./nest";
import type {
  NestBrand,
  NestCategory,
  NestDealer,
  NestVehicle,
  NestVehicleList,
  NestMarketplaceProduct,
  NestNewCar,
} from "./nest-types";

/**
 * Default freshness for public catalogue reads.
 *
 * The NestJS ThrottlerGuard allows 600 req/min (~10/s) and every one of these
 * calls was `no-store`, so each render of each page re-fetched. A build renders
 * every page at once, which on its own can exhaust the limit; each subsequent
 * visitor paid again. Public catalogue data is identical for every caller, so a
 * short window costs nothing and removes the pressure.
 */
export const PUBLIC_READ_REVALIDATE = 60;

/** Read options for a public catalogue GET — cached, never personalised. */
const publicRead = (revalidate = PUBLIC_READ_REVALIDATE): NestOptions => ({
  revalidate,
});

export interface VehicleQuery {
  brandId?: number;
  categoryId?: number;
  status?: string;
  fuel?: string;
  transmission?: string;
  city?: string;
  dealerId?: number;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  minMileage?: number;
  maxMileage?: number;
  availableForFinance?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getVehicles(q: VehicleQuery = {}): Promise<NestVehicleList> {
  return nest<NestVehicleList>("/vehicles", {
    query: q as Record<string, string | number | boolean | undefined | null>,
    ...publicRead(),
  });
}

/** Staff listing that includes DRAFT rows. Requires an admin/dealer token. */
export async function getVehiclesForStaff(
  q: VehicleQuery & { listingStatus?: "DRAFT" | "PUBLISHED" } = {},
): Promise<NestVehicleList> {
  return nest<NestVehicleList>("/vehicles/admin/all", {
    query: q as Record<string, string | number | boolean | undefined | null>,
  });
}

export async function getVehicle(id: number | string): Promise<NestVehicle> {
  return nest<NestVehicle>(`/vehicles/${id}`, publicRead());
}

export async function getBrands(): Promise<NestBrand[]> {
  return nest<NestBrand[]>("/brands", publicRead());
}

export async function getCategories(): Promise<NestCategory[]> {
  return nest<NestCategory[]>("/categories", publicRead());
}

export async function getDealers(): Promise<NestDealer[]> {
  return nest<NestDealer[]>("/dealers", publicRead());
}

export async function getDealer(id: number | string): Promise<NestDealer> {
  return nest<NestDealer>(`/dealers/${id}`, publicRead(30));
}

export async function getElectricVehicles(): Promise<NestVehicle[] | NestVehicleList> {
  return nest<NestVehicle[] | NestVehicleList>("/vehicles/electric", publicRead());
}

export async function getNewCars(
  params: { brand?: string; electric?: string } = {},
): Promise<{ cars: NestNewCar[]; brands?: string[] } | NestNewCar[]> {
  return nest("/new-cars", { query: params, ...publicRead() });
}

export async function getMarketplace(
  params: { category?: string } = {},
): Promise<{ products: NestMarketplaceProduct[] } | NestMarketplaceProduct[]> {
  return nest("/marketplace", { query: params, ...publicRead() });
}

/** Get premium vehicles with optional tag filtering and pagination. */
export async function getPremiumVehicles(
  q: { tag?: string; city?: string; page?: number; limit?: number } = {},
): Promise<{
  items: NestVehicle[];
  meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean };
}> {
  return nest(`/premium-vehicles`, {
    query: q as Record<string, string | number | boolean | undefined | null>,
  });
}

/** Get all premium tags with vehicle counts. */
export async function getPremiumTags(): Promise<{
  tags: { id: number; name: string; slug: string; vehicleCount: number }[];
}> {
  return nest(`/premium-vehicles/tags`, publicRead());
}

/** "0-5" lakh chip → min/max price in rupees. */
export function budgetToPrice(budget: string | null | undefined): {
  minPrice?: number;
  maxPrice?: number;
} {
  if (!budget) return {};
  const m = budget.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)?$/);
  if (!m) return {};
  const out: { minPrice?: number; maxPrice?: number } = {};
  out.minPrice = Math.round(parseFloat(m[1]) * 100000);
  if (m[2] !== undefined) out.maxPrice = Math.round(parseFloat(m[2]) * 100000);
  return out;
}

