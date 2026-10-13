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

import { getVehicles, resolveImage } from "@/app/lib/nest-public";

/* -------------------------------------------------------------------------- */
/*                                   DATA                                     */
/* -------------------------------------------------------------------------- */

const stats = [
  {
    value: "120+",
    label: "Inspection checkpoints",
  },
  {
    value: "94%",
    label: "Typical battery health",
  },
  {
    value: "7 Days",
    label: "Easy return window",
  },
  {
    value: "24/7",
    label: "Buyer support",
  },
];

const perks = [
  {
    icon: ShieldCheck,
    title: "Certified Vehicles",
    description:
      "Every listed EV goes through a comprehensive inspection before it reaches the showroom.",
  },
  {
    icon: BatteryFull,
    title: "Battery Health Verified",
    description:
      "Understand battery condition, range retention and charging performance before you buy.",
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
    label: "Running cost / km",
    ev: "≈ ₹1.5",
    petrol: "≈ ₹7+",
  },
  {
    label: "Annual maintenance",
    ev: "Lower",
    petrol: "Higher",
  },
  {
    label: "20,000 km energy cost",
    ev: "≈ ₹9,000",
    petrol: "≈ ₹36,000",
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
            <div className="absolute bottom-4 right-6 h-2 w-12 rounded-full bg-[#141a21]0" />

            {/* Wheels */}
            <div className="absolute -bottom-5 left-8 h-11 w-11 rounded-full border-4 border-slate-900 bg-[#141a21]0" />
            <div className="absolute -bottom-5 right-8 h-11 w-11 rounded-full border-4 border-slate-900 bg-[#141a21]0" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-4 text-xs font-semibold text-slate-400">
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

export default async function ElectricPage() {
  const featuredCars = await fetchElectricCars();
  return (
    <div className="bg-glass-scene min-h-screen flex flex-col font-sans text-white">

      {/* ------------------------------------------------------------------ */}
      {/* HERO                                                               */}
      {/* ------------------------------------------------------------------ */}

      <main className="flex-1">
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
                  className="mx-auto mt-6 max-w-3xl text-5xl font-extrabold leading-[1.03] tracking-tight text-white sm:text-6xl lg:mx-0 lg:text-7xl animate-rise rise-delay-1"
                >
                  Buy a certified{" "}
                  <span className="bg-gradient-to-r from-[#FFC700] to-yellow-500 bg-clip-text text-transparent">
                    electric car
                  </span>{" "}
                  with confidence.
                </h1>

                <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 lg:mx-0 animate-rise rise-delay-2">
                  Verified battery health, transparent pricing and doorstep
                  delivery. Find a pre-owned EV that fits your lifestyle and
                  budget.
                </p>

                {/* CTA */}
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                  <Link
                    href="/cars?fuel=electric"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFC700] to-yellow-500 px-7 py-4 font-semibold text-[#15130a] shadow-lg shadow-amber-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    Explore EVs
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </Link>

                  <Link
                    href="/cars"
                    className="inline-flex items-center justify-center gap-2 rounded-xl glass-subtle px-7 py-4 font-semibold text-slate-200 transition-all hover:bg-white/[0.07] backdrop-blur-md"
                  >
                    View All Cars
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </div>

                {/* Trust points */}
                <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                  {[
                    "120+ Point Inspection",
                    "Battery Health Report",
                    "Warranty Options",
                    "Doorstep Delivery",
                  ].map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-2 rounded-full glass-subtle px-3.5 py-2 text-xs font-medium text-slate-400"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Hero vehicle showcase */}
              <div className="relative">
                <div className="glass-strong relative overflow-hidden rounded-[2rem] p-4 shadow-2xl shadow-black/50">
                  <div className="absolute right-6 top-6 z-10 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-emerald-700 shadow-sm backdrop-blur">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Battery Verified
                  </div>

                  <VehicleVisual
                    brand="Tata"
                    model="Nexon EV"
                    gradient="from-[#1d232b] via-[#161b21] to-sky-50"
                  />

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                          Featured EV
                        </p>
                        <h2 className="mt-1 text-2xl font-extrabold text-white">
                          Tata Nexon EV
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">
                          2024 • Fearless+ • Automatic
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-extrabold text-white">
                          ₹14.25 L
                        </p>
                        <p className="text-xs text-slate-400">
                          EMI from ₹23,499/mo
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-emerald-50 px-3 py-3 text-center">
                        <BatteryFull
                          size={17}
                          className="mx-auto text-emerald-400"
                        />
                        <p className="mt-1 text-sm font-bold text-emerald-700">
                          94%
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Battery
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#141a21] px-3 py-3 text-center">
                        <Gauge
                          size={17}
                          className="mx-auto text-slate-400"
                        />
                        <p className="mt-1 text-sm font-bold text-slate-200">
                          421 km
                        </p>
                        <p className="text-[10px] text-slate-400">Range</p>
                      </div>

                      <div className="rounded-xl bg-[#141a21] px-3 py-3 text-center">
                        <MapPin
                          size={17}
                          className="mx-auto text-slate-400"
                        />
                        <p className="mt-1 text-sm font-bold text-slate-200">
                          Delhi
                        </p>
                        <p className="text-[10px] text-slate-400">Location</p>
                      </div>
                    </div>

                    <Link
                      href="/cars"
                      className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      View Vehicle
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-14 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="glass rounded-2xl px-5 py-5 text-center"
                >
                  <p className="text-2xl font-extrabold text-emerald-400 sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
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
              <h2 className="mt-1 text-2xl font-bold text-white">
                What are you looking for?
              </h2>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
              {/* Search */}
              <div className="flex items-center gap-3 rounded-xl bg-white/[0.07] backdrop-blur-md px-4 py-3.5 ring-1 ring-white/10">
                <Search
                  size={19}
                  className="shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  placeholder="Search brand or model"
                  aria-label="Search brand or model"
                  className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-400"
                />
              </div>

              <select
                aria-label="Budget"
                className="rounded-xl bg-white/[0.07] backdrop-blur-md px-4 py-3.5 text-sm font-medium text-slate-200 outline-none ring-1 ring-white/10"
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
                className="rounded-xl bg-white/[0.07] backdrop-blur-md px-4 py-3.5 text-sm font-medium text-slate-200 outline-none ring-1 ring-white/10"
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
                className="rounded-xl bg-white/[0.07] backdrop-blur-md px-4 py-3.5 text-sm font-medium text-slate-200 outline-none ring-1 ring-white/10"
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700"
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
                className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
              >
                Popular EVs ready for delivery
              </h2>
              <p className="mt-3 max-w-2xl text-slate-400">
                Certified pre-owned electric vehicles with transparent
                condition reports and verified battery health.
              </p>
            </div>

            <Link
              href="/cars?fuel=electric"
              className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800"
            >
              View all EVs
              <ArrowRight size={17} />
            </Link>
          </div>

          {featuredCars.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line bg-card px-6 py-16 text-center md:col-span-2 lg:col-span-3">
              <BatteryFull
                size={36}
                className="mx-auto mb-3 text-content-faint"
                aria-hidden="true"
              />
              <p className="text-base font-bold text-content">
                No electric vehicles in stock right now
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-content-muted">
                We only list what is actually in our inventory. Browse all
                vehicles, or check back as new EVs arrive.
              </p>
              <Link
                href="/cars"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Browse all cars
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredCars.map((car) => (
                <article
                  key={car.id}
                  className="glass-strong group overflow-hidden rounded-3xl p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50"
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
                        gradient="from-[#121212] via-[#141a21] to-[#0b0e12]"
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
                        <h3 className="text-lg font-bold text-white">
                          {car.brand} {car.model}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {car.year}
                          {car.variant ? ` · ${car.variant}` : ""}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-extrabold text-white">
                          ₹{car.price.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-[#141a21] px-3 py-2 text-slate-400">
                        {car.mileage.toLocaleString("en-IN")} km
                      </div>
                      <div className="rounded-lg bg-[#141a21] px-3 py-2 text-slate-400">
                        Electric
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <MapPin size={13} />
                        {car.city || "—"}
                      </span>
                    </div>

                    <Link
                      href={`/cars/${car.id}`}
                      className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition group-hover:bg-emerald-600"
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
                Why GreenDrive
              </span>

              <h2
                id="why-title"
                className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
              >
                Buying an EV shouldn&apos;t involve guesswork.
              </h2>

              <p className="mt-4 text-slate-400">
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
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFC700] to-yellow-500 text-[#15130a] shadow-lg shadow-amber-500/25">
                    <perk.icon size={22} aria-hidden="true" />
                  </span>

                  <h3 className="mt-5 text-lg font-bold text-white">
                    {perk.title}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
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
                  className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
                >
                  Know what&apos;s under the hood.
                </h2>

                <p className="mt-5 text-lg leading-relaxed text-slate-400">
                  Battery condition is one of the most important factors when
                  buying a pre-owned EV. GreenDrive puts battery information
                  front and centre.
                </p>

                <div className="mt-8 space-y-4">
                  {[
                    "Battery health percentage",
                    "Estimated range retention",
                    "Charging performance",
                    "Warranty and protection information",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 text-sm font-semibold text-slate-200"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-400">
                        <Check size={14} />
                      </span>
                      {item}
                    </div>
                  ))}
                </div>

                <Link
                  href="/electric"
                  className="mt-8 inline-flex items-center gap-2 font-bold text-emerald-700 hover:text-emerald-800"
                >
                  Learn about battery health
                  <ArrowRight size={17} />
                </Link>
              </div>

              {/* Battery dashboard */}
              <div className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#FFC700]/5 via-[var(--color-card)] to-sky-500/5 p-8 sm:p-12">
                <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" />

                <div className="relative w-full max-w-sm rounded-3xl bg-[var(--color-card)] p-6 shadow-2xl shadow-black/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Battery report
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-white">
                        Tata Nexon EV
                      </h3>
                    </div>

                    <BatteryFull
                      size={28}
                      className="text-emerald-500"
                    />
                  </div>

                  <div className="mt-8 text-center">
                    <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-full border-[14px] border-emerald-500/20">
                      <div className="absolute inset-0 rounded-full border-[14px] border-transparent border-t-emerald-500 border-r-emerald-500" />

                      <div>
                        <p className="text-4xl font-extrabold text-white">
                          94%
                        </p>
                        <p className="mt-1 text-xs font-semibold text-emerald-400">
                          Excellent
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 space-y-3">
                    <div className="flex items-center justify-between rounded-xl bg-[#141a21] px-4 py-3">
                      <span className="text-xs text-slate-400">
                        Range retention
                      </span>
                      <span className="text-sm font-bold text-white">
                        92%
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-[#141a21] px-4 py-3">
                      <span className="text-xs text-slate-400">
                        Battery condition
                      </span>
                      <span className="text-sm font-bold text-emerald-400">
                        Excellent
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-[#141a21] px-4 py-3">
                      <span className="text-xs text-slate-400">
                        Report status
                      </span>
                      <span className="flex items-center gap-1 text-sm font-bold text-emerald-400">
                        <Check size={14} />
                        Verified
                      </span>
                    </div>
                  </div>
                </div>
              </div>
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
              className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
            >
              EV vs Petrol — side by side
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              Lower running costs are one of the biggest reasons buyers are
              making the switch to electric.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* EV */}
            <div className="glass-strong rounded-3xl border-t-4 border-emerald-500 p-7">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFC700] to-yellow-500 text-[#15130a]">
                  <Zap size={20} />
                </span>

                <div>
                  <h3 className="text-lg font-bold text-white">
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
                    <span className="text-sm text-slate-400">
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
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#1d232b] text-slate-400">
                  <Gauge size={20} />
                </span>

                <div>
                  <h3 className="text-lg font-bold text-white">
                    Petrol
                  </h3>
                  <p className="text-xs font-semibold text-slate-400">
                    Conventional ownership
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-2.5">
                {comparisonRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 rounded-xl bg-[#161b21]/70 px-4 py-3.5"
                  >
                    <span className="text-sm text-slate-400">
                      {row.label}
                    </span>

                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                      <X size={15} className="text-slate-400" />
                      {row.petrol}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">
            *Illustrative estimates. Actual running costs vary by vehicle,
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
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 px-6 py-14 text-center sm:px-12">
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[#FFC700]/10 blur-3xl" />

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
                Browse certified pre-owned EVs with verified battery health,
                transparent pricing and flexible finance options.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/cars?fuel=electric"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFC700] to-emerald-500 px-8 py-4 font-bold text-[#15130a] shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:shadow-xl"
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
      </main>

    </div>
  );
}
