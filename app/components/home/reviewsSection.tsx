import { Star } from "lucide-react";

import type { RealReview } from "@/app/lib/reviews";

interface ReviewsSectionProps {
  reviews: RealReview[];
}

export function ReviewsSection({ reviews }: ReviewsSectionProps) {
  if (reviews.length === 0) return null;

  return (
    <section className="animate-rise container pb-16" aria-label="Customer reviews">
      <div className="mb-8">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--color-primary-strong))]">Customer Reviews</span>
        <h2 className="mt-2 text-2xl font-extrabold text-[hsl(var(--color-content))] lg:text-3xl">What buyers said.</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {reviews.map((t) => (
          <figure key={t.id} className="rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-5 shadow-[var(--shadow-subtle)]">
            <div className="mb-2.5 flex gap-0.5" aria-label={`Rated ${t.rating} out of 5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={13}
                  className={i < t.rating ? "fill-[hsl(var(--color-primary-strong))] text-[hsl(var(--color-primary-strong))]" : "text-[hsl(var(--color-line-hover))]"}
                />
              ))}
            </div>
            <blockquote className="text-sm leading-relaxed text-[hsl(var(--color-content-muted))] line-clamp-3">
              &ldquo;{t.comment}&rdquo;
            </blockquote>
            <figcaption className="mt-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--color-primary))] text-[10px] font-bold text-[hsl(var(--color-primary-foreground))]">
                {t.initials ?? "?"}
              </span>
              <div>
                <p className="text-xs font-semibold text-[hsl(var(--color-content))]">Verified buyer</p>
                {t.vehicleTitle && (
                  <p className="text-[10px] text-[hsl(var(--color-content-faint))]">{t.vehicleTitle}</p>
                )}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}