export interface Car {
  id: number;
  name: string;
  brand: string;
  year: number;
  price: string;
  originalPrice?: string;
  type: string;
  mileage: string;
  fuel: string;
  transmission: string;
  image: string;
  badge?: string;
}

/**
 * Intentionally empty.
 *
 * This list held invented cars with invented prices ("Hyundai Creta
 * 12.5 Lakh", "Tata Nexon 10.9 Lakh"). It backed the bookings, wishlist,
 * orders, dashboard, loans and listing-counts features, so a real user's
 * records were labelled with cars that were never listed, and the price-band
 * badges on the site described an invented catalogue.
 *
 * Those features now read real inventory from the backend. Keep it empty
 * rather than repopulating it: a fixture is not a substitute for a data source.
 */
export const cars: Car[] = [];