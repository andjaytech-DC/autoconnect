import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  BatteryFull,
  Check,
  ChevronRight,
  Gauge,
  IndianRupee,
  Leaf,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  Wrench,
  X,
  Zap,
} from "lucide-react";

import { getNewCars, getVehicles, resolveImage } from "@/app/lib/nest-public";
import type { NestNewCar } from "@/app/lib/nest-public";
import EmptyState from "@/app/components/ui/EmptyState";

/* -------------------------------------------------------------------------- */
/*                                   DATA                                     */
/* -------------------------------------------------------------------------- */

const perks = [
  {
    icon: ShieldCheck,
    title: "Certified Vehicles",
    description:
      "Every listed EV goes through a comprehensive inspection before it reaches the showroom.",
  },
  {
    icon: BatteryFull,
    title: "Know the Battery",
    description:
      "Ask for battery condition, range retention and charging details before you buy.",
  },
  {
    icon: IndianRupee,
    title: "Transparent Pricing",
    description:
      "Clear vehicle pricing with no confusing dealer markups or hidden surprises.",
  },
  {
    icon: Wrench,
    title: "Warranty Options",
    description:
      "Protection plans and support designed specifically for pre-owned electric vehicles.",
  },
];

const comparisonRows = [
  {
    label: "Annual maintenance",
    ev: "Lower",
    petrol: "Higher",
  },
  {
    label: "Tailpipe emissions",
    ev: "Zero",
    petrol: "CO₂ + NOx",
  },
  {
    label: "Torque delivery",
    ev: "Instant",
    petrol: "Gradual",
  },
  {
    label: "Driving experience",
    ev: "Quiet & smooth",
    petrol: "Engine noise",
  },
];

/* -------------------------------------------------------------------------- */
/*                              VEHICLE VISUAL                                */
/* -------------------------------------------------------------------------- */

function VehicleVisual({
  brand,
  model,
  gradient,
}: {
  brand: string;
  model: string;
  gradient: string;
}) {
  return (
    <div
      className={`relative h-52 overflow-hidden rounded-2xl bg-gradient-to-br ${gradient}`}
    >
      {/* Decorative glow */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/[0.07] blur-2xl" />
      <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-emerald-300/[0.08] blur-2xl" />

      {/* Vehicle silhouette */}
      <div className="absolute inset-x-8 bottom-10">
        <div className="relative mx-auto max-w-[280px]">
          {/* Roof */}
          <div className="mx-auto h-12 w-40 rounded-t-[5rem] border-4 border-slate-800 bg-slate-700/10" />

          {/* Body */}
          <div className="relative h-20 rounded-[3rem_3rem_1.25rem_1.25rem] border-4 border-slate-800 bg-slate-800 shadow-2xl">
            {/* Windows */}
            <div className="absolute left-10 top-2 h-9 w-24 rounded-[2rem_2rem_0.5rem_0.5rem] bg-slate-300/80" />

            {/* Headlight */}
            <div className="absolute right-3 top-8 h-3 w-6 rounded-full bg-emerald-300 shadow-lg shadow-emerald-300/70" />

            {/* Front detail */}
            <div className="absolute bottom-4 right-6 h-2 w-12 rounded-full bg-slate-700" />

            {/* Wheels */}
            <div className="absolute -bottom-5 left-8 h-11 w-11 rounded-full border-4 border-slate-900 bg-slate-700" />
            <div className="absolute -bottom-5 right-8 h-11 w-11 rounded-full border-4 border-slate-900 bg-slate-700" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-4 text-xs font-semibold text-slate-200">
        {brand} {model}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  PAGE                                      */
/* -------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

/**
 * Real EV inventory from the backend.
 *
 * This page previously rendered three hardcoded cars with invented prices,
 * EMI, odometer readings, range and battery health. None of that existed in
 * the database, so it is replaced with a real `fuel=ELECTRIC` query and an
 * honest empty state. Fields the backend does not store (battery health,
 * claimed range) are simply not shown rather than invented.
 */
async function fetchElectricCars(): Promise<
  {
    id: number;
    brand: string;
    model: string;
    variant: string | null;
    year: number;
    price: number;
    mileage: number;
    city: string;
    image: string | null;
    isCertified: boolean;
  }[]
> {
  try {
    const data = await getVehicles({ fuel: "ELECTRIC", limit: 3 });
    return (data.items ?? []).map((v) => ({
      id: v.id,
      brand: v.brand?.name ?? "",
      model: v.title,
      variant: null,
      year: v.year,
      price: v.price,
      mileage: v.mileage,
      city: v.city ?? "",
      image: resolveImage(Array.isArray(v.images) ? v.images[0] : null),
      isCertified: v.isCertified,
    }));
  } catch {
    return [];
  }
}

/**
 * Live EV market figures. Every number shown in the stats row comes from the
 * backend; a tile is hidden when its real value is zero, and the whole row is
 * hidden when there is nothing true to say.
 */
async function fetchElectricMarket(): Promise<{
  stats: { value: string; label: string }[];
  spec: NestNewCar | null;
}> {
  const [used, rawNew] = await Promise.all([
    getVehicles({ fuel: "ELECTRIC", limit: 100 }).catch(() => null),
    getNewCars({ electric: "true" }).catch(() => null),
  ]);
  const newCars: NestNewCar[] = Array.isArray(rawNew) ? rawNew : rawNew?.cars ?? [];
  const usedItems = used?.items ?? [];
  const brands = new Set<string>();
  usedItems.forEach((v) => v.brand?.name && brands.add(v.brand.name));
  newCars.forEach((c) => c.brandName && brands.add(c.brandName));
  const cities = new Set(usedItems.map((v) => v.city).filter(Boolean));
  const candidates = [
    { n: used?.meta?.total ?? 0, label: "Pre-owned EVs listed" },
    { n: newCars.length, label: "New EV models" },
    { n: brands.size, label: "EV brands" },
    { n: cities.size, label: cities.size === 1 ? "City with EV listings" : "Cities with EV listings" },
  ];
  return {
    stats: candidates.filter((c) => c.n > 0).map((c) => ({ value: String(c.n), label: c.label })),
    spec: newCars.find((c) => c.batteryCapacityKwh || c.claimedRangeKm) ?? null,
  };
}

export default async function ElectricPage() {
  const [featuredCars, market] = await Promise.all([fetchElectricCars(), fetchElectricMarket()]);
  const { stats, spec } = market;
  const heroCar = featuredCars[0] ?? null;
  return (
    <div className="bg-glass-scene min-h-screen flex flex-col font-sans text-content">

      {/* ------------------------------------------------------------------ */}
      {/* HERO                                                               */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex-1">
        <section
          className="relative overflow-hidden"
          aria-labelledby="electric-hero-title"
        >
          {/* Background decoration */}
          <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-32 top-10 h-96 w-96 rounded-full bg-sky-200/30 blur-3xl" />

          <div className="relative mx-auto w-full max-w-7xl px-6 py-16 lg:px-12 lg:py-20">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
              {/* Hero copy */}
              <div className="text-center lg:text-left">
                <span className="inline-flex items-center gap-2 rounded-full glass-subtle px-4 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 animate-rise">
                  <Sparkles
                    size={14}
                    className="text-emerald-500"
                    aria-hidden="true"
                  />
                  India&apos;s trusted pre-owned EV marketplace
                </span>

                <h1
                  id="electric-hero-title"
                  className="mx-auto mt-6 max-w-3xl text-5xl font-extrabold leading-[1.03] tracking-tight text-content sm:text-6xl lg:mx-0 lg:text-7xl animate-rise rise-delay-1"
                >
                  Buy a certified{" "}
                  <span className="bg-gradient-to-r from-[hsl(var(--color-primary))] to-yellow-500 bg-clip-text text-transparent">
                    electric car
                  </span>{" "}
                  with confidence.
                </h1>

                <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-content-muted lg:mx-0 animate-rise rise-delay-2">
                  Transparent pricing and clear vehicle details. Find an EV that
                  fits your lifestyle and budget.
                </p>

                {/* CTA */}
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                  <Link
                    href="/cars?fuel=electric"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[hsl(var(--color-primary))] to-yellow-500 px-7 py-4 font-semibold text-[#15130a] shadow-lg shadow-amber-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    Explore EVs
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </Link>

                  <Link
                    href="/cars"
                    className="inline-flex items-center justify-center gap-2 rounded-xl glass-subtle px-7 py-4 font-semibold text-content transition-all hover:bg-card"
                  >
                    View All Cars
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </div>

                {/* Trust points */}
                <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                  {[
                    "Book an inspection",
                    "Transparent pricing",
                    "Warranty Options",
                    "Doorstep Delivery",
                  ].map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-2 rounded-full glass-subtle px-3.5 py-2 text-xs font-medium text-content-muted"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Hero vehicle showcase — real inventory only; never invented figures. */}
              <div className="relative">
                {heroCar ? (
                  <div className="glass-strong relative overflow-hidden rounded-[2rem] p-4 shadow-2xl shadow-black/15">
                    {heroCar.isCertified && (
                      <div className="absolute right-6 top-6 z-10 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-emerald-700 shadow-sm backdrop-blur">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Certified
                      </div>
                    )}

                    {heroCar.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={heroCar.image}
                        alt={`${heroCar.brand} ${heroCar.model}`}
                        className="h-52 w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <VehicleVisual
                        brand={heroCar.brand}
                        model={heroCar.model}
                        gradient="from-[#1d232b] via-[#161b21] to-sky-50"
                      />
                    )}

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                            Featured EV
                          </p>
                          <h2 className="mt-1 text-2xl font-extrabold text-content">
                            {heroCar.brand} {heroCar.model}
                          </h2>
                          <p className="mt-1 text-sm text-content-muted">
                            {heroCar.year}
                            {heroCar.variant ? ` • ${heroCar.variant}` : ""}
                          </p>
                        </div>

                        <p className="text-xl font-extrabold text-content">
                          ₹{heroCar.price.toLocaleString("en-IN")}
                        </p>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-surface-strong px-3 py-3 text-center">
                          <Gauge size={17} className="mx-auto text-content-muted" aria-hidden="true" />
                          <p className="mt-1 text-sm font-bold text-content">
                            {heroCar.mileage.toLocaleString("en-IN")} km
                          </p>
                          <p className="text-[11px] text-content-muted">Driven</p>
                        </div>

                        <div className="rounded-xl bg-surface-strong px-3 py-3 text-center">
                          <MapPin size={17} className="mx-auto text-content-muted" aria-hidden="true" />
                          <p className="mt-1 text-sm font-bold text-content">
                            {heroCar.city || "—"}
                          </p>
                          <p className="text-[11px] text-content-muted">Location</p>
                        </div>
                      </div>

                      <Link
                        href={`/cars/${heroCar.id}`}
                        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-ink-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink-800"
                      >
                        View Vehicle
                        <ChevronRight size={16} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="glass-strong relative overflow-hidden rounded-[2rem] p-8">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <BatteryCharging size={24} aria-hidden="true" />
                    </span>
                    <h2 className="mt-5 text-2xl font-extrabold text-content">
                      Buy an EV with clear information
                    </h2>
                    <ul className="mt-5 space-y-3 text-sm font-medium text-content">
                      {[
                        "Transparent pricing on every listing",
                        "Independent inspection you can book",
                        "Finance options for your purchase",
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-3">
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <Check size={14} aria-hidden="true" />
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/cars?fuel=electric"
                      className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-ink-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink-800"
                    >
                      Browse electric cars
                      <ChevronRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            {stats.length > 0 && (
            <div className="mt-14 flex flex-wrap justify-center gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="glass min-w-[10rem] flex-1 rounded-2xl px-5 py-5 text-center sm:max-w-[16rem]"
                >
                  <p className="text-2xl font-extrabold text-emerald-700 sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-content-muted sm:text-sm">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            )}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* SEARCH                                                           */}
        {/* ---------------------------------------------------------------- */}

        <section className="relative z-10 mx-auto w-full max-w-6xl px-6 lg:px-12">
          <div className="glass-strong rounded-3xl p-5 shadow-xl shadow-slate-900/5 sm:p-7">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                Find your EV
              </p>
              <h2 className="mt-1 text-2xl font-bold text-content">
                What are you looking for?
              </h2>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
              {/* Search */}
              <div className="flex items-center gap-3 rounded-xl bg-card px-4 py-3.5 ring-1 ring-line">
                <Search
                  size={19}
                  className="shrink-0 text-content-muted"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  placeholder="Search brand or model"
                  aria-label="Search brand or model"
                  className="w-full bg-transparent text-sm text-content outline-none placeholder:text-content-faint"
                />
              </div>

              <select
                aria-label="Budget"
                className="rounded-xl bg-card px-4 py-3.5 text-sm font-medium text-content outline-none ring-1 ring-line"
                defaultValue=""
              >
                <option value="" disabled>
                  Budget
                </option>
                <option>Under ₹10 Lakh</option>
                <option>₹10–15 Lakh</option>
                <option>₹15–25 Lakh</option>
                <option>₹25 Lakh+</option>
              </select>

              <select
                aria-label="Range"
                className="rounded-xl bg-card px-4 py-3.5 text-sm font-medium text-content outline-none ring-1 ring-line"
                defaultValue=""
              >
                <option value="" disabled>
                  Range
                </option>
                <option>200+ km</option>
                <option>300+ km</option>
                <option>400+ km</option>
                <option>500+ km</option>
              </select>

              <select
                aria-label="Body type"
                className="rounded-xl bg-card px-4 py-3.5 text-sm font-medium text-content outline-none ring-1 ring-line"
                defaultValue=""
              >
                <option value="" disabled>
                  Body Type
                </option>
                <option>SUV</option>
                <option>Hatchback</option>
                <option>Sedan</option>
                <option>Luxury</option>
              </select>

              <Link
                href="/cars?fuel=electric"
                className="btn btn-primary gap-2 px-6 py-3.5 text-sm font-bold"
              >
                Search
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* FEATURED EVs                                                     */}
        {/* ---------------------------------------------------------------- */}

        <section
          className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-12"
          aria-labelledby="featured-ev-title"
        >
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                Featured inventory
              </span>
              <h2
                id="featured-ev-title"
                className="mt-2 text-3xl font-extrabold tracking-tight text-content sm:text-4xl"
              >
                Popular EVs ready for delivery
              </h2>
              <p className="mt-3 max-w-2xl text-content-muted">
                Electric vehicles listed on Progressive AutoHub, with
                transparent pricing and full vehicle details.
              </p>
            </div>

            <Link
              href="/cars?fuel=electric"
              className="inline-flex min-h-6 items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800"
            >
              View all EVs
              <ArrowRight size={17} />
            </Link>
          </div>

          {featuredCars.length === 0 ? (
            <EmptyState
              icon={BatteryFull}
              title="No electric vehicles in stock right now"
              description="We only list what is actually in our inventory. Browse all vehicles, or check back as new EVs arrive."
              action={
                <Link href="/cars" className="btn btn-primary gap-2">
                  Browse all cars
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              }
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredCars.map((car) => (
                <article
                  key={car.id}
                  className="glass-strong group overflow-hidden rounded-3xl p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/15"
                >
                  <div className="relative">
                    {car.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={car.image}
                        alt={`${car.brand} ${car.model}`}
                        className="aspect-[4/3] w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <VehicleVisual
                        brand={car.brand}
                        model={car.model}
                        gradient="from-ink-950 via-ink-900 to-ink-800"
                      />
                    )}

                    {car.isCertified && (
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold text-emerald-700 shadow-sm backdrop-blur">
                        <Sparkles size={12} />
                        Certified
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-content">
                          {car.brand} {car.model}
                        </h3>
                        <p className="mt-1 text-xs text-content-muted">
                          {car.year}
                          {car.variant ? ` · ${car.variant}` : ""}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-extrabold text-content">
                          ₹{car.price.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-surface-strong px-3 py-2 text-content-muted">
                        {car.mileage.toLocaleString("en-IN")} km
                      </div>
                      <div className="rounded-lg bg-surface-strong px-3 py-2 text-content-muted">
                        Electric
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-content-muted">
                      <span className="flex items-center gap-1.5">
                        <MapPin size={13} />
                        {car.city || "—"}
                      </span>
                    </div>

                    <Link
                      href={`/cars/${car.id}`}
                      className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-ink-900 px-5 py-3 text-sm font-semibold text-white transition group-hover:bg-[hsl(var(--color-primary))] group-hover:text-[hsl(var(--color-primary-foreground))]"
                    >
                      View Details
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* WHY GREENDRIVE                                                   */}
        {/* ---------------------------------------------------------------- */}

        <section
          className="bg-white/30 py-20"
          aria-labelledby="why-title"
        >
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-12">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                Why Progressive AutoHub
              </span>

              <h2
                id="why-title"
                className="mt-2 text-3xl font-extrabold tracking-tight text-content sm:text-4xl"
              >
                Buying an EV shouldn&apos;t involve guesswork.
              </h2>

              <p className="mt-4 text-content-muted">
                We make the important parts of buying a pre-owned EV easier to
                understand.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {perks.map((perk) => (
                <div
                  key={perk.title}
                  className="glass-strong rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-yellow-500 text-[#15130a] shadow-lg shadow-amber-500/25">
                    <perk.icon size={22} aria-hidden="true" />
                  </span>

                  <h3 className="mt-5 text-lg font-bold text-content">
                    {perk.title}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-content-muted">
                    {perk.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* BATTERY HEALTH                                                   */}
        {/* ---------------------------------------------------------------- */}

        <section
          className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-12"
          aria-labelledby="battery-title"
        >
          <div className="glass-strong overflow-hidden rounded-[2rem]">
            <div className="grid lg:grid-cols-2">
              <div className="p-8 sm:p-12 lg:p-14">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                  <BatteryCharging size={15} />
                  EV specialist
                </span>

                <h2
                  id="battery-title"
                  className="mt-6 text-3xl font-extrabold tracking-tight text-content sm:text-4xl"
                >
                  Know what&apos;s under the hood.
                </h2>

                <p className="mt-5 text-lg leading-relaxed text-content-muted">
                  Battery condition is one of the most important factors when
                  buying a pre-owned EV. Here is what to ask about and check
                  before you decide.
                </p>

                <div className="mt-8 space-y-4">
                  {[
                    "Battery health percentage",
                    "Real-world range compared with the claimed range",
                    "Charging speed and charger type",
                    "Battery warranty and what it covers",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 text-sm font-semibold text-content"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check size={14} />
                      </span>
                      {item}
                    </div>
                  ))}
                </div>

                <Link
                  href="/services/inspection"
                  className="mt-8 inline-flex min-h-6 items-center gap-2 font-bold text-emerald-700 hover:text-emerald-800"
                >
                  Book an inspection
                  <ArrowRight size={17} />
                </Link>
              </div>

              {/* Real spec sheet — values come from the new-car record, never invented */}
              {spec && (
                <div className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[hsl(var(--color-primary))]/5 via-[hsl(var(--color-card))] to-sky-500/5 p-8 sm:p-12">
                  <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" aria-hidden="true" />
                  <div className="relative w-full max-w-sm rounded-3xl bg-[hsl(var(--color-card))] p-6 shadow-2xl shadow-black/15">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                          Battery &amp; charging
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-content">
                          {spec.brandName} {spec.model}
                        </h3>
                      </div>
                      <BatteryFull size={28} className="text-emerald-600" aria-hidden="true" />
                    </div>
                    <dl className="mt-6 space-y-3">
                      {[
                        spec.batteryCapacityKwh ? ["Battery capacity", `${spec.batteryCapacityKwh} kWh`] : null,
                        spec.claimedRangeKm ? ["Claimed range", `${spec.claimedRangeKm} km`] : null,
                        spec.chargingType ? ["Charging type", spec.chargingType] : null,
                        spec.fastCharging != null ? ["Fast charging", spec.fastCharging ? "Supported" : "Not supported"] : null,
                      ]
                        .filter((r): r is string[] => r !== null)
                        .map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between rounded-xl bg-surface-strong px-4 py-3">
                            <dt className="text-xs text-content-muted">{label}</dt>
                            <dd className="text-sm font-bold text-content">{value}</dd>
                          </div>
                        ))}
                    </dl>
                    <p className="mt-4 text-xs text-content-muted">
                      Manufacturer-claimed figures for this model. Real-world range varies.
                    </p>
                    {spec.slug && (
                      <Link
                        href={`/new-cars/${encodeURIComponent(spec.brandName)}/${encodeURIComponent(spec.slug)}`}
                        className="mt-3 inline-flex min-h-6 items-center gap-1.5 text-sm font-bold text-emerald-700 hover:text-emerald-800"
                      >
                        View this model <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* EV VS PETROL                                                     */}
        {/* ---------------------------------------------------------------- */}

        <section
          className="mx-auto w-full max-w-7xl px-6 pb-20 lg:px-12"
          aria-labelledby="comparison-title"
        >
          <div className="mb-12 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              The numbers
            </span>

            <h2
              id="comparison-title"
              className="mt-2 text-3xl font-extrabold tracking-tight text-content sm:text-4xl"
            >
              EV vs Petrol — side by side
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-content-muted">
              Lower running costs are one of the biggest reasons buyers are
              making the switch to electric.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* EV */}
            <div className="glass-strong rounded-3xl border-t-4 border-emerald-500 p-7">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-yellow-500 text-[#15130a]">
                  <Zap size={20} />
                </span>

                <div>
                  <h3 className="text-lg font-bold text-content">
                    Electric
                  </h3>
                  <p className="text-xs font-semibold text-emerald-700">
                    Lower ownership cost
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-2.5">
                {comparisonRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 rounded-xl bg-emerald-50/70 px-4 py-3.5"
                  >
                    <span className="text-sm text-content-muted">
                      {row.label}
                    </span>

                    <span className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                      <Check size={15} />
                      {row.ev}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Petrol */}
            <div className="glass rounded-3xl p-7">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-surface-strong text-content-muted">
                  <Gauge size={20} />
                </span>

                <div>
                  <h3 className="text-lg font-bold text-content">
                    Petrol
                  </h3>
                  <p className="text-xs font-semibold text-content-muted">
                    Conventional ownership
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-2.5">
                {comparisonRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 rounded-xl bg-surface-strong px-4 py-3.5"
                  >
                    <span className="text-sm text-content-muted">
                      {row.label}
                    </span>

                    <span className="flex items-center gap-2 text-sm font-semibold text-content-muted">
                      <X size={15} className="text-content-muted" />
                      {row.petrol}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-content-muted">
            General comparison only. Actual running costs vary by vehicle,
            electricity tariff, fuel price, driving style and location.
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* FINAL CTA                                                        */}
        {/* ---------------------------------------------------------------- */}

        <section
          className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-12"
          aria-labelledby="cta-title"
        >
          <div className="relative overflow-hidden rounded-[2rem] bg-ink-900 px-6 py-14 text-center sm:px-12">
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[hsl(var(--color-primary))]/10 blur-3xl" />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                <Leaf size={14} />
                Make the switch
              </span>

              <h2
                id="cta-title"
                className="mx-auto mt-6 max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-5xl"
              >
                Your next car could cost less to run.
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
                Browse electric cars with transparent pricing and flexible
                finance options.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/cars?fuel=electric"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[hsl(var(--color-primary))] to-emerald-500 px-8 py-4 font-bold text-[#15130a] shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Browse Electric Cars
                  <ArrowUpRight size={18} />
                </Link>

                <Link
                  href="/finance"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-8 py-4 font-bold text-white backdrop-blur transition hover:bg-white/15"
                >
                  Calculate EMI
                  <Wallet size={18} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
