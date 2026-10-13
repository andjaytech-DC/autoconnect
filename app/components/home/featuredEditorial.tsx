import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Fuel, Gauge, Sparkles } from "lucide-react";

import { SectionHeader } from "./sectionHeader";
import type { UiVehicle } from "@/app/lib/nest-public";
import { formatINRLakhs } from "@/app/lib/currency";

interface FeaturedEditorialProps {
  cars: UiVehicle[];
}

export function FeaturedEditorial({ cars }: FeaturedEditorialProps) {
  return (
    <section className="animate-rise container pb-16" aria-label="Featured exclusive arrivals">
      <SectionHeader
        eyebrow="Featured / Exclusive Arrivals"
        title="Handpicked for the discerning buyer."
        viewAllHref="/cars"
      />

      {cars.length > 0 ? (
        <div className="space-y-6">
          {cars.slice(0, 3).map((car, idx) => (
            <Link
              key={car.id}
              href={`/cars/${car.id}`}
              className="group block overflow-hidden rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] shadow-[var(--shadow-subtle)] transition-all duration-300 hover:border-[hsl(var(--color-line-hover))] hover:shadow-[var(--shadow-elevated-hover)]"
            >
              <div className={`grid gap-0 ${idx % 2 === 0 ? "lg:grid-cols-[1.2fr_1fr]" : "lg:grid-cols-[1fr_1.2fr]"}`}>
                <div className={`relative aspect-[16/10] overflow-hidden bg-[hsl(var(--color-surface-strong))] ${idx % 2 !== 0 ? "lg:order-2" : ""}`}>
                  {car.image ? (
                    <Image
                      src={car.image}
                      alt={car.name}
                      fill
                      sizes="(max-width:1024px)100vw,50vw"
                      className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Sparkles className="text-[hsl(var(--color-content-faint))]" size={48} />
                    </div>
                  )}
                  <span className="absolute left-4 top-4 rounded-lg bg-[hsl(var(--color-primary))] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--color-primary-foreground))]">
                    Exclusive
                  </span>
                </div>
                <div className={`flex flex-col justify-center px-8 py-8 lg:px-12 ${idx % 2 !== 0 ? "lg:order-1" : ""}`}>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--color-primary-strong))]">{car.brand}</p>
                  <h3 className="mt-2 text-xl font-extrabold text-[hsl(var(--color-content))] sm:text-2xl">{car.name}</h3>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[hsl(var(--color-content-muted))]">
                    <span className="inline-flex items-center gap-1"><Gauge size={13} aria-hidden="true" /> {car.year}</span>
                    <span className="inline-flex items-center gap-1"><Fuel size={13} aria-hidden="true" /> {car.mileage.toLocaleString("en-IN")} km</span>
                    <span>{car.fuel}</span>
                    <span>{car.transmission}</span>
                  </div>
                  <div className="mt-6 flex items-center gap-4">
                    <span className="text-2xl font-extrabold text-[hsl(var(--color-content))]">{formatINRLakhs(car.price)}</span>
                    <span className="rounded-xl bg-[hsl(var(--color-primary)/0.15)] px-4 py-2 text-xs font-bold text-[hsl(var(--color-primary-strong))] transition group-hover:bg-[hsl(var(--color-primary))] group-hover:text-[hsl(var(--color-primary-foreground))]">
                      Explore vehicle <ArrowRight size={12} className="ml-1 inline" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] px-6 py-16 text-center">
          <Sparkles className="mx-auto text-[hsl(var(--color-content-faint))]" size={40} aria-hidden="true" />
          <p className="mt-4 text-lg font-bold text-[hsl(var(--color-content))]">Exclusive arrivals coming soon</p>
          <p className="mt-2 text-sm text-[hsl(var(--color-content-muted))]">New stock arriving daily — check back soon.</p>
        </div>
      )}

      <div className="mt-8 text-center lg:hidden">
        <Link href="/cars" className="inline-flex items-center gap-1 text-sm font-semibold text-[hsl(var(--color-primary-strong))]">
          View Full Collection <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}