import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  getNewCars,
  resolveImage,
  type NestNewCar,
} from "@/app/lib/nest-public";
import { Sparkles, Car, ArrowRight, Fuel, Gauge } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "New Cars in India — Progressive AutoHub",
  description: "Explore new cars by brand, body type and fuel. Ex-showroom and on-road prices.",
};

type NewCarRow = {
  id: number;
  brandName: string;
  model: string;
  variant: string | null;
  slug: string;
  price: number;
  fuel: string;
  transmission: string;
  bodyType: string | null;
  imageUrl: string | null;
};

function toRows(raw: NestNewCar[]): NewCarRow[] {
  return raw.map((c) => ({
    id: c.id,
    brandName: c.brandName,
    model: c.model,
    variant: c.variant ?? null,
    slug:
      c.slug ??
      `${c.model}-${c.variant ?? "base"}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    price: c.exShowroomPrice ?? c.price ?? 0,
    fuel: c.fuel ?? c.fuelType ?? "—",
    transmission: c.transmission ?? "—",
    bodyType: c.bodyType ?? null,
    imageUrl: resolveImage(c.imageUrl ?? (Array.isArray(c.images) ? c.images[0] : null)),
  }));
}

export default async function NewCarsPage({ searchParams }: { searchParams: Promise<{ brand?: string }> }) {
  const { brand } = await searchParams;

  let cars: NewCarRow[] = [];
  let brands: string[] = [];
  let error = false;
  try {
    const raw = await getNewCars(brand ? { brand } : {});
    const all = Array.isArray(raw) ? raw : (raw.cars ?? []);
    cars = toRows(all);
    brands = brand
      ? []
      : Array.from(new Set(cars.map((c) => c.brandName))).sort();
  } catch {
    error = true;
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--color-bg))] font-sans text-[hsl(var(--color-content))]">

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[hsl(var(--color-line))]">
        <div
          className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-[hsl(var(--color-primary)/0.1)] blur-[120px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-32 top-0 h-[320px] w-[320px] rounded-full bg-amber-200/30 blur-[100px]"
          aria-hidden="true"
        />
        <div className="container relative py-12 lg:py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--color-success)/0.4)] bg-[hsl(var(--color-success)/0.1)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--color-success))]">
            <Sparkles size={14} aria-hidden="true" />
            Latest Models
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            New Cars in <span className="text-[hsl(var(--color-primary-strong))]">India</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-[hsl(var(--color-content-muted))]">
            Ex-showroom prices, specifications, variants and availability across brands.
          </p>
        </div>
      </section>

      <main className="container flex-1 py-10">
        {/* Brand filter chips */}
        <div className="mb-8 flex flex-wrap gap-2" aria-label="Filter by brand">
          <Link
            href="/new-cars"
            className="chip"
            aria-current={!brand ? "page" : undefined}
          >
            All Brands
          </Link>
          {brands.map((b) => (
            <Link
              key={b}
              href={`/new-cars?brand=${encodeURIComponent(b)}`}
              className="chip"
              aria-current={brand === b ? "page" : undefined}
            >
              {b}
            </Link>
          ))}
        </div>

        {error ? (
          <div className="rounded-3xl border border-dashed border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] px-6 py-20 text-center">
            <Car size={48} className="mx-auto text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-bold text-[hsl(var(--color-content))]">Unable to load new cars</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[hsl(var(--color-content-muted))]">
              Please check your connection and retry.
            </p>
            <Link href="/new-cars" className="btn btn-success mt-6">
              Retry <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        ) : cars.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((c) => (
              <Link
                key={c.id}
                href={`/new-cars/${encodeURIComponent(c.brandName)}/${encodeURIComponent(c.slug)}`}
                className="group overflow-hidden rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] shadow-[var(--shadow-subtle)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[hsl(var(--color-line-hover))] hover:shadow-[var(--shadow-elevated-hover)]"
              >
                {c.imageUrl ? (
                  <div className="relative h-48 overflow-hidden bg-[hsl(var(--color-surface-strong))]">
                    <Image
                      src={c.imageUrl}
                      alt={`${c.brandName} ${c.model}`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-3 top-3 badge badge-success">New</span>
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center bg-[hsl(var(--color-surface-strong))]">
                    <Car size={48} className="text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
                  </div>
                )}
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--color-success))]">{c.brandName}</p>
                  <p className="mt-1 text-lg font-bold text-[hsl(var(--color-content))]">{c.model} {c.variant}</p>
                  <p className="mt-2 text-xl font-extrabold text-[hsl(var(--color-success))]">
                    ₹{c.price.toLocaleString("en-IN")}
                    <span className="ml-1 text-xs font-normal text-[hsl(var(--color-content-muted))]">ex-showroom</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-[hsl(var(--color-content-muted))]">
                    <span className="flex items-center gap-1"><Fuel size={12} aria-hidden="true" /> {c.fuel}</span>
                    <span className="flex items-center gap-1"><Gauge size={12} aria-hidden="true" /> {c.transmission}</span>
                    {c.bodyType && <span className="flex items-center gap-1"><Car size={12} aria-hidden="true" /> {c.bodyType}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] px-6 py-20 text-center">
            <Car size={48} className="mx-auto text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-bold text-[hsl(var(--color-content))]">No new cars found</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[hsl(var(--color-content-muted))]">
              {brand ? `No new cars available from ${brand} at the moment.` : "New car listings will appear here once the inventory is updated."}
            </p>
            <Link href="/new-cars" className="btn btn-success mt-6">
              View all brands <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
