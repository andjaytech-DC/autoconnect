import Link from "next/link";
import { ArrowRight } from "lucide-react";

import PremiumVehicleCard from "@/app/components/vehicle/PremiumVehicleCard";
import type { PremiumTag, UiVehicle } from "@/app/lib/nest-types";

interface PremiumCollectionProps {
  /** Already ordered by the backend (priority, then newest). */
  cars: UiVehicle[];
  tags?: PremiumTag[];
}

/**
 * Homepage "The Exclusive Collection".
 *
 * Renders nothing when the admin has not placed any vehicle here, so an empty
 * catalogue never shows a hollow luxury banner. Data comes from
 * GET /premium-vehicles?placement=homepage — membership is admin-controlled.
 */
export default function PremiumCollection({ cars, tags = [] }: PremiumCollectionProps) {
  if (cars.length === 0) return null;

  const [lead, ...rest] = cars;
  const visibleTags = tags.filter((t) => t.vehicleCount > 0).slice(0, 8);

  return (
    <section
      className="premium-scope relative isolate overflow-hidden py-16 sm:py-24"
      aria-labelledby="exclusive-collection-heading"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(212_175_55/0.14),transparent)]"
      />

      <div className="container">
        <header className="mb-10 max-w-2xl sm:mb-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[var(--pc-gold)]">
            Progressive AutoHub
          </p>
          <h2
            id="exclusive-collection-heading"
            className="pc-gold-text mt-4 text-4xl font-bold uppercase leading-[1.08] tracking-[0.04em] sm:text-6xl"
          >
            The Exclusive
            <br />
            Collection
          </h2>
          <div className="pc-gold-rule mt-6 w-40" />
          <p className="mt-5 text-lg text-[var(--pc-text-2)]">
            Extraordinary cars. Exceptional machines.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
          <PremiumVehicleCard
            vehicle={lead}
            featured
            priority
            className={rest.length > 0 ? "lg:col-span-7" : "lg:col-span-12"}
          />
          {rest.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1 lg:gap-6">
              {rest.slice(0, 2).map((car) => (
                <PremiumVehicleCard key={car.id} vehicle={car} />
              ))}
            </div>
          )}
        </div>

        {rest.length > 2 && (
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-6 lg:grid-cols-3 lg:gap-6">
            {rest.slice(2).map((car) => (
              <PremiumVehicleCard key={car.id} vehicle={car} />
            ))}
          </div>
        )}

        <footer className="mt-10 flex flex-col items-start justify-between gap-6 border-t border-[var(--pc-line)] pt-8 sm:flex-row sm:items-center">
          {visibleTags.length > 0 ? (
            <nav aria-label="Browse the collection by category" className="flex flex-wrap gap-2">
              {visibleTags.map((t) => (
                <Link
                  key={t.id}
                  href={`/premium-cars?tag=${encodeURIComponent(t.slug)}`}
                  className="rounded-full border border-[var(--pc-line)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--pc-text-2)] transition-colors hover:border-[var(--pc-line-strong)] hover:text-[var(--pc-gold-hi)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pc-gold-hi)]"
                >
                  {t.name}
                </Link>
              ))}
            </nav>
          ) : (
            <span />
          )}
          <Link
            href="/premium-cars"
            className="group inline-flex items-center gap-2 rounded-full bg-[var(--pc-gold)] px-6 py-3 text-sm font-bold uppercase tracking-wider text-[#080D26] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pc-text)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pc-bg)]"
          >
            Explore the collection
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </footer>
      </div>
    </section>
  );
}
