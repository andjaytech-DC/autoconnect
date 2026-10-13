"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, SearchX } from "lucide-react";
import VehicleCard from "@/app/components/vehicle/VehicleCard";
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
    <Link href={href} className="chip" aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

const budgetChips = [
  { label: "Under ₹5L", value: "0-5" },
  { label: "₹5-10L", value: "5-10" },
  { label: "₹10-15L", value: "10-15" },
  { label: "Above ₹15L", value: "15-" },
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
      {/* Body-type chips */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by body type">
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

      {/* Brand chips */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by brand">
        <FilterChip href={carsHref(active, { brand: "" })} active={!brand}>
          All Brands
        </FilterChip>
        {brands.map((b) => (
          <FilterChip
            key={b}
            href={carsHref(active, { brand: b })}
            active={brand.toLowerCase() === b.toLowerCase()}
          >
            {b}
          </FilterChip>
        ))}
      </div>

      {/* Budget chips */}
      <div className="mb-6 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by budget">
        <FilterChip href={carsHref(active, { budget: "" })} active={!budget}>
          Any Budget
        </FilterChip>
        {budgetChips.map((b) => (
          <FilterChip
            key={b.value}
            href={carsHref(active, { budget: b.value })}
            active={budget === b.value}
          >
            {b.label}
          </FilterChip>
        ))}
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
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] py-16 text-center">
              <SearchX
                size={32}
                className="mb-3 text-[hsl(var(--color-content-faint))]"
                aria-hidden="true"
              />
              <p className="text-sm font-semibold text-[hsl(var(--color-content))]">No vehicles found</p>
              <p className="mt-1 text-sm text-[hsl(var(--color-content-muted))]">
                Try clearing a filter to see more listings.
              </p>
              <Link href="/cars" className="btn btn-secondary btn-sm mt-4">
                Clear all filters
              </Link>
            </div>
          )}
        </>
      )}
    </>
  );
}
