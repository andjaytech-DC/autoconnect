import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { BRAND_SLUGS, type BrandSlug } from "@/app/data/navigation";
import { getBrands, getVehicles, getNewCars, mapVehicle, resolveBrandId, type UiVehicle, type NestNewCar } from "@/app/lib/nest-public";

export const dynamic = "force-dynamic";

function titleCase(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function renderVehicleGrid({
  brandName,
  error,
  newCars,
  displayCars,
  brandCount,
  newCarCount,
}: {
  brandName: string;
  error: boolean;
  newCars: import("@/app/lib/nest-public").NestNewCar[];
  displayCars: import("@/app/lib/nest-public").UiVehicle[];
  brandCount: number;
  newCarCount: number;
}) {
  if (error) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-surface px-6 py-20 text-center">
        <h2 className="text-xl font-bold text-content">Unable to load {brandName} vehicles</h2>
        <p className="mt-2 text-sm text-content-muted max-w-md mx-auto">
          Please check your connection and retry.
        </p>
      </div>
    );
  }

  if (newCars.length > 0 || displayCars.length > 0) {
    return (
      <>
        {newCars.length > 0 && (
          <section aria-label={`${brandName} new cars`} className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold text-content flex items-center gap-2">
                <Sparkles size={20} className="text-[hsl(var(--color-primary-strong))]" />
                New {brandName} Cars
              </h2>
              <span className="text-sm text-content-muted">{newCarCount} model{newCarCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {newCars.map((car) => {
                const price = car.exShowroomPrice ?? car.price ?? 0;
                const lakhs = price / 100000;
                const priceStr = lakhs >= 1 ? `₹${lakhs.toFixed(1)} Lakh` : `₹${price.toLocaleString("en-IN")}`;
                const imageUrl = car.imageUrl ?? car.images?.[0] ?? null;
                return (
                  <Link
                    key={car.id}
                    href={`/new-cars/${encodeURIComponent(car.brandName)}/${encodeURIComponent(car.slug ?? `${car.model}-${car.variant ?? 'base'}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`}
                    className="bg-card rounded-2xl border border-line shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
                  >
                    <div className="relative h-48 w-full flex items-center justify-center bg-surface overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={`${car.brandName} ${car.model}`}
                          className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <span className="text-sm text-content-faint">No image</span>
                      )}
                      <span className="badge badge-success absolute left-3 top-3">
                        NEW
                      </span>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-content text-lg">{car.brandName} {car.model}</h3>
                        {car.variant && <p className="text-xs text-content-muted mt-1">{car.variant}</p>}
                        <p className="text-xs text-content-muted mt-1">
                          {car.fuelType ?? car.fuel ?? '—'} • {car.transmission ?? '—'}
                        </p>
                      </div>
                      <div className="pt-3 mt-3 border-t border-divider flex items-center justify-between">
                        <span className="text-lg font-bold text-emerald-400">
                          {priceStr} <span className="text-xs font-normal text-content-muted">ex-showroom</span>
                        </span>
                        <span aria-hidden="true" className="p-2.5 rounded-xl bg-surface group-hover:bg-emerald-600 group-hover:text-white text-content-muted transition-colors">
                          <ArrowUpRight size={18} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {displayCars.length > 0 && (
          <section aria-label={`${brandName} certified pre-owned cars`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold text-content">Certified Pre-Owned {brandName} Cars</h2>
              <span className="text-sm text-content-muted">{brandCount} vehicle{brandCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayCars.map((car) => (
                <Link
                  key={car.id}
                  href={`/cars/${car.id}`}
                  className="bg-card rounded-2xl border border-line shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
                >
                  <div className="relative h-48 w-full flex items-center justify-center bg-surface overflow-hidden">
                    {car.image ? (
                      <img
                        src={car.image}
                        alt={car.name}
                        className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <span className="text-sm text-content-faint">No image</span>
                    )}
                    <span className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md text-content shadow-sm">
                      {car.year}
                    </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-content text-lg">{car.name}</h3>
                      <p className="text-xs text-content-muted mt-1">
                        {car.mileage.toLocaleString("en-IN")} km • {car.fuel} • {car.transmission}
                      </p>
                    </div>
                    <div className="pt-3 mt-3 border-t border-divider flex items-center justify-between">
                      <span className="text-lg font-bold text-content">
                        ₹{car.price.toLocaleString("en-IN")}
                      </span>
                      <span
                        aria-hidden="true"
                        className="p-2.5 rounded-xl bg-surface group-hover:bg-[hsl(var(--color-primary))] group-hover:text-[hsl(var(--color-primary-foreground))] text-content-muted transition-colors"
                      >
                        <ArrowUpRight size={18} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </>
    );
  }

  if (error || (newCars.length === 0 && displayCars.length === 0)) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-surface px-6 py-20 text-center">
        <h2 className="text-xl font-bold text-content">No {brandName} vehicles available</h2>
        <p className="mt-2 text-sm text-content-muted max-w-md mx-auto">
          {'New and pre-owned stock will appear here as soon as it\'s listed.'}
        </p>
        <Link href="/cars" className="mt-6 inline-block rounded-xl bg-[hsl(var(--color-primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--color-primary-foreground))] hover:brightness-110">
          Browse all cars
        </Link>
      </div>
    );
  }
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brandName = titleCase(slug);

  if (!BRAND_SLUGS.includes(slug as BrandSlug)) {
    notFound();
  }

  // Public brand listings straight from NestJS (best-effort; error state on failure).
  let displayCars: import("@/app/lib/nest-public").UiVehicle[] = [];
  let newCars: import("@/app/lib/nest-public").NestNewCar[] = [];
  let brandCount = 0;
  let newCarCount = 0;
  let error = false;
  try {
    const brandId = await resolveBrandId(brandName);
    if (brandId) {
      const [vehicleData, newCarData] = await Promise.all([
        getVehicles({ brandId, status: "AVAILABLE", limit: 24 }),
        getNewCars({ brand: brandName }),
      ]);
      displayCars = (vehicleData.items ?? []).map(mapVehicle);
      brandCount = vehicleData.meta?.total ?? displayCars.length;
      const newCarsRaw = Array.isArray(newCarData) ? newCarData : (newCarData.cars ?? []);
      newCars = newCarsRaw.filter((c) => c.brandName?.toLowerCase() === brandName.toLowerCase());
      newCarCount = newCars.length;
    }
  } catch {
    error = true;
  }
  void getBrands;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">

      {/* Brand hero */}
      <section className="bg-[hsl(var(--color-bg))] text-[hsl(var(--color-content))]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20">
          <nav className="text-sm text-[hsl(var(--color-content-muted))] mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[hsl(var(--color-primary-strong))] transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-[hsl(var(--color-content))]">{brandName}</span>
          </nav>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Certified{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--color-primary-strong))] to-[hsl(var(--color-info))]">
              {brandName}
            </span>{" "}
            Cars
          </h1>
          <p className="mt-4 text-lg text-[hsl(var(--color-content-muted))] max-w-2xl">
            {brandCount > 0
              ? `${brandCount} inspected ${brandName} vehicles available with transparent pricing.`
              : `Fresh ${brandName} stock arriving daily — check the full showroom meanwhile.`}
          </p>
        </div>
      </section>

      {/* Car grid */}
      <section className="max-w-7xl mx-auto w-full px-6 lg:px-12 py-16" aria-label={`${brandName} listings`}>
        {renderVehicleGrid({
          brandName,
          error,
          newCars,
          displayCars,
          brandCount,
          newCarCount,
        })}

        {/* Other brands */}
        <div className="mt-16">
          <h2 className="text-xl font-bold text-content mb-6">Browse other brands</h2>
          <div className="flex flex-wrap gap-2">
            {BRAND_SLUGS.filter((b) => b !== slug).map((b) => (
              <Link
                key={b}
                href={`/brands/${b}`}
                className="px-4 py-2 rounded-full border border-line bg-card text-sm font-semibold text-content-muted hover:border-[hsl(var(--color-primary))]/60 hover:text-[hsl(var(--color-primary-strong))] transition-colors"
              >
                {titleCase(b)}
              </Link>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}