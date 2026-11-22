import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found — Progressive AutoHub",
  robots: { index: false },
};

const SHORTCUTS = [
  { label: "Browse used cars", href: "/cars" },
  { label: "New cars", href: "/new-cars" },
  { label: "Electric cars", href: "/electric-cars" },
  { label: "Sell your car", href: "/sell" },
  { label: "Car finance", href: "/finance" },
  { label: "Insurance", href: "/insurance" },
  { label: "Services", href: "/services" },
  { label: "Find a dealer", href: "/dealers" },
] as const;

/** Rendered for unknown URLs and whenever a page calls notFound(). */
export default function NotFound() {
  return (
    <div className="page-container section-y flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-display text-7xl font-bold leading-none text-primary-strong sm:text-8xl" aria-hidden="true">
        404
      </p>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-content sm:text-3xl">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-content-muted sm:text-base">
        The link may be out of date, or the car or page you&apos;re after may no longer be listed.
        Search our inventory or pick up from one of the places below.
      </p>

      {/* Plain GET form: works without JavaScript. */}
      <form action="/cars" method="get" role="search" className="mt-8 flex w-full max-w-md gap-2">
        <label htmlFor="nf-search" className="sr-only">
          Search cars by make or model
        </label>
        <input
          id="nf-search"
          name="q"
          type="search"
          placeholder="Search make or model"
          className="input-field min-h-11 flex-1"
        />
        <button type="submit" className="btn btn-primary gap-2" aria-label="Search">
          <Search size={16} aria-hidden="true" />
          <span className="hidden sm:inline">Search</span>
        </button>
      </form>

      <ul className="mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-2">
        {SHORTCUTS.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="chip hover:no-underline">
              {s.label}
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary-strong underline-offset-4 hover:underline"
      >
        Go to the home page <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </div>
  );
}
