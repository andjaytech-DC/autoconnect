
import Link from "next/link";
import { Search, SearchX, MapPin, Car, ShieldCheck, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

import DealerCard from "@/app/components/dealerCard";
import { getDealers, mapDealer, type UiDealer } from "@/app/lib/nest-public";
import { isSignedIn } from "@/app/server/authz";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Find Dealers & Showrooms — Progressive AutoHub",
  description:
    "Find certified Progressive AutoHub dealers and showrooms across India. Explore locations, inventory, services, ratings and contact details.",
  keywords: [
    "Progressive AutoHub dealers",
    "car dealers India",
    "car showrooms",
    "certified car dealers",
    "used car dealers",
    "dealer network",
    "car showroom near me",
  ],
};

interface DealersPageProps {
  searchParams: Promise<{
    city?: string;
    q?: string;
  }>;
}

/** Build a shareable dealers URL while preserving the active search. */
function dealersHref(city: string, q: string): string {
  const params = new URLSearchParams();
  if (city && city !== "All Cities") params.set("city", city);
  if (q.trim()) params.set("q", q.trim());
  const queryString = params.toString();
  return queryString ? `/dealers?${queryString}` : "/dealers";
}

export default async function DealersPage({ searchParams }: DealersPageProps) {
  const { city = "All Cities", q = "" } = await searchParams;

  // Dealer directory straight from NestJS — no static mocks, no BFF.
  // The listing itself is public; contact details are not (see mapDealer).
  let allDealers: UiDealer[] = [];
  let error = false;
  const contactAvailable = await isSignedIn();
  try {
    const rows = await getDealers();
    allDealers = (rows ?? []).map((d) => mapDealer(d, { canSeeContact: contactAvailable }));
  } catch {
    error = true;
  }

  let filteredDealers = allDealers;
  if (city && city !== "All Cities") {
    filteredDealers = filteredDealers.filter((dealer) => dealer.city === city);
  }
  if (q.trim()) {
    const term = q.trim().toLowerCase();
    filteredDealers = filteredDealers.filter(
      (dealer) =>
        dealer.name.toLowerCase().includes(term) ||
        dealer.city.toLowerCase().includes(term) ||
        dealer.state.toLowerCase().includes(term),
    );
  }

  const totalDealers = allDealers.length;
  const totalCities = new Set(allDealers.map((dealer) => dealer.city).filter(Boolean)).size;
  const totalInventory = allDealers.reduce((total, dealer) => total + dealer.carsAvailable, 0);

  const chipClass = (active: boolean) =>
    [
      "inline-flex items-center justify-center",
      "px-4 py-2.5",
      "rounded-full",
      "text-sm font-semibold",
      "border",
      "transition-all duration-200",
      "focus:outline-none focus:ring-2",
      "focus:ring-[hsl(var(--color-focus))] focus:ring-offset-2",
      active
        ? "bg-[hsl(var(--color-primary))] border-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))] shadow-md shadow-amber-500/25"
        : "bg-card border-line text-content-muted hover:border-[hsl(var(--color-primary)/0.6)] hover:text-[hsl(var(--color-primary-strong))] hover:bg-[hsl(var(--color-primary)/0.06)]",
    ].join(" ");

  const hasFilters =
    city !== "All Cities" || q.trim().length > 0;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">


      {/* =========================================================
          HERO
      ========================================================== */}
      <section className="relative overflow-hidden bg-[hsl(var(--color-ink-900))] text-white">

        {/* Decorative background */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute top-20 right-0 h-72 w-72 rounded-full bg-emerald-400/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-24 lg:pt-20 lg:pb-28">

          <div className="max-w-4xl mx-auto text-center">

            {/* Badge */}
            <span className="inline-flex items-center gap-2 bg-[hsl(var(--color-primary)/0.12)] border border-[hsl(var(--color-primary)/0.4)] text-[hsl(var(--color-primary))] text-xs font-bold uppercase tracking-[0.18em] px-4 py-2 rounded-full">
              <MapPin size={14} aria-hidden="true" />
              Progressive AutoHub Network
            </span>

            {/* Heading */}
            <h1 className="mt-7 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08]">
              Find a trusted dealer{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--color-primary))] via-yellow-300 to-yellow-300">
                near you.
              </span>
            </h1>

            {/* Description */}
            <p className="mt-6 text-base sm:text-lg lg:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
              Explore certified showrooms, compare dealer ratings,
              browse available inventory, and connect with a
              Progressive AutoHub dealer in your city.
            </p>

            {/* Search */}
            <form
              action="/dealers"
              method="GET"
              className="mt-10 max-w-3xl mx-auto"
            >
              {city !== "All Cities" && (
                <input
                  type="hidden"
                  name="city"
                  value={city}
                />
              )}

              <div className="relative flex items-center bg-[hsl(var(--color-surface))] rounded-2xl p-2 shadow-2xl shadow-black/20">

                <Search
                  className="absolute left-5 h-5 w-5 text-[hsl(var(--color-content-muted))]"
                  aria-hidden="true"
                />

                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Search dealer, city or state..."
                  className="w-full min-w-0 bg-transparent text-[hsl(var(--color-content))] placeholder:text-[hsl(var(--color-content-faint))] pl-12 pr-28 py-3.5 sm:py-4 text-sm sm:text-base focus:outline-none"
                  aria-label="Search dealers by name, city or state"
                />

                <button
                  type="submit"
                  aria-label="Search dealers"
                  className="absolute right-2 inline-flex items-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl bg-[hsl(var(--color-primary))] hover:brightness-110 text-[hsl(var(--color-primary-foreground))] font-semibold text-sm transition-all shadow-lg shadow-amber-500/25"
                >
                  <Search size={16} aria-hidden="true" />
                  <span className="hidden sm:inline">
                    Search
                  </span>
                </button>
              </div>
            </form>

            {/* Quick stats */}
            <div className="mt-10 grid grid-cols-3 max-w-2xl mx-auto border border-[hsl(var(--color-line))] rounded-2xl overflow-hidden bg-[hsl(var(--color-surface-strong))] backdrop-blur-sm">

              <div className="px-3 py-5 sm:px-6">
                <p className="text-2xl sm:text-3xl font-extrabold text-[hsl(var(--color-content))]">
                  {totalDealers}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-[hsl(var(--color-content-muted))]">
                  Dealers
                </p>
              </div>

              <div className="px-3 py-5 sm:px-6 border-x border-[hsl(var(--color-line))]">
                <p className="text-2xl sm:text-3xl font-extrabold text-[hsl(var(--color-content))]">
                  {totalCities}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-[hsl(var(--color-content-muted))]">
                  Cities
                </p>
              </div>

              <div className="px-3 py-5 sm:px-6">
                <p className="text-2xl sm:text-3xl font-extrabold text-[hsl(var(--color-content))]">
                  {totalInventory}+
                </p>
                <p className="mt-1 text-xs sm:text-sm text-[hsl(var(--color-content-muted))]">
                  Cars Available
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          MAIN
      ========================================================== */}
      <main className="flex-1">

        <section className="max-w-7xl mx-auto w-full px-6 lg:px-12 py-14 lg:py-20">

          {/* =====================================================
              INTRO / BENEFITS
          ====================================================== */}
          <div className="grid md:grid-cols-3 gap-4 mb-12">

            <div className="bg-card border border-line rounded-2xl p-5 flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary-strong))] flex items-center justify-center shrink-0">
                <ShieldCheck
                  size={21}
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2 className="font-bold text-content">
                  Certified dealers
                </h2>

                <p className="text-sm text-content-muted mt-1 leading-relaxed">
                  Trusted showrooms with verified listings and
                  professional services.
                </p>
              </div>
            </div>

            <div className="bg-card border border-line rounded-2xl p-5 flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary-strong))] flex items-center justify-center shrink-0">
                <Car
                  size={21}
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2 className="font-bold text-content">
                  Browse inventory
                </h2>

                <p className="text-sm text-content-muted mt-1 leading-relaxed">
                  Discover certified cars available through our
                  dealer network.
                </p>
              </div>
            </div>

            <div className="bg-card border border-line rounded-2xl p-5 flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary-strong))] flex items-center justify-center shrink-0">
                <MapPin
                  size={21}
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2 className="font-bold text-content">
                  Local showrooms
                </h2>

                <p className="text-sm text-content-muted mt-1 leading-relaxed">
                  Find contact details, opening hours and
                  showroom locations.
                </p>
              </div>
            </div>

          </div>

          {/* =====================================================
              CITY FILTER
          ====================================================== */}
          <div className="mb-12">

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">

              <div>
                <p className="text-xs uppercase tracking-[0.16em] font-bold text-[hsl(var(--color-primary-strong))]">
                  Browse by location
                </p>

                <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-content tracking-tight">
                  Dealer network
                </h2>
              </div>

              <p className="text-sm text-content-muted">
                {totalCities} cities available
              </p>

            </div>

            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Filter dealers by city"
            >
              {["All Cities", ...Array.from(new Set(allDealers.map((d) => d.city).filter(Boolean)))].map((cityName) => (
                <Link
                  key={cityName}
                  href={dealersHref(cityName, q)}
                  className={chipClass(city === cityName)}
                  aria-current={
                    city === cityName
                      ? "page"
                      : undefined
                  }
                >
                  {cityName}
                </Link>
              ))}
            </div>
          </div>

          {/* =====================================================
              RESULTS HEADER
          ====================================================== */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">

            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-content">
                {city !== "All Cities"
                  ? `Dealers in ${city}`
                  : "All dealers"}
              </h2>

              <p className="text-sm text-content-muted mt-1">
                Showing{" "}
                <span className="font-semibold text-content">
                  {filteredDealers.length}
                </span>{" "}
                {filteredDealers.length === 1
                  ? "dealer"
                  : "dealers"}
                {q.trim()
                  ? ` matching "${q.trim()}"`
                  : ""}
              </p>
            </div>

            {hasFilters && (
              <Link
                href="/dealers"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--color-primary-strong))] hover:text-[hsl(var(--color-primary-active))] transition-colors"
              >
                Clear filters
                <ArrowRight
                  size={15}
                  aria-hidden="true"
                />
              </Link>
            )}

          </div>

          {/* =====================================================
              DEALER GRID
          ====================================================== */}
          {filteredDealers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

              {filteredDealers.map((dealer) => (
                <DealerCard
                  key={dealer.id}
                  dealer={dealer}
                />
              ))}

            </div>
          ) : (
            /* ===================================================
               EMPTY STATE
            ==================================================== */
            <div className="rounded-3xl border border-dashed border-line bg-surface px-6 py-20 text-center">

              <div className="mx-auto h-16 w-16 rounded-2xl bg-card border border-line flex items-center justify-center">
                <SearchX
                  size={30}
                  className="text-content-faint"
                  aria-hidden="true"
                />
              </div>

              <h2 className="mt-5 text-xl font-bold text-content">
                No dealers found
              </h2>

              <p className="mt-2 text-sm text-content-muted max-w-md mx-auto">
                We couldn&apos;t find a dealer matching your
                current search. Try another city or search
                term.
              </p>

              <Link
                href="/dealers"
                className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[hsl(var(--color-primary))] hover:brightness-110 text-[hsl(var(--color-primary-foreground))] text-sm font-semibold transition-colors"
              >
                View all dealers
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                />
              </Link>

            </div>
          )}

          {/* =====================================================
              NETWORK FOOTER
          ====================================================== */}
          {filteredDealers.length > 0 && (
            <div className="mt-14 rounded-2xl bg-[hsl(var(--color-ink-900))] text-white px-6 py-8 sm:px-8">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--color-primary-strong))] font-bold">
                    Progressive AutoHub
                  </p>

                  <h3 className="mt-2 text-xl sm:text-2xl font-bold">
                    Looking for your next car?
                  </h3>

                  <p className="mt-2 text-sm text-[hsl(var(--color-content-muted))] max-w-xl">
                    Explore certified inventory from our dealer
                    network and find the right car for your budget.
                  </p>
                </div>

                <Link
                  href="/cars"
                  className="inline-flex items-center justify-center gap-2 shrink-0 px-6 py-3 rounded-xl bg-[hsl(var(--color-primary))] hover:brightness-110 text-[hsl(var(--color-primary-foreground))] font-semibold text-sm transition-colors"
                >
                  Browse cars
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                  />
                </Link>

              </div>
            </div>
          )}

        </section>
      </main>

    </div>
  );
}
