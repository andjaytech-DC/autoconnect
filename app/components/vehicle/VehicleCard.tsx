import Image from "next/image";
import Link from "next/link";
import { Camera, ChevronRight, Fuel, Gauge } from "lucide-react";

import { formatINRLakhs } from "@/app/lib/currency";
import { cn } from "@/app/lib/utils";

export interface VehicleCardProps {
  id: number;
  /** Full display name, e.g. "BMW X5 xDrive40i M Sport". */
  name: string;
  brand: string;
  year: number;
  price: number;
  mileage: number;
  fuel: string;
  transmission: string;
  image: string | null;
  /** Optional label rendered over the image (Premium, New, Exclusive…). */
  badge?: string;
  /** Link target — defaults to the canonical vehicle detail route. */
  href?: string;
  /** Number of listing photos, shown as a camera count when > 1. */
  imageCount?: number;
  /** Preload the first card(s) so the listing's LCP image is not lazy. */
  priority?: boolean;
  /** Extra classes for grid spacing. */
  className?: string;
}

/**
 * Canonical vehicle card for every discovery surface (search grid, premium
 * collection, related vehicles). Server-component safe — no client JS.
 *
 * Rules enforced here:
 *  - Semantic tokens only (no hardcoded brand hex values).
 *  - Minimum 12px body text and 44px-touch friendly link surface for AA.
 *  - All prices via formatINRLakhs so ₹/lakh formatting stays consistent.
 */
export default function VehicleCard({
  id,
  name,
  brand,
  year,
  price,
  mileage,
  fuel,
  transmission,
  image,
  badge,
  href,
  imageCount,
  priority = false,
  className,
}: VehicleCardProps) {
  const to = href ?? `/cars/${id}`;

  return (
    <Link
      href={to}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] shadow-[var(--shadow-subtle)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[hsl(var(--color-line-hover))] hover:shadow-[var(--shadow-elevated-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] focus-visible:ring-offset-2",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[hsl(var(--color-surface-strong))]">
        {image ? (
          <Image
            src={image}
            alt={`${brand} ${name}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Camera
              className="text-[hsl(var(--color-content-faint))]"
              size={32}
              aria-hidden="true"
            />
          </div>
        )}
        {badge && (
          <span className="absolute left-3 top-3 rounded-md bg-[hsl(var(--color-primary))] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--color-primary-foreground))]">
            {badge}
          </span>
        )}
        {imageCount && imageCount > 1 && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-[hsl(var(--color-ink-900)/0.75)] px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <Camera size={10} aria-hidden="true" />
            {imageCount}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--color-content-faint))]">
          {brand} · {year}
        </p>
        <h2 className="mt-0.5 line-clamp-2 text-sm font-bold text-[hsl(var(--color-content))] transition-colors group-hover:text-[hsl(var(--color-primary-strong))]">
          {name}
        </h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[hsl(var(--color-content-muted))]">
          <span className="inline-flex items-center gap-1">
            <Gauge size={12} aria-hidden="true" />
            {mileage.toLocaleString("en-IN")} km
          </span>
          <span className="inline-flex items-center gap-1">
            <Fuel size={12} aria-hidden="true" />
            {fuel}
          </span>
          <span>{transmission}</span>
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-[hsl(var(--color-line))] pt-3">
          <span className="text-base font-extrabold text-[hsl(var(--color-content))]">
            {formatINRLakhs(price)}
          </span>
          <ChevronRight
            size={16}
            className="text-[hsl(var(--color-content-faint))] transition-colors group-hover:text-[hsl(var(--color-primary-strong))]"
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  );
}
