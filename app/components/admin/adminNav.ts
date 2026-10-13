/**
 * Canonical admin navigation — ONE definition consumed by both the portal
 * left rail and the AdminPanel sub-menu, so the two can never disagree.
 *
 * Domains (top level):
 *   Dashboard · Vehicles · Dealers · Listings · Leads · Operations · Security
 *
 * Leads is its own domain — it is NOT a vehicle sub-feature.
 *
 * Trust covers the vehicle-history checks, warranty plans and return requests.
 */

export type AdminDomainKey =
  | "dashboard"
  | "vehicles"
  | "dealers"
  | "listings"
  | "leads"
  | "inspections"
  | "services"
  | "insurance"
  | "security"
  | "new-cars"
  | "trust";

/** Visibility/lifecycle buckets under Vehicles. Order is the render order. */
export type VehicleBucketKey =
  | "all"
  | "draft"
  | "published"
  | "reserved"
  | "sold"
  | "archived"
  | "add";

export interface VehicleBucket {
  key: VehicleBucketKey;
  label: string;
}

export const VEHICLE_BUCKETS: VehicleBucket[] = [
  { key: "all", label: "All Vehicles" },
  { key: "draft", label: "Drafts" },
  { key: "published", label: "Published" },
  { key: "reserved", label: "Reserved" },
  { key: "sold", label: "Sold" },
  { key: "archived", label: "Archived" },
  { key: "add", label: "Add New Vehicle" },
];

export interface AdminDomain {
  key: AdminDomainKey;
  label: string;
  /** Anchor used by the portal sections (#key). */
  hash: string;
  /** True when the domain is rendered inside AdminPanel; false → page section/anchor. */
  inPanel: boolean;
  children?: VehicleBucket[];
}

export const ADMIN_DOMAINS: AdminDomain[] = [
  { key: "dashboard", label: "Dashboard", hash: "#dashboard", inPanel: true },
  {
    key: "vehicles",
    label: "Vehicles",
    hash: "#vehicles",
    inPanel: true,
    children: VEHICLE_BUCKETS,
  },
  { key: "dealers", label: "Dealers", hash: "#dealers", inPanel: false },
  { key: "listings", label: "Seller Listings", hash: "#listings", inPanel: false },
  { key: "leads", label: "Leads", hash: "#leads", inPanel: true },
  { key: "inspections", label: "Inspections", hash: "#inspections", inPanel: false },
  { key: "services", label: "Services", hash: "#services", inPanel: false },
  { key: "insurance", label: "Insurance", hash: "#insurance", inPanel: false },
  { key: "security", label: "Security", hash: "#security", inPanel: false },
  { key: "new-cars", label: "New Cars", hash: "#new-cars", inPanel: false },
  { key: "trust", label: "Trust & Safety", hash: "#trust", inPanel: false },
];

/**
 * Canonical visibility/lifecycle predicates. `listingStatus` = public
 * visibility (DRAFT | PUBLISHED); `status` = operational lifecycle
 * (AVAILABLE | RESERVED | SOLD | INACTIVE). Never conflate the two.
 */
export interface VehicleDims {
  listingStatus?: string | null;
  status?: string | null;
}

export const isDraft = (v: VehicleDims) => v.listingStatus === "DRAFT";
export const isPublished = (v: VehicleDims) => v.listingStatus === "PUBLISHED";

export function inBucket(bucket: VehicleBucketKey, v: VehicleDims): boolean {
  switch (bucket) {
    case "all":
      return true;
    case "draft":
      return isDraft(v);
    case "published":
      return isPublished(v);
    case "reserved":
      return isPublished(v) && v.status === "RESERVED";
    case "sold":
      return isPublished(v) && v.status === "SOLD";
    case "archived":
      return isPublished(v) && v.status === "INACTIVE";
    default:
      return false;
  }
}

/** Counts for every bucket, derived from ONE dataset. */
export function bucketCounts<T extends VehicleDims>(
  vehicles: T[],
): Record<VehicleBucketKey, number> {
  const out = {} as Record<VehicleBucketKey, number>;
  for (const b of VEHICLE_BUCKETS) {
    out[b.key] = b.key === "add" ? 0 : vehicles.filter((v) => inBucket(b.key, v)).length;
  }
  return out;
}

export const bucketLabel = (key: VehicleBucketKey) =>
  VEHICLE_BUCKETS.find((b) => b.key === key)?.label ?? "Vehicles";