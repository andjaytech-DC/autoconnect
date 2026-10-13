import type { Metadata } from "next";
import Link from "next/link";

import { HomepageStructuredData } from "@/app/components/structuredData";
import {
  HeroSection,
  HeroSliderWrapper,
  DealCategoryBar,
  HeroSearchBar,
  FeaturedEditorial,
  ComingSoonSection,
  BentleySection,
  VehicleCollection,
  NewCarCollection,
  ReviewsSection,
  SellValuationSection,
  FinalCtaSection,
  FloatingSocials,
} from "@/app/components/home";
import { getRecentReviews, type RealReview } from "@/app/lib/reviews";
import { formatINRLakhs } from "@/app/lib/currency";
import {
  getVehicles,
  getNewCars,
  mapVehicle,
  type UiVehicle,
  type NestNewCar,
} from "@/app/lib/nest-public";
import { ApiError } from "@/app/lib/nest";

const BASE_URL = "https://progressiveautohub.com";
const SITE_NAME = "Progressive Auto Sports";
const SITE_DESCRIPTION =
  "Premium pre-owned luxury car marketplace. Exclusive deals, certified vehicles, and personalized service for the discerning buyer.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "Progressive Auto Sports — Premium Pre-Owned Luxury Cars",
  description: SITE_DESCRIPTION,
  keywords: [
    "luxury cars", "pre-owned luxury cars", "certified pre-owned cars", "exclusive cars",
    "premium cars", "Progressive Auto Sports",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website", locale: "en_IN", url: BASE_URL, siteName: SITE_NAME,
    title: "Progressive Auto Sports — Premium Pre-Owned Luxury Cars",
    description: SITE_DESCRIPTION,
    images: [{ url: `${BASE_URL}/cars/bmw-x5.png`, width: 1200, height: 630, alt: "Progressive Auto Sports — premium pre-owned luxury cars" }],
  },
  twitter: {
    card: "summary_large_image", site: "@progressiveautosports",
    title: "Progressive Auto Sports — Premium Pre-Owned Luxury Cars",
    description: SITE_DESCRIPTION,
    images: [`${BASE_URL}/cars/bmw-x5.png`],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
};

interface AttemptResult<T> {
  data: T | null;
  failed: boolean;
  /** The reason, so the banner can tell "busy" from "broken". */
  error?: unknown;
}

/**
 * One fetch, outcome recorded instead of swallowed: `failed: true` lets the page
 * distinguish "the catalogue is empty" from "we could not reach the catalogue".
 *
 * Deliberately does NOT retry a 429. It used to retry once after 1.5s, which is
 * counterproductive: the backend's ThrottlerGuard shares one bucket across every
 * server-side render, so when it is already refusing requests an immediate retry
 * adds load to the exact condition it is trying to recover from — and with all
 * six homepage fetches retrying at once, it doubles the burst that caused it. A
 * 60s window is not helped by a 1.5s pause, so the error state is surfaced
 * instead and the Data Cache (see lib/nest.ts `revalidate`) is what actually
 * removes the pressure.
 */
async function attempt<T>(fn: () => Promise<T>): Promise<AttemptResult<T>> {
  try {
    return { data: await fn(), failed: false };
  } catch (error) {
    return { data: null, failed: true, error };
  }
}

export default async function LandingPage() {
  const [
    paRes,
    featuredRes,
    premiumRes,
    luxuryRes,
    comingSoonRes,
    newCarsRes,
  ] = await Promise.all([
    attempt(() => getVehicles({ dealerId: 6, status: "AVAILABLE", limit: 8 })),
    attempt(() => getVehicles({ status: "AVAILABLE", limit: 6 })),
    attempt(() => getVehicles({ status: "AVAILABLE", minPrice: 1500000, limit: 4 })),
    attempt(() => getVehicles({ status: "AVAILABLE", minPrice: 2500000, limit: 4 })),
    attempt(() => getVehicles({ status: "RESERVED", limit: 3 })),
    attempt(() => getNewCars({})),
  ]);

  const paCars: UiVehicle[] = (paRes.data?.items ?? []).map(mapVehicle);
  const featuredCars: UiVehicle[] = (featuredRes.data?.items ?? []).map(mapVehicle);
  const premiumCars: UiVehicle[] = (premiumRes.data?.items ?? []).map(mapVehicle);
  const luxuryCars: UiVehicle[] = (luxuryRes.data?.items ?? []).map(mapVehicle);
  const comingSoonCars: UiVehicle[] = (comingSoonRes.data?.items ?? []).map(mapVehicle);
  const rawNewCars = newCarsRes.data;
  const newCars: NestNewCar[] = Array.isArray(rawNewCars)
    ? rawNewCars
    : ((rawNewCars?.cars ?? []) as NestNewCar[]);

  // Every used-car fetch failing means the catalogue itself is unreachable —
  // say so rather than rendering five "coming soon" cards.
  const catalogueDown =
    paRes.failed &&
    featuredRes.failed &&
    premiumRes.failed &&
    luxuryRes.failed &&
    comingSoonRes.failed;

  const bentleyCar = luxuryCars.find((c) => c.brand?.toLowerCase() === "bentley") ?? null;

  const reviewSourceIds = [...paCars, ...featuredCars, ...premiumCars, ...luxuryCars]
    .map((c) => c.id)
    .filter((n): n is number => typeof n === "number");
  const realReviews: RealReview[] = await getRecentReviews(reviewSourceIds, 6);

  const allFeatured = [...paCars, ...featuredCars].slice(0, 5);
  const featuredCarData = allFeatured.map((c) => ({
    name: c.name,
    type: c.type,
    price: formatINRLakhs(c.price),
    location: c.dealerCity ?? "India",
    image: c.image ?? "/cars/bmw-x5.png",
    tag: c.premiumBadge ?? "Featured",
  }));

  return (
    <div className="bg-glass-scene min-h-screen font-sans text-[hsl(var(--color-content))]">
      <HomepageStructuredData cars={featuredCarData} />

      <HeroSection>
        <HeroSliderWrapper />
      </HeroSection>

      <DealCategoryBar />

      <HeroSearchBar />

      {catalogueDown && (
        <div className="container pb-16" role="alert">
          <div className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--color-error)/0.35)] bg-[hsl(var(--color-error)/0.06)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[hsl(var(--color-content))]">
                We couldn&apos;t load the live inventory right now.
              </p>
              <p className="mt-0.5 text-sm text-[hsl(var(--color-content-muted))]">
                Refresh the page, or browse the full catalogue directly.
              </p>
            </div>
            <Link
              href="/cars"
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--color-error)/0.4)] bg-[hsl(var(--color-surface))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--color-content))] transition hover:bg-[hsl(var(--color-surface-strong))]"
            >
              Browse all cars
            </Link>
          </div>
        </div>
      )}

      <FeaturedEditorial cars={featuredCars} />

      <ComingSoonSection cars={comingSoonCars} />

      {bentleyCar && <BentleySection car={bentleyCar} />}

      <VehicleCollection
        cars={premiumCars}
        eyebrow="Premium Collection"
        title="Cars above ₹15 Lakh"
        viewAllHref="/cars?budget=15-"
        defaultBadge="Premium"
        emptyMessage="Premium cars coming soon."
      />

      <VehicleCollection
        cars={luxuryCars}
        eyebrow="Luxury Collection"
        title="Cars above ₹25 Lakh"
        viewAllHref="/cars?budget=25-"
        defaultBadge="Luxury"
        emptyMessage="Luxury cars coming soon."
      />

      <NewCarCollection
        cars={newCars.slice(0, 4)}
        eyebrow="New Cars in India"
        title="Explore the latest cars available"
        viewAllHref="/new-cars"
        emptyMessage="New car listings coming soon."
      />

      <ReviewsSection reviews={realReviews} />

      <SellValuationSection />

      <FinalCtaSection />

      <FloatingSocials />
    </div>
  );
}