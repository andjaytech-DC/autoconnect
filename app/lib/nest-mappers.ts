import type { NestDealer, NestVehicle } from "./nest-types";
import type { UiDealer, UiVehicle } from "./nest-types";
import { resolveImage } from "./nest-images";

export function mapVehicle(v: NestVehicle): UiVehicle {
  // Prefer the ordered VehicleImage rows (they carry alt text, primary flag
  // and thumbnails); fall back to the denormalised images[] array.
  const galleryImages = Array.isArray(v.vehicleImages) && v.vehicleImages.length > 0
    ? [...v.vehicleImages]
        .sort((a, b) => {
          if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
          return a.sortOrder - b.sortOrder;
        })
        .map((g) => resolveImage(g.imageUrl))
        .filter((s): s is string => Boolean(s))
    : [];
  const fallbackImages = (Array.isArray(v.images) ? v.images : [])
    .map((s) => resolveImage(s))
    .filter((s): s is string => Boolean(s));
  const images = galleryImages.length > 0 ? galleryImages : fallbackImages;
  return {
    id: v.id,
    name: v.title,
    brand: v.brand?.name ?? "—",
    brandId: v.brand?.id ?? v.brandId,
    year: v.year,
    price: v.price,
    type: v.category?.name ?? "Standard",
    categorySlug: v.category?.slug ?? "",
    mileage: v.mileage,
    fuel: v.fuel,
    transmission: v.transmission,
    color: v.color ?? "—",
    image: images[0] ?? null,
    images,
    status: v.status,
    dealer: v.dealer?.businessName,
    dealerCity: v.dealer?.city ?? v.city ?? null,
    description: v.description,
    isCertified: v.isCertified,
    createdAt: v.createdAt,
    premium: v.premium,
    premiumBadge: v.premiumBadge,
  };
}

export function mapDealer(
  d: NestDealer,
  { canSeeContact = false }: { canSeeContact?: boolean } = {},
): UiDealer {
  const name = d.businessName ?? "Dealer";
  return {
    id: d.id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    city: d.city ?? "",
    state: d.state ?? "",
    address: d.address ?? "",
    rating: 0,
    reviewCount: 0,
    carsAvailable: Array.isArray(d.vehicles) ? d.vehicles.length : 0,
    // Contact details are PII released only to a signed-in session. Fails
    // closed: a caller that forgets the flag publishes nothing rather than
    // everything. `phone` is the showroom number, `email` is the dealer's
    // account login identifier, not a published business address.
    phone: canSeeContact ? (d.phone ?? "") : null,
    email: canSeeContact ? (d.user?.email ?? null) : null,
    website: "",
    description: d.description ?? "",
    logo: d.logo ?? name.slice(0, 2).toUpperCase(),
    logoGradient: "linear-gradient(135deg, #16a34a, #065f46)",
    // The Dealer model has no isFeatured column, so featured = verified.
    isFeatured: Boolean(d.isVerified),
    isVerified: Boolean(d.isVerified),
    lat: 0,
    lng: 0,
    openHours: [],
    services: [],
  };
}
