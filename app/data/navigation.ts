import { cities as dealerCities } from "./dealers";

/**
 * Single source of truth for site navigation.
 *
 * Every navbar/footer/mega-menu surface imports from here so labels and
 * destinations can never drift apart. Valid brand slugs are also defined
 * here and must stay in sync with `app/brands/[slug]/page.tsx`.
 */

/** Brands that have a rendered page at /brands/[slug]. */
export const BRAND_SLUGS = [
  "toyota",
  "bmw",
  "mercedes",
  "audi",
  "honda",
  "hyundai",
  "kia",
  "tesla",
  "mg",
] as const;

export type BrandSlug = (typeof BRAND_SLUGS)[number];

/* Legacy navbar/mega-menu exports were removed — the Navbar now renders
   desktop + mobile purely from `primaryNav` below, keeping the menu a
   single source of truth. Footer link groups remain defined further down. */

export interface FooterLink {
  label: string;
  href: string;
}

/** Footer — Buy & Sell column. */
export const buySellLinks: FooterLink[] = [
  { label: "Featured Cars", href: "/" },
  { label: "Sell Your Car", href: "/sell" },
  { label: "Electric Cars", href: "/electric" },
  { label: "Dealer Network", href: "/dealers" },
];

/** Footer — Services column. */
export const serviceLinks: FooterLink[] = [
  { label: "Car Loans", href: "/finance#loans" },
  { label: "Apply for a Loan", href: "/loans" },
  { label: "EMI Calculator", href: "/finance#emi-calculator" },
  { label: "Challan Check", href: "/challan" },
  { label: "Car Check", href: "/car-check" },
  { label: "Insurance", href: "/insurance" },
  { label: "All Services", href: "/services" },
  { label: "Roadside Assistance", href: "/services#roadside" },
];

/** Footer — Company column. */
export const companyLinks: FooterLink[] = [
  { label: "About Us", href: "/about" },
  { label: "Careers", href: "/careers" },
  { label: "Help Center", href: "/services" },
  { label: "Contact Us", href: "/about#contact" },
];

/** Footer — legal bottom bar. */
export const legalLinks: FooterLink[] = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Sitemap", href: "/sitemap" },
];

/** Footer — Popular Brands column (subset shown in the footer). */
export const footerBrandLinks = [
  "Toyota",
  "Hyundai",
  "Honda",
  "Kia",
  "Tesla",
  "BMW",
] as const;

/* ════════════════════════════════════════════════════════════════════
   PRIMARY PUBLIC NAVIGATION — single source of truth
   Rendered by the Navbar (desktop + mobile) and the footer.
   Every `href` here must resolve to a real route (see ./routes audit).
   ════════════════════════════════════════════════════════════════════ */

export interface NavChild {
  label: string;
  href: string;
  /** Optional short descriptor shown in oversized menus / tooltips. */
  description?: string;
}

export interface MegaMenuSection {
  title: string;
  items: NavChild[];
}

export interface NavItem {
  label: string;
  /** Landing route for the top-level item. `#` must never be used. */
  href: string;
  /** Extra paths that should also highlight this item as "current". */
  match?: string[];
  /** Simple vertical dropdown items (Sell, Finance, Insurance). */
  children?: NavChild[];
  /** Columnar mega-menu layout (Buy Used Cars). */
  megaSections?: MegaMenuSection[];
}

export const primaryNav: NavItem[] = [
  {
    label: "Buy Used Cars",
    href: "/cars",
    match: ["/brands", "/electric"],
    megaSections: [
      {
        title: "Explore by Budget",
        items: [
          { label: "Under ₹5 Lakh", href: "/cars?budget=0-5", description: "Great first cars" },
          { label: "₹5 – ₹10 Lakh", href: "/cars?budget=5-10", description: "Most popular segment" },
          { label: "₹10 – ₹15 Lakh", href: "/cars?budget=10-15" },
          { label: "₹15 – ₹20 Lakh", href: "/cars?budget=15-20" },
          { label: "₹20 Lakh & Above", href: "/cars?budget=20-" },
          { label: "View All Cars", href: "/cars", description: "Full certified showroom" },
        ],
      },
      {
        title: "Explore by Body Type",
        items: [
          { label: "SUVs", href: "/cars?type=SUV" },
          { label: "Sedans", href: "/cars?type=Sedan" },
          { label: "Hatchbacks", href: "/cars?type=Hatchback" },
          { label: "Electric Cars", href: "/electric-cars", description: "Zero-emission picks" },
        ],
      },
      {
        title: "Popular Brands",
        items: BRAND_SLUGS.slice(0, 6).map((slug) => ({
          label: slug.charAt(0).toUpperCase() + slug.slice(1),
          href: `/brands/${slug}`,
        })),
      },
      {
        title: "Dealer Network",
        items: [
          { label: "Find a Dealer", href: "/dealers", description: "Certified showrooms near you" },
          { label: "Dealer Portal", href: "/portal/dealer", description: "For automotive businesses" },
        ],
      },
    ],
  },
  { label: "New Cars", href: "/new-cars" },
  { label: "Electric", href: "/electric-cars" },
  { label: "Sell Your Car", href: "/sell" },
  {
    label: "Finance & Insurance",
    href: "/finance",
    children: [
      { label: "EMI Calculator", href: "/finance" },
      { label: "Apply for Finance", href: "/finance#apply" },
      { label: "Car Insurance", href: "/insurance" },
    ],
  },
  {
    label: "Services",
    href: "/services",
    children: [
      { label: "Car Check", href: "/car-check", description: "Vehicle history & inspection report" },
      { label: "Challan Check", href: "/challan" },
      { label: "Car Service", href: "/services" },
      { label: "Marketplace", href: "/marketplace" },
    ],
  },
  {
    label: "Dealers",
    href: "/dealers",
    children: [
      { label: "Find a Dealer", href: "/dealers" },
      { label: "Register as Dealer", href: "/dealer/register" },
      { label: "Dealer Portal", href: "/portal/dealer" },
    ],
  },
];

/**
 * City selector entries (Spinny-style "current city" control).
 * Each deep-links into the dealer directory, which filters by `city`.
 */
export const CITY_LINKS: NavChild[] = [
  { label: "All Cities", href: "/dealers" },
  ...dealerCities
    .filter((city) => city !== "All Cities")
    .map((city) => ({
      label: city,
      href: `/dealers?city=${encodeURIComponent(city)}`,
    })),
];

/** Account menu — auth + customer pages (all real routes). */
export const ACCOUNT_LINKS: NavChild[] = [
  { label: "Login", href: "/login" },
  { label: "Register", href: "/register" },
  { label: "My Dashboard", href: "/dashboard" },
  { label: "My Orders", href: "/orders" },
  { label: "My Bookings", href: "/bookings" },
  { label: "Shortlisted Cars", href: "/wishlist" },
];

/** Primary sales/support phone — click-to-call in the header, footer and CTAs. */
export const SUPPORT_PHONE = "7000076607";

/** Additional support lines listed alongside {@link SUPPORT_PHONE}. */
export const SUPPORT_PHONE_ALT: readonly string[] = ["7000076608", "7888000888"];

/** Registered showroom address. */
export const SUPPORT_ADDRESS =
  "Plot No. 82, Patparganj Industrial Area, Near Anand Vihar, Delhi-110092";

/** Public support mailbox — used by the footer, about page and newsletter hand-off. */
export const SUPPORT_EMAIL = "progressiveautosportsofficial@gmail.com";

/** `tel:` href value for a phone number (digits only, no spaces). */
export function telHref(phone: string): string {
  return `tel:+91${phone.replace(/\D/g, "").replace(/^91/, "")}`;
}

/**
 * WhatsApp support number — digits only, country code first, as required by
 * `https://wa.me/<number>`. Telegram is intentionally absent until the
 * official handle is confirmed.
 */
export const SUPPORT_WHATSAPP = "919871617270";

/** Human-readable form of {@link SUPPORT_WHATSAPP}. */
export const SUPPORT_WHATSAPP_DISPLAY = "+91 9871617270";
