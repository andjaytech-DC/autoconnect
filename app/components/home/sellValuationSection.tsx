import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SellValuationSection() {
  return (
    <section className="animate-rise container pb-16" aria-label="Sell your car">
      <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] px-6 py-10 shadow-[var(--shadow-subtle)] sm:px-10">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[hsl(var(--color-primary)/0.15)] blur-[80px]"
          aria-hidden="true"
        />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <span className="inline-flex rounded-full bg-[hsl(var(--color-primary)/0.15)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--color-primary-strong))]">
              Sell with confidence
            </span>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-[hsl(var(--color-content))] sm:text-3xl">
              Request a free valuation.
            </h2>
            <p className="mt-2 max-w-md text-sm text-[hsl(var(--color-content-muted))]">
              Tell us about your car and our team returns an indicative offer — no obligation to
              sell.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/sell"
                className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--color-primary))] px-5 py-2.5 text-sm font-bold text-[hsl(var(--color-primary-foreground))] transition hover:brightness-105 hover:shadow-[var(--shadow-elevated)]"
              >
                Sell My Car <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-bg))] p-5">
            <h3 className="text-sm font-bold text-[hsl(var(--color-content))]">Quick start</h3>
            <p className="mt-1 text-xs text-[hsl(var(--color-content-muted))]">Start with your registration number.</p>
            <form action="/sell" className="mt-3">
              <div className="flex min-h-10 items-center rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] px-3 focus-within:border-[hsl(var(--color-primary))] focus-within:ring-2 focus-within:ring-[hsl(var(--color-focus)/0.2)] transition-colors">
                <span className="mr-2 text-sm font-bold text-[hsl(var(--color-primary-strong))]">IND</span>
                <label htmlFor="hero-reg" className="sr-only">Registration number</label>
                <input
                  id="hero-reg"
                  name="q"
                  type="text"
                  placeholder="DL 03 AB XXXX"
                  className="w-full bg-transparent text-sm text-[hsl(var(--color-content))] outline-none placeholder:text-[hsl(var(--color-content-faint))]"
                />
              </div>
              <button
                type="submit"
                className="mt-3 w-full rounded-lg bg-[hsl(var(--color-primary))] py-2 text-sm font-bold text-[hsl(var(--color-primary-foreground))] transition hover:brightness-105"
              >
                Get Free Valuation
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}