export interface CarRef {
  id: number;
  name: string;
  brand: string;
  year: number;
  price: string;
  type: string;
}

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/**
 * Vehicle display info, resolved from the real backend.
 *
 * Deliberately NOT backed by a static car fixture. A previous version looked
 * ids up in `app/data/cars.ts`, which meant bookings, wishlist, dashboard and
 * orders labelled invented cars (with invented prices) against a real user's
 * records. Anything we cannot resolve is now labelled neutrally.
 */
const cache = new Map<number, CarRef>();

function neutralRef(id: number, fallbackId?: string): CarRef {
  const suffix = fallbackId ? ` #${fallbackId}` : "";
  return {
    id,
    name: `Vehicle${suffix}`,
    brand: "Unknown",
    year: 0,
    price: "—",
    type: "—",
  };
}

interface UiVehiclePayload {
  name?: string;
  brand?: string;
  year?: number;
  price?: number;
  type?: string;
}

/**
 * Populate the cache with real vehicle records. Safe to call with an empty or
 * duplicate id list; failures simply leave those ids unresolved.
 */
export async function loadCarRefs(
  ids: number[],
  endpoint = "/api/vehicles",
): Promise<void> {
  const wanted = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))];
  const missing = wanted.filter((id) => !cache.has(id));
  if (missing.length === 0) return;

  await Promise.all(
    missing.map(async (id) => {
      try {
        const res = await fetch(`${endpoint}/${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { vehicle?: UiVehiclePayload };
        const v = json?.vehicle;
        if (!v?.name) return;
        cache.set(id, {
          id,
          name: v.name,
          brand: v.brand ?? "—",
          year: typeof v.year === "number" ? v.year : 0,
          price: typeof v.price === "number" ? inr(v.price) : "—",
          type: v.type ?? "—",
        });
      } catch {
        // Leave unresolved; getCarRef will show a neutral placeholder.
      }
    }),
  );
}

/** Synchronous read. Returns a neutral placeholder for unknown ids. */
export function getCarRef(id: number, fallbackId?: string): CarRef {
  return cache.get(id) ?? neutralRef(id, fallbackId);
}

/**
 * Insert an already-resolved vehicle. Used by the server-side loader so
 * server components share this same cache.
 */
export function putCarRef(ref: CarRef): void {
  cache.set(ref.id, ref);
}
