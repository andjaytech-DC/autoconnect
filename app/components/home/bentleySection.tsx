import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Fuel, Gauge, Sparkles } from "lucide-react";

import type { UiVehicle } from "@/app/lib/nest-public";
import { formatINRLakhs } from "@/app/lib/currency";

interface BentleySectionProps {
  car: UiVehicle;
}

export function BentleySection({ car }: BentleySectionProps) {
  return (
    <section className="animate-rise container pb-16" aria-label="Bentley feature">
      <Link
        href={`/cars/${car.id}`}
        className="group block overflow-hidden rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] shadow-[var(--shadow-subtle)] transition-all duration-300 hover:border-[hsl(var(--color-line-hover))] hover:shadow-[var(--shadow-elevated-hover)]"
      >
        <div className="grid gap-0 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col justify-center px-8 py-8 lg:px-12">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--color-primary-strong))]">The Bentley Continental GT</p>
            <h2 className="mt-2 text-2xl font-extrabold text-[hsl(var(--color-content))] sm:text-3xl">{car.name}</h2>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[hsl(var(--color-content-muted))]">
              <span className="inline-flex items-center gap-1"><Gauge size={13} aria-hidden="true" /> {car.year}</span>
              <span className="inline-flex items-center gap-1"><Fuel size={13} aria-hidden="true" /> {car.mileage.toLocaleString("en-IN")} km</span>
              <span>{car.fuel}</span>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <span className="text-2xl font-extrabold text-[hsl(var(--color-content))]">{formatINRLakhs(car.price)}</span>
              <span className="rounded-xl bg-[hsl(var(--color-primary)/0.18)] px-4 py-2 text-xs font-bold text-[hsl(var(--color-primary-strong))] transition group-hover:bg-[hsl(var(--color-primary))] group-hover:text-[hsl(var(--color-primary-foreground))]">
                Explore vehicle <ArrowRight size={12} className="ml-1 inline" aria-hidden="true" />
              </span>
            </div>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden bg-[hsl(var(--color-surface-strong))]">
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
            <span className="absolute right-4 top-4 rounded-lg bg-[hsl(var(--color-primary))] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--color-primary-foreground))]">
              Premium
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}