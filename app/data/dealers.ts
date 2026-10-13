export interface DealerHour {
  day: string;
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface Dealer {
  id: number;
  name: string;
  slug: string;
  city: string;
  state: string;
  address: string;
  rating: number;
  reviewCount: number;
  carsAvailable: number;
  // Null when the caller is anonymous: /api/dealers releases contact details
  // only to a signed-in session. `contactAvailable` on the response envelope
  // tells the UI to prompt for sign-in instead of rendering a dead link.
  phone: string | null;
  email: string | null;
  website: string;
  description: string;
  logo: string;
  logoGradient: string;
  lat: number;
  lng: number;
  openHours: DealerHour[];
  services: string[];
  isFeatured: boolean;
  /** True for a verified showroom. "Featured" is derived from this. */
  isVerified?: boolean;
}

/**
 * Reference list of Indian cities for filter dropdowns. Not inventory.
 */
export const cities = [
  "All Cities",
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
];

/**
 * Intentionally empty.
 *
 * This list held invented dealerships ("AutoHub Prime Motors", "Deccan Motors
 * Hub") with fabricated 4.5-4.9 ratings, made-up inventory counts and
 * superlative marketing copy. It was served by /api/dealers whenever the
 * backend was unreachable, and its entries were published as URLs in
 * sitemap.xml — so an outage, or a crawl, advertised businesses that do not
 * exist.
 *
 * Both call sites now read the backend and degrade to an empty/unavailable
 * state. The `Dealer` interface is still exported because app/types/dealers.ts
 * describes the live /api/dealers payload.
 */
export const dealers: Dealer[] = [];
/** Lookup a single dealer by numeric id. */
export function getDealerById(id: number | string): Dealer | undefined {
  return dealers.find((d) => String(d.id) === String(id));
}

/** Lookup a single dealer by slug. */
export function getDealerBySlug(slug: string): Dealer | undefined {
  return dealers.find((d) => d.slug === slug);
}