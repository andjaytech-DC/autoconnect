"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, SearchX } from "lucide-react";
import VehicleCard from "@/app/components/vehicle/VehicleCard";
import EmptyState from "@/app/components/ui/EmptyState";
import {
  ApiError,
  budgetToPrice,
  getBrands,
  getVehicles,
  mapVehicle,
  resolveBrandId,
  resolveCategoryId,
  type UiVehicle as Vehicle,
  type VehiclesMetaShim as VehiclesMeta,
} from "@/app/lib/nest-public";

function carsHref(
  current: Record<string, string>,
  patch: Record<string, string>,
): string {
  const merged = { ...current, ...patch };
  const params = new URLSearchParams();
  if (merged.type) params.set("type", merged.type);
  if (merged.brand) params.set("brand", merged.brand);
  if (merged.budget) params.set("budget", merged.budget);
  if (merged.q) params.set("q", merged.q);
  const qs = params.toString();
  return qs ? `/cars?${qs}` : "/cars";
}

/** Filter chip. `.chip[aria-current="page"]` carries the active styling. */
function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="chip inline-flex min-h-11 shrink-0 items-center" aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

const budgetChips = [
  { label: "Under ₹5L", value: "0-5" },
  { label: "₹5-10L", value: "5-10" },
  { label: "₹10-15L", value: "10-15" },
  { label: "Above ₹15L", value: "15-" },
  { label: "₹50L-1Cr", value: "50-100" },
  { label: "Above ₹1Cr", value: "100-" },
];

const bodyTypes = ["SUV", "Sedan", "Hatchback"];

export default function CarsGrid() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const type = searchParams.get("type") || "";
  const brand = searchParams.get("brand") || "";
  const budget = searchParams.get("budget") || "";
  const q = searchParams.get("q") || "";
  const active = { type, brand, budget, q };

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [meta, setMeta] = useState<VehiclesMeta | null>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchVehicles() {
      setLoading(true);
      setError(null);

      try {
        const price = budgetToPrice(budget);
        const [categoryId, brandId] = await Promise.all([
          resolveCategoryId(type || null),
          resolveBrandId(brand || null),
        ]);
        const data = await getVehicles({
          ...(categoryId ? { categoryId } : {}),
          ...(brandId ? { brandId } : {}),
          ...(q ? { search: q } : {}),
          ...(price.minPrice ? { minPrice: price.minPrice } : {}),
          ...(price.maxPrice ? { maxPrice: price.maxPrice } : {}),
          limit: 50,
        });
        if (!cancelled) {
          setVehicles((data.items ?? []).map(mapVehicle));
          setMeta(data.meta ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError && err.status !== 0
              ? err.message
              : "Unable to load vehicles. Please check your connection and retry.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchVehicles();
    return () => { cancelled = true; };
  }, [type, brand, budget, q]);

  useEffect(() => {
    getBrands()
      .then((rows) => {
        setBrands((rows ?? []).map((b) => b.name));
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Filters: one scrollable row for body type, compact selects for brand and budget */}
      <div className="mb-6 space-y-3">
        <div
          className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          role="group"
          aria-label="Filter by body type"
        >
          <FilterChip href={carsHref(active, { type: "" })} active={!type}>
            All
          </FilterChip>
          {bodyTypes.map((t) => (
            <FilterChip
              key={t}
              href={carsHref(active, { type: t })}
              active={type.toLowerCase() === t.toLowerCase()}
            >
              {t}
            </FilterChip>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <label className="sr-only" htmlFor="filter-brand">Brand</label>
          <select
            id="filter-brand"
            value={brand}
            onChange={(ev) => router.push(carsHref(active, { brand: ev.target.value }))}
            className="h-11 w-full rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] px-3 text-sm font-medium text-[hsl(var(--color-content))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] sm:w-48"
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <label className="sr-only" htmlFor="filter-budget">Budget</label>
          <select
            id="filter-budget"
            value={budget}
            onChange={(ev) => router.push(carsHref(active, { budget: ev.target.value }))}
            className="h-11 w-full rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] px-3 text-sm font-medium text-[hsl(var(--color-content))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] sm:w-48"
          >
            <option value="">Any budget</option>
            {budgetChips.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>

          {(type || brand || budget || q) && (
            <Link
              href="/cars"
              className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-semibold text-[hsl(var(--color-primary-strong))] underline-offset-4 hover:underline sm:col-span-1"
            >
              Clear all filters
            </Link>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16" role="status">
          <Loader2
            size={28}
            className="mb-3 animate-spin text-[hsl(var(--color-primary-strong))]"
            aria-hidden="true"
          />
          <p className="text-sm text-[hsl(var(--color-content-muted))]">Loading vehicles…</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] py-16 text-center">
          <SearchX
            size={32}
            className="mb-3 text-[hsl(var(--color-content-faint))]"
            aria-hidden="true"
          />
          <p className="text-sm font-semibold text-[hsl(var(--color-content))]">Failed to load vehicles</p>
          <p className="mt-1 text-sm text-[hsl(var(--color-content-muted))]">{error}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="btn btn-primary btn-sm mt-4"
          >
            Try again
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && !error && (
        <>
          <p className="mb-4 text-sm text-[hsl(var(--color-content-muted))]" aria-live="polite">
            Showing {vehicles.length}
            {meta?.total ? ` of ${meta.total}` : ""} vehicle
            {vehicles.length === 1 ? "" : "s"}
          </p>
          {vehicles.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {vehicles.map((car, idx) => (
                <VehicleCard
                  key={car.id}
                  id={car.id}
                  name={car.name}
                  brand={car.brand}
                  year={car.year}
                  price={car.price}
                  mileage={car.mileage}
                  fuel={car.fuel}
                  transmission={car.transmission}
                  image={car.image}
                  imageCount={car.images?.length}
                  priority={idx < 2}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={SearchX}
              as="h3"
              title="No vehicles found"
              description="Try clearing a filter to see more listings."
              action={
                <Link href="/cars" className="btn btn-secondary btn-sm">
                  Clear all filters
                </Link>
              }
            />
          )}
        </>
      )}
    </>
  );
}
