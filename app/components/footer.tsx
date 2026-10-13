import Link from "next/link";
import type { SiteRating } from "@/app/lib/site-rating";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Smartphone,
  Star,
} from "lucide-react";

import { NewsletterCard } from "@/app/components/footerNewsletter";

import {
  buySellLinks,
  companyLinks,
  footerBrandLinks,
  legalLinks,
  serviceLinks,
  SUPPORT_ADDRESS,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_ALT,
  telHref,
} from "@/app/data/navigation";

/* ------------------------------------------------------------------ */
/*  Mobile app — the apps are not published yet, so store badges are   */
/*  shown as an honest "coming soon" notice rather than dead links.     */
/* ------------------------------------------------------------------ */
function AppComingSoonCard() {
  return (
    <div
      id="mobile-app"
      className="group relative flex h-full scroll-mt-24 flex-col overflow-hidden rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-5 transition-all duration-300 hover:border-[hsl(var(--color-info)/0.4)] hover:shadow-[var(--shadow-subtle)]"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--color-info))]/0.12">
          <Smartphone size={13} className="text-[hsl(var(--color-info))]" aria-hidden="true" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--color-info))]">
          Mobile App
        </span>
      </div>
      <h2 className="text-base font-extrabold text-[hsl(var(--color-content))]">
        Buy &amp; sell{" "}
        <span className="bg-gradient-to-r from-[hsl(var(--color-info))] to-[hsl(var(--color-primary-strong))] bg-clip-text text-transparent">
          on the go
        </span>
      </h2>
      <p className="mt-1.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
        In development. Until it ships, the full marketplace works in your mobile browser.
      </p>
      <ul className="mt-auto flex flex-wrap gap-2 pt-4">
        {[
          { store: "App Store", icon: "apple" as const },
          { store: "Google Play", icon: "play" as const },
        ].map((entry) => (
          <li
            key={entry.store}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[hsl(var(--color-line-hover))] bg-[hsl(var(--color-surface-strong))] px-3 py-2 opacity-90"
          >
            {entry.icon === "apple" ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.98-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302-2.302 2.302-2.798-2.302 2.798-2.302zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z" />
              </svg>
            )}
            <span className="text-left">
              <span className="block text-[9px] leading-tight text-[hsl(var(--color-content-muted))]">
                Coming soon to
              </span>
              <span className="block text-xs font-bold text-[hsl(var(--color-content))]">
                {entry.store}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dealers & Partners — compact business CTA shown beside the          */
/*  newsletter and mobile-app cards.                                    */
/* ------------------------------------------------------------------ */
function DealerPartnerCard() {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-5 transition-all duration-300 hover:border-[hsl(var(--color-primary)/0.5)] hover:shadow-[var(--shadow-subtle)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--color-primary))]/0.15">
          <Building2 size={13} className="text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--color-primary-strong))]">
          Dealers &amp; Partners
        </span>
      </div>
      <h2 className="text-base font-extrabold text-[hsl(var(--color-content))]">
        Grow your automotive business
      </h2>
      <p className="mt-1.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
        List inventory, reach qualified buyers and manage your business digitally.
      </p>
      <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-4 text-xs font-bold text-[hsl(var(--color-primary-strong))]">
        <Link
          href="/dealer/register"
          className="inline-flex items-center gap-1 transition-all hover:gap-1.5"
        >
          Register as Dealer
          <ArrowUpRight size={12} aria-hidden="true" />
        </Link>
        <Link
          href="/portal/dealer"
          className="inline-flex items-center gap-1 transition-all hover:gap-1.5"
        >
          Dealer Portal
          <ArrowUpRight size={12} aria-hidden="true" />
        </Link>
        <Link
          href="/dealers"
          className="inline-flex items-center gap-1 transition-all hover:gap-1.5"
        >
          Find a Dealer
          <ArrowUpRight size={12} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Regions — India-only marketplace.                                  */
/* ------------------------------------------------------------------ */
const regions: string[] = ["India"];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */
function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-[hsl(var(--color-content-muted))]">
      {children}
    </h2>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-sm py-1.5 text-[13px] leading-5 text-[hsl(var(--color-content-muted))] transition-colors hover:text-[hsl(var(--color-primary-strong))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--color-bg))]"
    >
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Footer                                                        */
/* ------------------------------------------------------------------ */
export default function Footer({ rating }: { rating?: SiteRating | null }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="relative z-10 mt-auto overflow-hidden bg-[hsl(var(--color-bg))]"
      aria-label="Progressive AutoHub footer"
    >
      {/* Single hairline accent — replaces the old multi-blob ambient glow. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--color-primary))]/50 to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 lg:px-10 lg:py-12">
        {/* ========================================================= */}
        {/*  ENGAGEMENT ROW: newsletter · app · dealers & partners      */}
        {/* ========================================================= */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <NewsletterCard />
          <AppComingSoonCard />
          <DealerPartnerCard />
        </div>

        {/* ========================================================= */}
        {/*  COMPACT TRUST ROW                                          */}
        {/* ========================================================= */}
        <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] px-4 py-3">
          <li className="flex items-center gap-1.5 text-xs text-[hsl(var(--color-content-muted))]">
            <ShieldCheck size={14} className="text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
            Trusted platform
          </li>
          <li className="flex items-center gap-1.5 text-xs text-[hsl(var(--color-content-muted))]">
            <BadgeCheck size={14} className="text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
            Verified cars
          </li>
          <li className="flex items-center gap-1.5 text-xs text-[hsl(var(--color-content-muted))]">
            <MapPin size={14} className="text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
            Verified dealers
          </li>
          {rating && rating.count > 0 && (
            <li className="flex items-center gap-1.5 text-xs text-[hsl(var(--color-content-muted))] sm:ml-auto">
              <Star
                size={14}
                className="fill-[hsl(var(--color-primary-strong))] text-[hsl(var(--color-primary-strong))]"
                aria-hidden="true"
              />
              {rating.average}/5 from {rating.count.toLocaleString("en-IN")} review
              {rating.count === 1 ? "" : "s"}
            </li>
          )}
        </ul>

        {/* ========================================================= */}
        {/*  MAIN FOOTER GRID                                           */}
        {/* ========================================================= */}
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-6 lg:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2">
            <Link
              href="/"
              className="group mb-4 inline-flex items-center gap-2.5"
              aria-label="Progressive AutoHub home"
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--color-primary))] to-yellow-600 text-lg font-extrabold text-[hsl(var(--color-primary-foreground))] shadow-md shadow-[hsl(var(--color-primary)/0.25)] transition-transform duration-300 group-hover:scale-105"
              >
                P
              </span>
              <span>
                <span className="block text-base font-extrabold tracking-tight text-[hsl(var(--color-content))]">
                  Progressive
                </span>
                <span className="-mt-0.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--color-primary-strong))]">
                  AutoHub
                </span>
              </span>
            </Link>

            <p className="max-w-sm text-[13px] leading-6 text-[hsl(var(--color-content-muted))]">
              India&apos;s modern automotive marketplace for buying, selling, financing and
              servicing cars with confidence.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/cars"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[hsl(var(--color-primary))] to-yellow-500 px-4 py-2 text-xs font-bold text-[hsl(var(--color-primary-foreground))] shadow-sm transition-all hover:-translate-y-0.5 hover:brightness-105"
              >
                Browse Cars
                <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
              <Link
                href="/sell"
                className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] px-4 py-2 text-xs font-bold text-[hsl(var(--color-content))] transition-all hover:border-[hsl(var(--color-line-hover))] hover:bg-[hsl(var(--color-surface-strong))]"
              >
                Sell Your Car
              </Link>
            </div>
          </div>

          {/* Popular Brands */}
          <nav aria-label="Popular car brands">
            <FooterHeading>Popular Brands</FooterHeading>
            <ul>
              {footerBrandLinks.map((brand) => (
                <li key={brand}>
                  <FooterLink href={`/brands/${brand.toLowerCase().replace(/\s+/g, "-")}`}>
                    Used {brand} Cars
                  </FooterLink>
                </li>
              ))}
              <li>
                <FooterLink href="/cars">View all cars</FooterLink>
              </li>
            </ul>
          </nav>

          {/* Buy & Sell */}
          <nav aria-label="Buy and sell cars">
            <FooterHeading>Buy &amp; Sell</FooterHeading>
            <ul>
              {buySellLinks.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
              <li>
                <FooterLink href="/marketplace">Marketplace</FooterLink>
              </li>
              <li>
                <FooterLink href="/new-cars">New Cars</FooterLink>
              </li>
            </ul>
          </nav>

          {/* Services */}
          <nav aria-label="Automotive services">
            <FooterHeading>Services</FooterHeading>
            <ul>
              {serviceLinks.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company */}
          <nav aria-label="Company information">
            <FooterHeading>Company</FooterHeading>
            <ul>
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
              <li>
                <FooterLink href="/about#contact">Partner With Us</FooterLink>
              </li>
              <li>
                <FooterLink href="/dealer/register">Dealer Registration</FooterLink>
              </li>
              <li>
                <FooterLink href="#mobile-app">Mobile App</FooterLink>
              </li>
            </ul>
          </nav>
        </div>

        {/* ========================================================= */}
        {/*  CONTACT STRIP (compact)                                    */}
        {/* ========================================================= */}
        <address className="mt-8 grid gap-3 rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] px-4 py-4 not-italic sm:grid-cols-3">
          <a
            href={telHref(SUPPORT_PHONE)}
            className="group flex items-start gap-2.5 text-xs text-[hsl(var(--color-content-muted))] transition-colors hover:text-[hsl(var(--color-primary-strong))]"
          >
            <Phone size={14} className="mt-0.5 shrink-0 text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
            <span>
              <span className="block font-bold text-[hsl(var(--color-content))] transition-colors group-hover:text-[hsl(var(--color-primary-strong))]">
                {SUPPORT_PHONE}
              </span>
              <span>
                Sales &amp; support
                {SUPPORT_PHONE_ALT.length > 0 && <> · {SUPPORT_PHONE_ALT.join(" · ")}</>}
              </span>
            </span>
          </a>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="group flex items-start gap-2.5 break-all text-xs text-[hsl(var(--color-content-muted))] transition-colors hover:text-[hsl(var(--color-primary-strong))]"
          >
            <Mail size={14} className="mt-0.5 shrink-0 text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
            <span className="font-semibold text-[hsl(var(--color-content))] transition-colors group-hover:text-[hsl(var(--color-primary-strong))]">
              {SUPPORT_EMAIL}
            </span>
          </a>
          <span className="flex items-start gap-2.5 text-xs text-[hsl(var(--color-content-muted))]">
            <MapPin size={14} className="mt-0.5 shrink-0 text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
            <span>{SUPPORT_ADDRESS}</span>
          </span>
        </address>

        {/* ========================================================= */}
        {/*  LEGAL / BOTTOM BAR                                         */}
        {/* ========================================================= */}
        <div className="mt-8 flex flex-col gap-4 border-t border-[hsl(var(--color-line))] pt-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs font-medium text-[hsl(var(--color-content-muted))]">
            © {currentYear} Progressive AutoHub. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[11px] font-medium text-[hsl(var(--color-content-muted))] transition-colors hover:text-[hsl(var(--color-primary-strong))]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <span className="hidden h-3 w-px bg-[hsl(var(--color-line))] sm:block" aria-hidden="true" />
            <span className="flex items-center gap-1.5 text-[11px] text-[hsl(var(--color-content-muted))]">
              <Globe size={13} aria-hidden="true" />
              Region:
              {regions.map((region) => (
                <span
                  key={region}
                  className="rounded-md border border-[hsl(var(--color-primary)/0.35)] bg-[hsl(var(--color-primary))]/0.12 px-2 py-0.5 font-semibold text-[hsl(var(--color-primary-strong))]"
                >
                  {region}
                </span>
              ))}
            </span>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-5 text-[10px] leading-5 text-[hsl(var(--color-content-muted))]">
          <strong className="font-semibold text-[hsl(var(--color-content))]">Disclaimer:</strong>{" "}
          Prices, specifications, vehicle availability and other information displayed on Progressive
          AutoHub may change without notice. Vehicle images may be representative unless otherwise
          stated. Actual condition, features, ownership history and inspection details should be
          verified before purchase. Financing is provided by partner banks and NBFCs and is subject
          to eligibility, documentation, credit assessment and final approval. Progressive AutoHub
          does not guarantee loan approval, pricing or availability.
        </p>
      </div>
    </footer>
  );
}
