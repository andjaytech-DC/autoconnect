import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCtaSection() {
  return (
    <section className="animate-rise container pb-20" aria-label="Final call to action">
      <div className="rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] px-6 py-12 text-center shadow-[var(--shadow-subtle)] sm:px-12">
        <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-[hsl(var(--color-content))] sm:text-4xl">
          Buy. Sell. Finance. <span className="text-[hsl(var(--color-primary-strong))]">Everything Auto.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-[hsl(var(--color-content-muted))]">
          Progressive AutoHub brings the complete automotive ecosystem together in one platform.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/cars"
            className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--color-primary))] px-6 py-3 text-sm font-bold text-[hsl(var(--color-primary-foreground))] transition hover:brightness-105 hover:shadow-[var(--shadow-elevated)]"
          >
            Explore Cars <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href="/sell"
            className="inline-flex items-center rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] px-6 py-3 text-sm font-semibold text-[hsl(var(--color-content))] transition hover:border-[hsl(var(--color-line-hover))] hover:shadow-[var(--shadow-elevated)]"
          >
            Sell Your Car
          </Link>
        </div>
      </div>
    </section>
  );
}