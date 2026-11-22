import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Camera, Fuel, Gauge, Globe2, Zap } from "lucide-react";

import { formatINRLakhs } from "@/app/lib/currency";
import { cn } from "@/app/lib/utils";
import type { UiVehicle } from "@/app/lib/nest-types";

export interface PremiumVehicleCardProps {
  vehicle: UiVehicle;
  /** Large editorial treatment (homepage lead car). */
  featured?: boolean;
  /** Preload the image — use for above-the-fold cards. */
  priority?: boolean;
  className?: string;
}

/** Tag slug that marks an imported vehicle. Set by the admin, not inferred. */
const IMPORTED_SLUG = "imported";

/**
 * Reusable card for the Premium / Exclusive collection.
 *
 * Presentational and server-safe. Every label shown here comes from the
 * vehicle's admin-assigned data (badge, tags, engine) — the card never decides
 * that a car is "premium" from its brand or price.
 *
 * Must render inside a `.premium-scope` ancestor (see globals.css).
 */
export default function PremiumVehicleCard({
  vehicle: v,
  featured = false,
  priority = false,
  className,
}: PremiumVehicleCardProps) {
  const tags = v.premiumTags ?? [];
  const imported = tags.some((t) => t.slug === IMPORTED_SLUG);
  const badge = v.premiumBadge || tags[0]?.name || "Premium";
  const extraTags = tags.filter((t) => t.slug !== IMPORTED_SLUG).slice(0, featured ? 4 : 2);
  const available = v.status === "AVAILABLE";

  return (
    <Link
      href={`/cars/${v.id}`}
      aria-label={`${v.brand} ${v.name}, ${formatINRLakhs(v.price)}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--pc-line)] bg-[var(--pc-card)] transition-all duration-500",
        "hover:-translate-y-1 hover:border-[var(--pc-line-strong)] hover:shadow-[0_24px_60px_-24px_rgb(212_175_55/0.35)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pc-gold-hi)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pc-bg)]",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-[var(--pc-elevated)]",
          featured ? "aspect-[16/10] lg:aspect-auto lg:min-h-[420px] lg:flex-1" : "aspect-[4/3]",
        )}
      >
        {v.image ? (
          <Image
            src={v.image}
            alt={`${v.brand} ${v.name}`}
            fill
            priority={priority}
            sizes={
              featured
                ? "(max-width: 1024px) 100vw, 60vw"
                : "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
            }
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Camera className="text-[var(--pc-muted)]" size={36} aria-hidden="true" />
          </div>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--pc-card)] via-transparent to-transparent opacity-90"
        />

        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-[var(--pc-gold)] px-2.5 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[#1a1405]">
            {badge}
          </span>
          {imported && (
            <span className="inline-flex items-center gap-1 rounded-md border border-[var(--pc-line-strong)] bg-black/55 px-2 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--pc-gold-hi)] backdrop-blur-sm">
              <Globe2 size={11} aria-hidden="true" />
              Imported
            </span>
          )}
        </div>

        {available && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--pc-text)] backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--pc-emerald)]" aria-hidden="true" />
            Available
          </span>
        )}
      </div>

      <div className={cn("flex flex-col gap-3 px-5 pb-5", featured ? "pt-4 lg:px-7 lg:pb-7" : "pt-3")}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--pc-gold)]">
            {v.brand} · {v.year}
          </p>
          <h3
            className={cn(
              "mt-1 font-bold leading-tight text-[var(--pc-text)]",
              featured ? "text-2xl sm:text-3xl" : "line-clamp-2 text-lg",
            )}
          >
            {v.name}
          </h3>
        </div>

        {v.engine && (
          <p className="inline-flex items-center gap-2 text-sm font-medium text-[var(--pc-text)]">
            <Zap size={14} className="shrink-0 text-[var(--pc-gold-hi)]" aria-hidden="true" />
            <span className="line-clamp-1">{v.engine}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--pc-text-2)]">
          <span className="inline-flex items-center gap-1.5">
            <Fuel size={13} aria-hidden="true" />
            {v.fuel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Gauge size={13} aria-hidden="true" />
            {v.mileage.toLocaleString("en-IN")} km
          </span>
          <span>{v.transmission}</span>
        </div>

        {extraTags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Classification">
            {extraTags.map((t) => (
              <li
                key={t.id}
                className="rounded-full border border-[var(--pc-line)] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-[var(--pc-text-2)]"
              >
                {t.name}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-1 flex items-end justify-between border-t border-[var(--pc-line)] pt-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--pc-muted)]">Price</p>
            <p className={cn("font-extrabold text-[var(--pc-text)]", featured ? "text-3xl" : "text-xl")}>
              {formatINRLakhs(v.price)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--pc-line-strong)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--pc-gold-hi)] transition-colors group-hover:bg-[var(--pc-gold)] group-hover:text-[#1a1405]">
            View details
            <ArrowUpRight size={14} aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
