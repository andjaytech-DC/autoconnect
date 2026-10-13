export interface UiVehicle {
  id: number;
  name: string;
  brand: string;
  brandId?: number;
  year: number;
  price: number;
  type: string;
  categorySlug: string;
  mileage: number;
  fuel: string;
  transmission: string;
  color: string;
  image: string | null;
  images: string[];
  status: string;
  dealer?: string;
  dealerCity?: string | null;
  description?: string | null;
  isCertified: boolean;
  createdAt: string;
  premium?: boolean;
  premiumBadge?: string;
}

export interface UiDealer {
  id: number;
  name: string;
  slug: string;
  city: string;
  state: string;
  address: string;
  rating: number;
  reviewCount: number;
  carsAvailable: number;
  /** Null when the caller is anonymous — contact details need a session. */
  phone: string | null;
  email: string | null;
  website: string;
  description: string;
  logo: string;
  logoGradient: string;
  isFeatured: boolean;
  /** True for a verified showroom; "featured" is derived from this. */
  isVerified?: boolean;
  /** Not provided by the backend yet — kept so existing UI layouts keep working. */
  lat: number;
  lng: number;
  openHours: { day: string; hours: string }[];
  services: string[];
}

export interface NestBrand {
  id: number;
  name: string;
  logo?: string | null;
  country?: string | null;
  isActive: boolean;
  vehicles?: unknown[];
}

export interface NestCategory {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  isActive: boolean;
  vehicles?: unknown[];
}

export interface NestDealer {
  id: number;
  businessName: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  description?: string | null;
  logo?: string | null;
  isVerified?: boolean;
  user?: { email?: string | null } | null;
  vehicles?: { id: number }[] | unknown[];
}

export interface NestVehicleImage {
  id: number;
  imageUrl: string;
  thumbUrl?: string | null;
  altText?: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface NestVehicle {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  year: number;
  mileage: number;
  fuel: string;
  transmission: string;
  bodyType?: string | null;
  color?: string | null;
  engine?: string | null;
  images: string[] | null;
  /** Ordered gallery rows — the authoritative image source when present. */
  vehicleImages?: NestVehicleImage[] | null;
  /** Operational lifecycle: AVAILABLE | RESERVED | SOLD | INACTIVE */
  status: string;
  /** Public visibility: DRAFT | PUBLISHED */
  listingStatus?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  registrationNumber?: string | null;
  registrationState?: string | null;
  features?: string[] | null;
  highlights?: string[] | null;
  availableForFinance?: boolean;
  isCertified: boolean;
  isFeatured?: boolean;
  priceHistory?: { id: number; price: number; recordedAt: string }[] | null;
  reviews?: {
    id: number;
    rating: number;
    comment?: string | null;
    createdAt: string;
    /** Initials source only — the API never returns email or phone. */
    user?: { firstName?: string | null; lastName?: string | null } | null;
  }[] | null;
  createdAt: string;
  updatedAt?: string;
  brandId?: number;
  categoryId?: number;
  dealerId?: number;
  brand?: { id: number; name: string; logo?: string | null } | null;
  category?: { id: number; name: string; slug: string } | null;
  dealer?: { id: number; businessName: string; city?: string | null } | null;
  premium?: boolean;
  premiumBadge?: string;
}

export interface NestVehicleList {
  items: NestVehicle[];
  meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean };
}

export interface NestNewCar {
  id: number;
  brandName: string;
  model: string;
  variant?: string | null;
  slug?: string | null;
  price?: number;
  exShowroomPrice?: number;
  onRoadPrice?: number | null;
  fuel?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  mileageKmpl?: number | null;
  engine?: string | null;
  bodyType?: string | null;
  isElectric?: boolean;
  imageUrl?: string | null;
  images?: string[];
  features?: string[];
  claimedRangeKm?: number | null;
  batteryCapacityKwh?: number | null;
  chargingType?: string | null;
  fastCharging?: boolean | null;
  chargingTimeHours?: number | null;
}

export interface NestMarketplaceProduct {
  id: number;
  name: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  price?: number;
  priceMrp?: number;
  priceSale?: number | null;
  imageUrl?: string | null;
  images?: string[];
  stock?: number;
  isActive?: boolean;
}
