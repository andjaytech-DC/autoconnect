import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import type { UiVehicle } from "@/app/lib/nest-public";

interface ComingSoonSectionProps {
  cars: UiVehicle[];
}

export function ComingSoonSection({ cars }: ComingSoonSectionProps) {
  if (cars.length === 0) return null;

  return (
    <section className="animate-rise container pb-16" aria-label="Coming soon">
      <div className="mb-8">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--color-primary-strong))]">Coming Soon</span>
        <h2 className="mt-2 text-2xl font-extrabold text-[hsl(var(--color-content))] lg:text-3xl">Upcoming exclusive arrivals</h2>
      </div>
      <div className="space-y-4">
        {cars.map((car) => (
          <Link
            key={car.id}
            href={`/cars/${car.id}`}
            className="group block rounded-2xl border border-[hsl(var(--color-primary)/0.45)] bg-[hsl(var(--color-card))] p-6 shadow-[var(--shadow-subtle)] transition-all duration-300 hover:border-[hsl(var(--color-primary))] hover:shadow-[var(--shadow-elevated)] sm:p-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-8">
              <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-[hsl(var(--color-surface-strong))]">
                {car.image ? (
                  <Image src={car.image} alt={car.name} fill sizes="128px" className="object-contain p-2" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Sparkles className="text-[hsl(var(--color-content-faint))]" size={28} />
                  </div>
                )}
              </div>
              <div className="mt-4 flex-1 sm:mt-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--color-primary-strong))]">{car.brand}</p>
                <h3 className="mt-1 text-lg font-extrabold text-[hsl(var(--color-content))]">{car.name}</h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[hsl(var(--color-content-muted))]">
                  <span>{car.year}</span>
                  <span>{car.mileage.toLocaleString("en-IN")} km</span>
                  <span>{car.fuel}</span>
                </div>
              </div>
              <div className="mt-4 sm:ml-auto sm:mt-0">
                <span className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.18)] px-5 py-2.5 text-sm font-bold text-[hsl(var(--color-primary-strong))] transition group-hover:bg-[hsl(var(--color-primary))] group-hover:text-[hsl(var(--color-primary-foreground))]">
                  Register Interest <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}