
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  BadgeCheck,
  Car,
  Globe,
  Mail,
  MapPin,
  Phone,
  Star,
} from "lucide-react";

import { ApiError, getDealer, mapDealer, type UiDealer } from "@/app/lib/nest-public";
import { isSignedIn } from "@/app/server/authz";

interface DealerPageProps {
  params: Promise<{ id: string }>;
}

/**
 * A contact value that is only present for signed-in callers.
 *
 * Renders the value when it is there, and a sign-in prompt when the API
 * withheld it — never a dead `tel:`/`mailto:` link, and never the raw null.
 */
function GatedContactText({
  value,
  contactAvailable,
}: {
  value: string | null;
  contactAvailable: boolean;
}) {
  if (value) return <>{value}</>;
  if (!contactAvailable) {
    return (
      <Link href="/login" className="underline hover:text-content">
        Sign in to view
      </Link>
    );
  }
  return <span className="text-content-faint">Not provided</span>;
}

export const dynamic = "force-dynamic";

/** Dealer detail straight from NestJS — no static dealer records. */
async function fetchDealer(
  id: string,
  canSeeContact: boolean,
): Promise<UiDealer | null | "error"> {
  try {
    const d = await getDealer(id);
    return mapDealer(d, { canSeeContact });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    return "error";
  }
}

export async function generateMetadata({
  params,
}: DealerPageProps): Promise<Metadata> {
  const { id } = await params;
  // Metadata is public output, so it never carries contact details.
  const result = await fetchDealer(id, false);
  if (result === "error") {
    return { title: "Unable to load dealer — Progressive AutoHub", robots: { index: false } };
  }
  const dealer = result;
  if (!dealer) {
    return {
      title: "Dealer not found — Progressive AutoHub",
      description: "The requested dealer could not be found.",
    };
  }
  const description = dealer.description ?? "";
  const shortDescription = description.length > 160 ? `${description.slice(0, 157)}...` : description;
  return {
    title: `${dealer.name}, ${dealer.city} — Progressive AutoHub`,
    description: shortDescription,
    keywords: [dealer.name, dealer.city, "car dealer", "certified pre-owned", "car showroom", "test drive"],
    openGraph: {
      title: `${dealer.name}, ${dealer.city} — Progressive AutoHub`,
      description: shortDescription,
      type: "website",
      locale: "en-IN",
      url: `https://progressiveautohub.com/dealers/${dealer.id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${dealer.name}, ${dealer.city} — Progressive AutoHub`,
      description: shortDescription,
    },
  };
}

/**
 * Convert "09:00" into "9:00 AM".
 */
function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = Number.parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinutes = minutes?.padStart(2, "0") ?? "00";
  return `${displayHour}:${displayMinutes} ${ampm}`;
}

export default async function DealerPage({
  params,
}: DealerPageProps) {
  const { id } = await params;
  // Contact details (phone, and the account email behind user.email) are PII
  // released only to a signed-in session. Everyone else sees a sign-in prompt.
  const contactAvailable = await isSignedIn();
  const result = await fetchDealer(id, contactAvailable);

  if (result === "error") {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] font-sans text-[hsl(var(--color-content))]">
        <main className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-12 text-center">
          <h1 className="text-xl font-bold text-content">Unable to load dealer</h1>
          <p className="mt-2 text-sm text-content-muted">Please check your connection and retry.</p>
          <Link href="/dealers" className="mt-6 inline-block rounded-xl bg-[hsl(var(--color-primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--color-primary-foreground))] hover:brightness-110">
            Back to dealers
          </Link>
        </main>
      </div>
    );
  }

  const dealer = result;
  if (!dealer) {
    notFound();
  }
  void formatTime;

  // Dealer inventory preview straight from NestJS (best-effort, empty on failure).
  let dealerInventory: {
    id: number;
    name: string;
    brand: string;
    year: number;
    price: string;
    image: string;
  }[] = [];
  try {
    const { getVehicles: fetchVehicles, resolveImage: toImage } = await import(
      "@/app/lib/nest-public"
    );
    const data = await fetchVehicles({ dealerId: dealer.id, status: "AVAILABLE", limit: 4 });
    dealerInventory = (data.items ?? [])
      .map((v) => ({
        id: v.id,
        name: v.title,
        brand: v.brand?.name ?? "",
        year: v.year,
        price: `₹${v.price.toLocaleString("en-IN")}`,
        image: toImage(Array.isArray(v.images) ? v.images[0] : null),
      }))
      .filter((c): c is typeof c & { image: string } => Boolean(c.image));
  } catch {
    dealerInventory = [];
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[hsl(var(--color-content))]">

      {/* =========================================================
          HERO
      ========================================================== */}
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
          <Link
            href="/dealers"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-[hsl(var(--color-primary))] transition-colors mb-8"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            All dealers
          </Link>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* rating/reviewCount are not supplied by the backend yet. Showing
                "0.0" would present a placeholder as a real score, so it is
                omitted until there is something to report. */}
            {dealer.reviewCount > 0 && (
              <span className="inline-flex items-center gap-1 bg-[hsl(var(--color-primary)/0.15)] border border-[hsl(var(--color-primary)/0.3)] text-[hsl(var(--color-primary))] text-xs font-bold px-2.5 py-1 rounded-md">
                <Star
                  size={12}
                  className="fill-[hsl(var(--color-primary))] text-[hsl(var(--color-primary))]"
                  aria-hidden="true"
                />
                {dealer.rating.toFixed(1)}
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-sm text-white/70">
              <MapPin size={14} aria-hidden="true" />
              {dealer.city}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {dealer.name}
          </h1>
        </div>
      </section>

      {/* =========================================================
          DESCRIPTION
      ========================================================== */}
      <section className="bg-surface border-b border-divider">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
          <p className="text-lg text-content-muted leading-relaxed max-w-3xl">
            {dealer.description}
          </p>
        </div>
      </section>

      {/* =========================================================
          MAIN CONTENT
      ========================================================== */}
      <section className="max-w-7xl mx-auto w-full px-6 lg:px-12 py-12 grid lg:grid-cols-3 gap-8">

        {/* =======================================================
            LEFT CONTENT
        ======================================================== */}
        <div className="lg:col-span-2 space-y-6">

          {/* Showroom Details */}
          <div className="bg-card rounded-2xl border border-line p-8">
            <h2 className="font-bold text-content text-lg mb-5">
              Showroom details
            </h2>

            <dl className="space-y-4 text-sm">

              {/* Address */}
              <div className="flex items-start gap-3">
                <MapPin
                  size={18}
                  className="text-[hsl(var(--color-primary-strong))] shrink-0 mt-0.5"
                  aria-hidden="true"
                />

                <div>
                  <dt className="font-semibold text-content">
                    Address
                  </dt>

                  <dd className="text-content-muted mt-0.5">
                    {dealer.address}
                  </dd>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3">
                <Phone
                  size={18}
                  className="text-[hsl(var(--color-primary-strong))] shrink-0 mt-0.5"
                  aria-hidden="true"
                />

                <div>
                  <dt className="font-semibold text-content">
                    Phone
                  </dt>

                  <dd className="text-content-muted mt-0.5">
                    <GatedContactText value={dealer.phone} contactAvailable={contactAvailable} />
                  </dd>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <Mail
                  size={18}
                  className="text-[hsl(var(--color-primary-strong))] shrink-0 mt-0.5"
                  aria-hidden="true"
                />

                <div>
                  <dt className="font-semibold text-content">
                    Email
                  </dt>

                  <dd className="text-content-muted mt-0.5">
                    <GatedContactText value={dealer.email} contactAvailable={contactAvailable} />
                  </dd>
                </div>
              </div>

              {/* Website — only when the backend actually supplies one. The
                  mapper leaves this empty, and an empty href is a link that
                  silently reloads the page instead of navigating. */}
              {dealer.website ? (
                <div className="flex items-start gap-3">
                  <Globe
                    size={18}
                    className="text-[hsl(var(--color-primary-strong))] shrink-0 mt-0.5"
                    aria-hidden="true"
                  />

                  <div>
                    <dt className="font-semibold text-content">
                      Website
                    </dt>

                    <dd className="text-content-muted mt-0.5">
                      <a
                        href={dealer.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[hsl(var(--color-primary-strong))] transition-colors"
                      >
                        {dealer.website.replace(/^https?:\/\//, "")}
                      </a>
                    </dd>
                  </div>
                </div>
              ) : null}

              {/* Inventory */}
              <div className="flex items-start gap-3">
                <Car
                  size={18}
                  className="text-[hsl(var(--color-primary-strong))] shrink-0 mt-0.5"
                  aria-hidden="true"
                />

                <div>
                  <dt className="font-semibold text-content">
                    Inventory
                  </dt>

                  <dd className="text-content-muted mt-0.5">
                    {dealer.carsAvailable} certified cars available
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Services — the backend does not supply this yet, so an empty
              list would render a heading over nothing. */}
          {dealer.services.length > 0 && (
            <div className="bg-card rounded-2xl border border-line p-8">
              <h2 className="font-bold text-content text-lg mb-5">
                Services offered
              </h2>

              <ul className="grid sm:grid-cols-2 gap-4 text-sm">
                {dealer.services.map((service) => (
                  <li
                    key={service}
                    className="flex items-center gap-3 bg-surface border border-line rounded-xl px-4 py-3"
                  >
                    <BadgeCheck
                      size={16}
                      className="text-[hsl(var(--color-primary-strong))] shrink-0"
                      aria-hidden="true"
                    />

                    <span className="text-content-muted">
                      {service}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Opening Hours */}
          <div className="bg-card rounded-2xl border border-line p-8">
            <h2 className="font-bold text-content text-lg mb-5">
              Opening hours
            </h2>

            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              {dealer.openHours.length === 0 ? (
                <p className="text-content-muted sm:col-span-2">
                  Opening hours not published yet.
                </p>
              ) : (
                dealer.openHours.map((hours) => (
                <div
                  key={hours.day}
                  className="flex justify-between items-center py-2 border-b border-divider last:border-0"
                >
                  <dt className="font-semibold text-content">
                    {hours.day}
                  </dt>
                  <dd className="text-content-muted">
                    {hours.hours}
                  </dd>
                </div>
                ))
              )}
            </dl>
          </div>

          {/* Map */}
          <div className="bg-card rounded-2xl border border-line p-8">
            <h2 className="font-bold text-content text-lg mb-5">
              Find us on the map
            </h2>

            <div className="rounded-xl overflow-hidden border border-line">
              <Image
              src={`https://staticmap.openstreetmap.de/staticmap.php?center=${dealer.lat},${dealer.lng}&zoom=14&size=600x300&markers=${dealer.lat},${dealer.lng},red-pushpin`}
              alt={`Map showing location of ${dealer.name}`}
              width={600}
              height={300}
              className="w-full h-auto object-cover"
              loading="lazy"
            />
            </div>

            <p className="mt-4 text-sm text-content-muted">
              <MapPin
                size={14}
                className="inline mr-1 text-[hsl(var(--color-primary-strong))]"
                aria-hidden="true"
              />
              {dealer.address}
            </p>
          </div>

          {/* Inventory Preview */}
          <div className="bg-card rounded-2xl border border-line p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
              <h2 className="font-bold text-content text-lg">
                Inventory preview
              </h2>

              <Link
                href="/cars"
                className="text-sm font-semibold text-[hsl(var(--color-primary-strong))] hover:text-[hsl(var(--color-primary-strong))]"
              >
                View full showroom →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {dealerInventory.length === 0 ? (
                <p className="text-sm text-content-muted sm:col-span-2 lg:col-span-4">
                  Inventory preview is not available right now — browse the full
                  showroom instead.
                </p>
              ) : (
                dealerInventory.map((car) => (
                <Link
                  key={car.id}
                  href="/cars"
                  className="group block bg-surface rounded-xl border border-line overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative h-28">
                    <Image
                      src={car.image}
                      alt={car.name}
                      fill
                      className="absolute inset-0 w-full h-full object-contain p-4"
                      loading="lazy"
                    />
                  </div>

                  <div className="p-3 space-y-1">
                    <p className="text-xs text-content-faint font-medium uppercase">
                      {car.brand} • {car.year}
                    </p>

                    <p className="font-bold text-sm text-content group-hover:text-[hsl(var(--color-primary-strong))] transition-colors">
                      {car.name}
                    </p>

                    <p className="text-sm font-extrabold text-content">
                      {car.price}
                    </p>
                  </div>
                </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* =======================================================
            SIDEBAR
        ======================================================== */}
        <aside>
          <div className="bg-card rounded-2xl border border-line p-8 text-center lg:sticky lg:top-24">

            {/* Dealer Logo */}
            <div
              className={`h-20 w-20 mx-auto rounded-2xl bg-gradient-to-br ${dealer.logoGradient} flex items-center justify-center text-white font-bold text-3xl mb-4`}
              aria-hidden="true"
            >
              {dealer.logo}
            </div>

            {/* Featured */}
            {dealer.isFeatured && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full mb-3">
                <Star
                  size={12}
                  className="fill-amber-500"
                  aria-hidden="true"
                />
                Featured Dealer
              </span>
            )}

            <h3 className="font-bold text-content text-xl">
              {dealer.name}
            </h3>

            <p className="text-sm text-content-muted mt-1">
              {dealer.city}, {dealer.state}
            </p>

            {/* Rating — clamped to zero by the mapper, so only render it when
                there are actually reviews behind the number. */}
            {dealer.reviewCount > 0 ? (
              <p className="mt-4 inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-sm font-bold px-3 py-1.5 rounded-full">
                <Star
                  size={14}
                  className="fill-[hsl(var(--color-primary))] text-[hsl(var(--color-primary))]"
                  aria-hidden="true"
                />

                {dealer.rating.toFixed(1)} / 5

                <span className="text-content-faint font-normal">
                  ({dealer.reviewCount} reviews)
                </span>
              </p>
            ) : (
              <p className="mt-4 text-sm text-content-muted">No reviews yet</p>
            )}

            {/* Actions */}
            <div className="mt-6 space-y-3">

              {contactAvailable && dealer.phone ? (
                <a
                  href={`tel:${dealer.phone.replace(/\s/g, "")}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-line font-semibold text-content hover:border-[hsl(var(--color-primary)/0.6)] hover:text-[hsl(var(--color-primary-strong))] transition-colors"
                >
                  <Phone size={16} aria-hidden="true" />
                  Call showroom
                </a>
              ) : (
                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-line font-semibold text-content hover:border-[hsl(var(--color-primary)/0.6)] hover:text-[hsl(var(--color-primary-strong))] transition-colors"
                >
                  <Phone size={16} aria-hidden="true" />
                  Sign in to call
                </Link>
              )}

              {contactAvailable && dealer.email ? (
                <a
                  href={`mailto:${dealer.email}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-line font-semibold text-content hover:border-[hsl(var(--color-primary)/0.6)] hover:text-[hsl(var(--color-primary-strong))] transition-colors"
                >
                  <Mail size={16} aria-hidden="true" />
                  Email showroom
                </a>
              ) : (
                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-line font-semibold text-content hover:border-[hsl(var(--color-primary)/0.6)] hover:text-[hsl(var(--color-primary-strong))] transition-colors"
                >
                  <Mail size={16} aria-hidden="true" />
                  Sign in to email
                </Link>
              )}

              <a
                href={dealer.website}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-line font-semibold text-content hover:border-[hsl(var(--color-primary)/0.6)] hover:text-[hsl(var(--color-primary-strong))] transition-colors"
              >
                <Globe size={16} aria-hidden="true" />
                Visit website
              </a>
            </div>
          </div>
        </aside>
      </section>

    </div>
  );
}
