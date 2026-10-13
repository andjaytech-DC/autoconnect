import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_EMAIL, SUPPORT_PHONE, telHref } from "@/app/data/navigation";

export const metadata: Metadata = {
  title: "About Us — Progressive AutoHub",
  description:
    "India's marketplace for certified pre-owned cars. Recorded inspections, transparent pricing and digital finance applications.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Us — Progressive AutoHub",
    description:
      "India's marketplace for certified pre-owned cars with recorded inspections and transparent pricing.",
    url: "https://progressiveautohub.com/about",
    siteName: "Progressive AutoHub",
    type: "website",
  },
};

const values = [
  {
    title: "Transparency First",
    description:
      "Every listing carries a transparent price and a recorded inspection.",
  },
  {
    title: "Customer Obsession",
    description:
      "From instant finance approval to pan-India doorstep delivery, we design around your convenience.",
  },
  {
    title: "Trust at Scale",
    description:
      "Every listing carries a recorded inspection and a transparent price, and anything we cannot verify is labelled as unverified.",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-glass-scene flex flex-col font-sans text-white">

      {/* Hero */}
      <section className="text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 text-center">
          <span className="inline-block bg-emerald-500/15 border border-[#FFC700]/30 text-[#FFC700] text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-6">
            About Us
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto leading-tight">
            India&apos;s trusted marketplace for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFC700] to-[#3b82f6]">
              certified pre-owned cars
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
            Progressive AutoHub makes buying, selling and financing a used car safe,
            simple and transparent — so it never feels like a gamble.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-4xl mx-auto w-full px-6 py-16" aria-label="Our story">
        <h2 className="text-2xl font-bold text-content tracking-tight mb-6">Our Story</h2>
        <div className="space-y-4 text-content-muted leading-relaxed">
          <p>
            We started AutoHub with one belief: buying a pre-owned car should be as
            confident an experience as buying new. Too many buyers were overpaying for
            cars with hidden problems, and too many sellers were settling for less than
            their vehicle was worth.
          </p>
          <p>
            Our inspection process, transparent pricing and digital finance
            applications are built to make buying a used car less risky.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="max-w-7xl mx-auto w-full px-6 lg:px-12 pb-16" aria-label="Our values">
        <h2 className="text-2xl font-bold text-content tracking-tight mb-8">What We Stand For</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {values.map((v) => (
            <div key={v.title} className="bg-card rounded-2xl border border-line p-8">
              <h3 className="font-bold text-content text-lg mb-2">{v.title}</h3>
              <p className="text-sm text-content-muted leading-relaxed">{v.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="bg-surface border-y border-divider scroll-mt-20" id="contact">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-content tracking-tight mb-4">Get in Touch</h2>
          <p className="text-content-muted mb-2">
            Call us:{" "}
            <a href={telHref(SUPPORT_PHONE)} className="font-semibold text-content hover:underline">
              {SUPPORT_PHONE}
            </a>{" "}
            (Mon–Sat, 9am–7pm)
          </p>
          <p className="text-content-muted">
            Email:{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-semibold text-content hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/cars"
              className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-gradient-to-r from-[hsl(var(--color-primary))] to-yellow-500 text-[hsl(var(--color-primary-foreground))] font-semibold shadow-md shadow-[hsl(var(--color-primary)/0.25)] hover:shadow-lg transition-all"
            >
              Browse Certified Cars
            </Link>
            <Link
              href="/sell"
              className="inline-flex items-center justify-center px-8 py-3 rounded-xl border border-line bg-card font-semibold text-content hover:border-[hsl(var(--color-primary)/0.6)] hover:text-[hsl(var(--color-primary-strong))] transition-all"
            >
              Sell Your Car
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
