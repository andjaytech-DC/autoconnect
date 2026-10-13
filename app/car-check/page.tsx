import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  History,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import CarCheckLookup from "@/app/components/carCheckLookup";

export const metadata: Metadata = {
  title: "Car Check & Vehicle History — Progressive AutoHub",
  description:
    "Learn how Progressive AutoHub inspects vehicle condition and registers certification before a listing goes live.",
};

/**
 * These describe the process the platform actually runs today. Earlier copy
 * here promised a "200-point" scored report, RC/loan cross-checks and full
 * service/accident history — none of which are implemented, so the claims were
 * removed rather than left as marketing fiction.
 */
const checks = [
  {
    icon: ClipboardCheck,
    title: "Physical Condition Check",
    desc: "Body, paint, engine, electricals, suspension and interior are inspected and the findings recorded against the vehicle.",
  },
  {
    icon: History,
    title: "Inspection Request Tracking",
    desc: "Every inspection is a tracked request — from booking through to completion — so its status is always visible.",
  },
  {
    icon: BadgeCheck,
    title: "Document Checklist",
    desc: "Registration and supporting documents are reviewed as part of the inspection record.",
  },
  {
    icon: ShieldCheck,
    title: "Certified Before Listing",
    desc: "Vehicles are marked certified only after an inspection has actually been completed.",
  },
];

export default function CarCheckPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#FFC700]/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#FFC700]">
            <Sparkles size={14} aria-hidden="true" />
            Car Check
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Know the car{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFC700] to-[#3b82f6]">
              before you buy
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-slate-300 sm:text-lg">
            Every Progressive AutoHub vehicle is backed by a recorded
            inspection — so a used car never feels like a gamble.
          </p>
        </div>
      </section>

      {/* Live inspection lookup */}
      <section
        className="mx-auto max-w-7xl px-6 py-14 lg:px-12"
        aria-label="Look up an inspection report"
      >
        <div className="mb-8 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-[#FFC700]">
            Lookup
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-content">
            Check a vehicle&apos;s inspection report
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-content-muted">
            Enter a registration number to view a Progressive AutoHub inspection
            report from our verified dataset.
          </p>
        </div>
        <CarCheckLookup />
      </section>

      {/* Checks grid */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-12" aria-label="What is checked">
        <div className="grid gap-6 sm:grid-cols-2">
          {checks.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-line bg-card p-8 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-[#FFC700]">
                <c.icon size={22} aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-content">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-content-muted">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Standalone inspection CTA */}
      <section className="border-y border-divider bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-14 text-center sm:flex-row sm:text-left lg:px-12">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-content sm:text-3xl">
              Every certified listing ships with its report
            </h2>
            <p className="mt-3 text-content-muted">
              Use the lookup above to view a live report, then browse the
              marketplace for certified cars in stock.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/cars"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFC700] to-yellow-500 px-7 py-3.5 text-sm font-bold text-[#15130a] shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl"
            >
              Browse Certified Cars
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
