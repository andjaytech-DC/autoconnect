import type { Metadata } from "next";
import Link from "next/link";
import {
  getNewCars,
  resolveImage,
  type NestNewCar,
} from "@/app/lib/nest-public";
import { Fuel, Gauge, Cog, Zap, Battery, Car, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

async function findCar(brand: string, slug: string): Promise<NestNewCar | null> {
  try {
    const raw = await getNewCars({ brand });
    const all = Array.isArray(raw) ? raw : (raw.cars ?? []);
    const wanted = slug.toLowerCase();
    return (
      all.find(
        (c) =>
          (c.slug ?? `${c.model}-${c.variant ?? "base"}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")) === wanted,
      ) ??
      all.find(
        (c) => (c.slug ?? "").toLowerCase().startsWith(wanted),
      ) ??
      null
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("404")) return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string; slug: string }>;
}): Promise<Metadata> {
  const { brand, slug } = await params;
  let car: NestNewCar | null = null;
  try {
    car = await findCar(decodeURIComponent(brand), decodeURIComponent(slug));
  } catch {
    return { title: "Unable to load car — Progressive AutoHub", robots: { index: false } };
  }
  if (!car) return { title: "Car not found — Progressive AutoHub", robots: { index: false } };
  const price = car.exShowroomPrice ?? car.price ?? 0;
  return {
    title: `${car.brandName} ${car.model} ${car.variant} — Progressive AutoHub`,
    description: `${car.fuel ?? car.fuelType ?? ""} · ${car.transmission ?? ""} · ₹${price.toLocaleString("en-IN")} ex-showroom`,
  };
}

export default async function NewCarDetailPage({
  params,
}: {
  params: Promise<{ brand: string; slug: string }>;
}) {
  const { brand, slug } = await params;

  let car: NestNewCar | null = null;
  let error = false;
  try {
    car = await findCar(decodeURIComponent(brand), decodeURIComponent(slug));
  } catch {
    error = true;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col font-sans text-white">
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-20 lg:px-12 text-center">
          <h1 className="text-xl font-bold">Unable to load car</h1>
          <p className="mt-2 text-sm text-slate-400">Please check your connection and retry.</p>
          <Link href="/new-cars" className="mt-6 inline-block rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
            Back to New Cars
          </Link>
        </main>
      </div>
    );
  }
  if (!car) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col font-sans text-white">
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-20 lg:px-12 text-center">
          <h1 className="text-xl font-bold">Car not found</h1>
          <Link href="/new-cars" className="mt-6 inline-block rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
            Back to New Cars
          </Link>
        </main>
      </div>
    );
  }

  const price = car.exShowroomPrice ?? car.price ?? 0;
  const onRoad = car.onRoadPrice ?? null;
  const fuel = car.fuel ?? car.fuelType ?? "—";
  const imageUrl = resolveImage(car.imageUrl ?? (Array.isArray(car.images) ? car.images[0] : null));

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col font-sans text-white">
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#161b22] via-[#0d1117] to-[#0d1117]" />

        {/* Subtle background photograph sliding */}
        <div className="absolute inset-0 opacity-[0.04] overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920')] bg-cover bg-center animate-[slide_30s_linear_infinite]" />
        </div>

        {/* Subtle glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full" aria-hidden="true" />

        <div className="relative mx-auto max-w-7xl px-6 pt-12 pb-8 lg:px-12 lg:pt-16 lg:pb-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-8" aria-label="Breadcrumb">
            <Link href="/new-cars" className="hover:text-slate-300 transition-colors">New Cars</Link>
            <span>/</span>
            <span className="text-slate-400">{car.brandName}</span>
            <span>/</span>
            <span className="text-slate-300">{car.model}</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            {/* Vehicle image - oversized covering hero */}
            <div className="relative">
              <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-[#161b22] border border-white/5">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={`${car.brandName} ${car.model}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Car size={64} />
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle info */}
            <div>
              <span className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full mb-4">
                {car.isElectric ? <Zap size={12} /> : <Fuel size={12} />}
                {car.isElectric ? "Electric" : "New"}
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                {car.brandName} {car.model}
              </h1>
              <p className="mt-2 text-lg text-slate-400">{car.variant}</p>
              <p className="mt-4 text-4xl font-extrabold text-white">
                ₹{price.toLocaleString("en-IN")}
                <span className="text-sm font-normal text-slate-500 ml-2">ex-showroom</span>
              </p>
              {onRoad && (
                <p className="mt-1 text-sm text-slate-500">
                  On-road: <span className="text-slate-300 font-medium">₹{onRoad.toLocaleString("en-IN")}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SPECS ─── */}
      <section className="relative mx-auto w-full max-w-7xl px-6 py-10 lg:px-12">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { icon: Fuel, label: "Fuel", value: fuel },
            { icon: Cog, label: "Transmission", value: car.transmission ?? "—" },
            { icon: Gauge, label: "Mileage", value: car.mileageKmpl ? `${car.mileageKmpl} kmpl` : "—" },
            { icon: Car, label: "Body", value: car.bodyType ?? "—" },
            { icon: Zap, label: "Engine", value: car.engine ?? "—" },
            ...(car.isElectric
              ? [{ icon: Battery, label: "Range", value: car.claimedRangeKm ? `${car.claimedRangeKm} km` : "—" }]
              : []),
          ].map((spec) => {
            const Icon = spec.icon;
            return (
              <div key={spec.label} className="rounded-xl border border-white/5 bg-[#161b22] p-4">
                <Icon size={18} className="text-emerald-400 mb-2" />
                <p className="text-xs text-slate-500">{spec.label}</p>
                <p className="font-semibold text-sm text-white mt-0.5">{spec.value}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      {(car.features ?? []).length > 0 && (
        <section className="relative mx-auto w-full max-w-7xl px-6 pb-10 lg:px-12">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Key Features</h2>
          <div className="flex flex-wrap gap-2">
            {(car.features ?? []).map((f) => (
              <span key={f} className="px-3 py-1.5 bg-[#161b22] border border-white/5 rounded-lg text-sm text-slate-300">
                {f}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ─── EV SPECS ─── */}
      {car.isElectric && (
        <section className="relative mx-auto w-full max-w-7xl px-6 pb-10 lg:px-12">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Electric Specifications</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Battery", value: car.batteryCapacityKwh ? `${car.batteryCapacityKwh} kWh` : "—" },
              { label: "Range", value: car.claimedRangeKm ? `${car.claimedRangeKm} km` : "—" },
              { label: "Charging", value: car.chargingType ?? "—" },
              { label: "Fast Charging", value: car.fastCharging ? "Yes" : "No" },
            ].map((spec) => (
              <div key={spec.label} className="rounded-xl border border-white/5 bg-[#161b22] p-4">
                <p className="text-xs text-slate-500">{spec.label}</p>
                <p className="font-semibold text-sm text-white mt-0.5">{spec.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── CTA ─── */}
      <section className="relative mx-auto w-full max-w-7xl px-6 pb-16 lg:px-12">
        <div className="rounded-2xl border border-white/5 bg-[#161b22] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Interested in the {car.brandName} {car.model}?</h3>
            <p className="text-sm text-slate-400 mt-1">Get in touch with our team for test drive and booking.</p>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            Contact Us <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
