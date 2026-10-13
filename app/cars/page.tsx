import { Suspense } from "react";
import CarsGrid from "@/app/components/carsGrid";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Cars — Progressive AutoHub",
  description:
    "Browse every certified pre-owned car in stock. Filter by body type, brand and budget.",
};

export default function CarsPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--color-bg))] font-sans text-[hsl(var(--color-content))]">
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden border-b border-[hsl(var(--color-line))]">
        <div
          className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-[hsl(var(--color-primary)/0.1)] blur-[120px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-32 top-0 h-[320px] w-[320px] rounded-full bg-amber-200/30 blur-[100px]"
          aria-hidden="true"
        />
        <div className="container relative py-10 lg:py-14">
          <span className="eyebrow inline-flex items-center rounded-full border border-[hsl(var(--color-primary)/0.4)] bg-[hsl(var(--color-primary)/0.12)] px-3 py-1.5">
            Full Showroom
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Browse every certified car
          </h1>
          <p className="mt-3 max-w-xl text-base text-[hsl(var(--color-content-muted))]">
            Pre-owned vehicles with a recorded inspection and a transparent price.
          </p>
        </div>
      </section>

      {/* ─── CAR GRID ─── */}
      <section
        className="container w-full py-10"
        aria-label="Car listings"
      >
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div
                  className="h-8 w-8 animate-spin rounded-full border-[3px] border-[hsl(var(--color-line))] border-t-[hsl(var(--color-primary-strong))]"
                  aria-hidden="true"
                />
                <p className="text-sm text-[hsl(var(--color-content-muted))]">Loading vehicles…</p>
              </div>
            </div>
          }
        >
          <CarsGrid />
        </Suspense>
      </section>
    </div>
  );
}
