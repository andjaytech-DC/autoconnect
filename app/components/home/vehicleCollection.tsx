import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";

import type { NestNewCar, UiVehicle } from "@/app/lib/nest-public";
import { formatINRLakhs } from "@/app/lib/currency";

import { SectionHeader, SectionHeaderMobileLink } from "./sectionHeader";

interface VehicleCollectionProps {
  cars: UiVehicle[];
  eyebrow: string;
  title: string;
  viewAllHref: string;
  defaultBadge?: string;
  emptyMessage: string;
}

export default function VehicleCollection({
  cars,
  eyebrow,
  title,
  viewAllHref,
  defaultBadge = "Premium",
  emptyMessage,
}: VehicleCollectionProps) {
  return (
    <section className="animate-rise container pb-16" aria-label={eyebrow}>
      <SectionHeader eyebrow={eyebrow} title={title} viewAllHref={viewAllHref} />
      {cars.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cars.map((car) => (
            <Link
              key={car.id}
              href={`/cars/${car.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] shadow-[var(--shadow-subtle)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[hsl(var(--color-line-hover))] hover:shadow-[var(--shadow-elevated-hover)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[hsl(var(--color-surface-strong))]">
                {car.image ? (
                  <Image
                    src={car.image}
                    alt={car.name}
                    fill
                    sizes="(max-width:768px)100vw,25vw"
                    className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Sparkles className="text-[hsl(var(--color-content-faint))]" size={36} />
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-md bg-[hsl(var(--color-primary))] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--color-primary-foreground))]">
                  {car.premiumBadge ?? defaultBadge}
                </span>
              </div>
              <div className="flex flex-1 flex-col px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--color-content-faint))]">
                  {car.brand} · {car.year}
                </p>
                <h3 className="mt-0.5 text-sm font-bold text-[hsl(var(--color-content))] line-clamp-1 transition-colors group-hover:text-[hsl(var(--color-primary-strong))]">
                  {car.name}
                </h3>
                <div className="mt-auto flex items-center justify-between border-t border-[hsl(var(--color-line))] pt-3">
                  <span className="text-base font-extrabold text-[hsl(var(--color-content))]">
                    {formatINRLakhs(car.price)}
                  </span>
                  <ChevronRight
                    size={16}
                    className="text-[hsl(var(--color-content-faint))] transition-colors group-hover:text-[hsl(var(--color-primary-strong))]"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-10 text-center">
          <p className="text-sm text-[hsl(var(--color-content-muted))]">{emptyMessage}</p>
        </div>
      )}
      <SectionHeaderMobileLink href={viewAllHref} label={`View All ${eyebrow}`} />
    </section>
  );
}

interface NewCarCollectionProps {
  cars: NestNewCar[];
  eyebrow: string;
  title: string;
  viewAllHref: string;
  emptyMessage: string;
}

export function NewCarCollection({
  cars,
  eyebrow,
  title,
  viewAllHref,
  emptyMessage,
}: NewCarCollectionProps) {
  return (
    <section className="animate-rise container pb-16" aria-label={eyebrow}>
      <SectionHeader eyebrow={eyebrow} title={title} viewAllHref={viewAllHref} />
      {cars.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cars.map((car) => {
            const priceStr = formatINRLakhs(car.exShowroomPrice ?? car.price ?? 0);
            const imageUrl = car.imageUrl ?? car.images?.[0] ?? null;
            return (
              <Link
                key={car.id}
                href={`/new-cars/${encodeURIComponent(car.brandName)}/${encodeURIComponent(
                  car.slug ??
                    `${car.model}-${car.variant ?? "base"}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                )}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] shadow-[var(--shadow-subtle)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[hsl(var(--color-line-hover))] hover:shadow-[var(--shadow-elevated-hover)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[hsl(var(--color-surface-strong))]">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={`${car.brandName} ${car.model}`}
                      fill
                      sizes="(max-width:768px)100vw,25vw"
                      className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Sparkles className="text-[hsl(var(--color-content-faint))]" size={36} />
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-md bg-[hsl(var(--color-success))] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--color-success-foreground))]">
                    New
                  </span>
                </div>
                <div className="flex flex-1 flex-col px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--color-success))]">
                    {car.brandName}
                  </p>
                  <h3 className="mt-0.5 text-sm font-bold text-[hsl(var(--color-content))] line-clamp-1 transition-colors group-hover:text-[hsl(var(--color-success))]">
                    {car.model} {car.variant ?? ""}
                  </h3>
                  <div className="mt-auto flex items-center justify-between border-t border-[hsl(var(--color-line))] pt-3">
                    <span className="text-base font-extrabold text-[hsl(var(--color-success))]">{priceStr}</span>
                    <ChevronRight
                      size={16}
                      className="text-[hsl(var(--color-content-faint))] transition-colors group-hover:text-[hsl(var(--color-success))]"
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-10 text-center">
          <p className="text-sm text-[hsl(var(--color-content-muted))]">{emptyMessage}</p>
        </div>
      )}
      <SectionHeaderMobileLink href={viewAllHref} label={`View All ${eyebrow}`} />
    </section>
  );
}
