"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowUpRight, Filter, Loader2, SearchX } from "lucide-react";

import VehicleCard from "@/app/components/vehicle/VehicleCard";
import { getPremiumVehicles, getPremiumTags } from "@/app/lib/nest-catalog";
import { mapVehicle } from "@/app/lib/nest-mappers";
import type { NestVehicle } from "@/app/lib/nest-types";

const PAGE_SIZE = 8;

const TAG_FILTERS = [
  { label: "Luxury", value: "luxury" },
  { label: "Performance", value: "performance" },
  { label: "Imported", value: "imported" },
  { label: "High Value", value: "high-value" },
  { label: "Rare", value: "rare" },
  { label: "Limited Edition", value: "limited" },
  { label: "All", value: "" },
];

/** A brand facet returned by getPremiumTags. */
interface PremiumTag {
  id: number;
  name: string;
  slug: string;
  vehicleCount: number;
}

export default function PremiumCarsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center py-16">
          <Loader2
            size={36}
            className="mb-4 animate-spin text-[hsl(var(--color-primary-strong))]"
            aria-hidden="true"
          />
          <p className="text-sm text-[hsl(var(--color-content-muted))]">Loading premium collection…</p>
        </div>
      }
    >
      <PremiumCarsInner />
    </Suspense>
  );
}

function PremiumCarsInner() {
  // Read the URL from Next's router state — server and client render the same
  // params, so there is no hydration mismatch. This previously used
  // `window.location.search`, which is empty on the server and full on the
  // client, so the two renders diverged.
  const searchParams = useSearchParams();
  const tag = searchParams.get("tag") || "";
  const activeTag = TAG_FILTERS.find((t) => t.value === tag) || TAG_FILTERS[0];

  const [vehicles, setVehicles] = useState<NestVehicle[]>([]);
  const [tags, setTags] = useState<PremiumTag[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageParam = Number(searchParams.get("page")) || 1;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const tagsData = await getPremiumTags();
        setTags(tagsData.tags);

        const data = await getPremiumVehicles({
          tag,
          page: pageParam,
          limit: PAGE_SIZE,
        });
        setVehicles(data.items ?? []);
        setMeta({
          total: data.meta?.total ?? 0,
          page: pageParam,
          totalPages: data.meta?.totalPages ?? 1,
        });
      } catch (err: unknown) {
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Unable to load premium vehicles. Please retry."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [tag, pageParam]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center py-16">
        <Loader2
          size={36}
          className="mb-4 animate-spin text-[hsl(var(--color-primary-strong))]"
          aria-hidden="true"
        />
        <p className="text-sm text-[hsl(var(--color-content-muted))]">Loading premium collection…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-16">
        <div className="rounded-2xl border border-dashed border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] px-6 py-16 text-center">
          <SearchX size={40} className="mx-auto mb-4 text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
          <h1 className="text-xl font-bold text-[hsl(var(--color-content))]">Error loading premium collection</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-[hsl(var(--color-content-muted))]">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-primary mt-6"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="container py-16">
        <div className="rounded-2xl border border-dashed border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] px-6 py-16 text-center">
          <SearchX size={40} className="mx-auto mb-4 text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
          <h1 className="text-xl font-bold text-[hsl(var(--color-content))]">Premium collection coming soon</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-[hsl(var(--color-content-muted))]">
            No premium vehicles available with the current filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--color-bg))] font-sans text-[hsl(var(--color-content))]">
      {/* Premium Header */}
      <header className="border-b border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] py-8">
        <div className="container flex flex-col items-start gap-6 lg:flex-row">
          <div className="lg:w-1/2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--color-primary)/0.4)] bg-[hsl(var(--color-primary)/0.12)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--color-primary-strong))]">
              <Filter size={12} aria-hidden="true" />
              Premium Collection
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
              {activeTag.label} Cars
            </h1>
            <p className="mt-2 text-lg text-[hsl(var(--color-content-muted))]">
              Extraordinary cars. Exceptional machines.
            </p>
          </div>
          <nav className="lg:w-1/2" aria-label="Premium collection filters">
            <div className="flex flex-wrap gap-2">
              {TAG_FILTERS.map((t) => (
                <Link
                  key={t.value}
                  href={`/premium-cars?tag=${t.value}`}
                  className="chip"
                  aria-current={activeTag.value === t.value ? "page" : undefined}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">{t.label}</span>
                  <ArrowUpRight size={12} aria-hidden="true" />
                </Link>
              ))}
            </div>
            {tags.length > 0 && (
              <p className="mt-3 text-sm text-[hsl(var(--color-content-muted))]">
                {tags.length} curated tag{tags.length === 1 ? "" : "s"} available
              </p>
            )}
          </nav>
        </div>
      </header>

      {/* Vehicles Grid */}
      <main className="container py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {vehicles.map((vehicle, idx) => {
            const ui = mapVehicle(vehicle);
            return (
              <VehicleCard
                key={vehicle.id}
                id={vehicle.id}
                name={ui.name}
                brand={ui.brand}
                year={ui.year}
                price={ui.price}
                mileage={ui.mileage}
                fuel={ui.fuel}
                transmission={ui.transmission}
                image={ui.image}
                imageCount={ui.images?.length}
                badge={vehicle.premium ? "Premium" : (ui.premiumBadge ?? undefined)}
                priority={idx < 2}
              />
            );
          })}
        </div>
      </main>

      {/* Pagination */}
      {meta.total > PAGE_SIZE && (
        <div className="container border-t border-[hsl(var(--color-line))] py-6">
          <nav className="flex flex-wrap items-center justify-center gap-3" aria-label="Pagination">
            <span className="text-sm text-[hsl(var(--color-content-muted))]">
              Page {meta.page} of {meta.totalPages}
            </span>
            {meta.page > 1 ? (
              <Link
                href={`/premium-cars?${tag ? `tag=${tag}&` : ""}page=${meta.page - 1}`}
                className="btn btn-secondary btn-sm"
                aria-label="Previous page"
              >
                Previous
              </Link>
            ) : (
              <span className="btn btn-secondary btn-sm opacity-50" aria-disabled="true">
                Previous
              </span>
            )}
            {meta.page < meta.totalPages ? (
              <Link
                href={`/premium-cars?${tag ? `tag=${tag}&` : ""}page=${meta.page + 1}`}
                className="btn btn-primary btn-sm"
                aria-label="Next page"
              >
                Next
              </Link>
            ) : (
              <span className="btn btn-primary btn-sm opacity-50" aria-disabled="true">
                Next
              </span>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
