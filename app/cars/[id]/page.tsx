import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import VehicleDetailClient from "@/app/components/vehicle/VehicleDetailClient";
import VehicleReviews from "@/app/components/vehicle/VehicleReviews";
import VehicleTrustSection from "@/app/components/vehicle/VehicleTrustSection";
import RelatedVehicles from "@/app/components/vehicle/RelatedVehicles";
import { getSession } from "@/app/server/session";
import { jsonLdScriptProps } from "@/app/lib/json-ld";
import {
  ApiError,
  getVehicle,
  getVehicles,
  mapVehicle,
  resolveImage,
  type NestVehicle,
} from "@/app/lib/nest-public";

export const dynamic = "force-dynamic";

async function fetchVehicle(id: number): Promise<NestVehicle | null> {
  try {
    return await getVehicle(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

async function getRelatedVehicles(
  categoryId: number | undefined,
  brandId: number | undefined,
  excludeId: number,
) {
  try {
    const data = await getVehicles({
      ...(categoryId ? { categoryId } : {}),
      ...(brandId ? { brandId } : {}),
      status: "AVAILABLE",
      limit: 5,
    });
    return (data.items ?? []).filter((r) => r.id !== excludeId).slice(0, 4);
  } catch {
    return [];
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const vid = Number(id);
  if (!Number.isInteger(vid)) {
    return { title: "Vehicle not found — Progressive AutoHub", robots: { index: false } };
  }
  let v: NestVehicle | null = null;
  try {
    v = await fetchVehicle(vid);
  } catch {
    return { title: "Unable to load vehicle — Progressive AutoHub", robots: { index: false } };
  }
  if (!v) {
    return { title: "Vehicle not found — Progressive AutoHub", robots: { index: false } };
  }
  const title = `${v.brand?.name ?? ""} ${v.title} ${v.year}`.trim();
  const description =
    v.description?.slice(0, 160) ??
    `Buy ${title} at Progressive AutoHub — ₹${v.price.toLocaleString("en-IN")}, ${v.fuel}, ${v.transmission}.`;
  const image = resolveImage(Array.isArray(v.images) ? v.images[0] : null);
  return {
    title: `${title} — Progressive AutoHub`,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function VehicleDetailPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const vehicleId = Number(id);
  if (!Number.isInteger(vehicleId)) notFound();

  let v: NestVehicle | null = null;
  let loadError = false;
  try {
    v = await fetchVehicle(vehicleId);
  } catch {
    loadError = true;
  }
  if (!loadError && !v) notFound();

  if (loadError || !v) {
    return (
      <div className="min-h-screen bg-[hsl(var(--color-bg))] font-sans text-[hsl(var(--color-content))]">
        <main className="container flex-1 py-16">
          <div className="rounded-3xl border border-dashed border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] px-6 py-20 text-center">
            <h1 className="text-xl font-bold">Unable to load vehicle</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-[hsl(var(--color-content-muted))]">
              Please check your connection and retry.
            </p>
          </div>
        </main>
      </div>
    );
  }
  const vehicle = v as NestVehicle;

  const related = await getRelatedVehicles(vehicle.categoryId, vehicle.brandId, vehicle.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: `${vehicle.brand?.name ?? ""} ${vehicle.title}`.trim(),
    brand: { "@type": "Brand", name: vehicle.brand?.name },
    model: vehicle.title,
    vehicleModelDate: String(vehicle.year),
    fuelType: vehicle.fuel,
    vehicleTransmission: vehicle.transmission,
    color: vehicle.color ?? undefined,
    numberOfDoors: undefined,
    mileageFromOdometer: { "@type": "QuantitativeValue", value: vehicle.mileage, unitCode: "KMT" },
    vehicleEngine: vehicle.engine ? { "@type": "EngineSpecification", name: vehicle.engine } : undefined,
    image: (Array.isArray(vehicle.images) ? vehicle.images : [])
      .map((s) => resolveImage(s))
      .filter(Boolean),
    offers: {
      "@type": "Offer",
      price: vehicle.price,
      priceCurrency: "INR",
      availability: vehicle.status === "AVAILABLE" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      seller: vehicle.dealer ? { "@type": "AutoDealer", name: vehicle.dealer.businessName } : undefined,
    },
  };

  const ui = mapVehicle(vehicle);

  const specs: { label: string; value: string | null | undefined }[] = [
    { label: "Fuel Type", value: vehicle.fuel },
    { label: "Transmission", value: vehicle.transmission },
    { label: "Engine", value: vehicle.engine },
    { label: "Mileage", value: `${vehicle.mileage} km` },
    { label: "Color", value: vehicle.color },
    { label: "Body Type", value: vehicle.bodyType },
    { label: "City", value: vehicle.city },
  ];

  const heroImage = resolveImage(
    Array.isArray(vehicle.images) ? vehicle.images[0] : null
  );

  // Reviews come from the backend; only show the author's initials.
  const reviews = (vehicle.reviews ?? []).map((r) => {
    const first = (r.user?.firstName ?? "").trim();
    const last = (r.user?.lastName ?? "").trim();
    return {
      id: r.id,
      rating: r.rating,
      comment: r.comment ?? null,
      createdAt: r.createdAt,
      authorName:
        first || last ? `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() : null,
    };
  });

  // Only a signed-in CUSTOMER may be offered the write path; the backend
  // enforces this independently, so this is UX, not security.
  const viewer = await getSession();
  const canReview = viewer?.role === "CUSTOMER";

  return (
    <div className="min-h-screen bg-[hsl(var(--color-bg))] font-sans text-[hsl(var(--color-content))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(jsonLd)}
      />

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-[hsl(var(--color-primary)/0.1)] blur-[120px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-32 top-0 h-[320px] w-[320px] rounded-full bg-amber-200/30 blur-[100px]"
          aria-hidden="true"
        />

        <div className="container relative pt-8 pb-6 lg:pt-12 lg:pb-8">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs text-[hsl(var(--color-content-muted))]" aria-label="Breadcrumb">
            <Link href="/cars" className="transition-colors hover:text-[hsl(var(--color-primary-strong))]">Cars</Link>
            <span aria-hidden="true">/</span>
            <span>{vehicle.brand?.name}</span>
            <span aria-hidden="true">/</span>
            <span className="text-[hsl(var(--color-content))]">{vehicle.title}</span>
          </nav>

          <div className="grid items-end gap-8 lg:grid-cols-[1.2fr_1fr]">
            {/* Vehicle image - the page's LCP element, loaded with priority */}
            <div className="relative">
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))]">
                {heroImage ? (
                  <Image
                    src={heroImage}
                    alt={`${vehicle.brand?.name ?? ""} ${vehicle.title}`}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[hsl(var(--color-content-faint))]">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M5 17h14M6.5 17a1.5 1.5 0 1 0 0 .01M17.5 17a1.5 1.5 0 1 0 0 .01M3 17l1.5-5.5A2 2 0 0 1 6.4 10h11.2a2 2 0 0 1 1.9 1.5L21 17M5 17v2M19 17v2" />
                    </svg>
                    <span className="sr-only">No photo available for this vehicle</span>
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle info */}
            <div>
              <span className="badge badge-success">
                <ShieldCheck size={12} aria-hidden="true" />
                Certified
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                {vehicle.brand?.name} {vehicle.title}
              </h1>
              <p className="mt-2 text-lg text-[hsl(var(--color-content-muted))]">{vehicle.year}</p>
              <p className="mt-4 text-4xl font-extrabold text-[hsl(var(--color-content))]">
                ₹{vehicle.price.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SPECS + DETAIL ─── */}
      <section className="container py-8">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <VehicleDetailClient
            vehicle={{
              id: ui.id,
              title: ui.name,
              brand: ui.brand,
              year: ui.year,
              price: ui.price,
              fuel: ui.fuel,
              transmission: ui.transmission,
              mileage: ui.mileage,
              city: ui.dealerCity ?? "",
              description: ui.description ?? "",
              images: ui.images,
              features: [],
            }}
            dealer={
              vehicle.dealer
                ? { name: vehicle.dealer.businessName, city: vehicle.dealer.city ?? "", state: vehicle.state ?? null, phone: null }
                : null
            }
            specs={specs}
          />

          {/* Vehicle history + return request — real VehicleHistory rows. */}
          <VehicleTrustSection vehicleId={vehicle.id} />

          {/* Owner reviews — real rows from the backend Review model. */}
          <VehicleReviews
            vehicleId={vehicle.id}
            initialReviews={reviews}
            canReview={canReview}
          />
        </div>

        {/* ─── RELATED VEHICLES ─── */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[hsl(var(--color-content-muted))]">You may also like</h2>
            <RelatedVehicles
              vehicles={related.map((r) => ({
                id: r.id,
                name: r.title,
                brand: r.brand?.name ?? "",
                year: r.year,
                price: r.price,
                image: resolveImage(Array.isArray(r.images) ? r.images[0] : null),
                images: Array.isArray(r.images) ? r.images : [],
              }))}
            />
          </div>
        )}
      </section>
    </div>
  );
}
