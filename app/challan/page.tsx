import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Gauge, Landmark, ShieldCheck } from "lucide-react";
import ChallanCheckForm from "@/app/components/challanForm";

export const metadata: Metadata = {
  title: "Vehicle Challan Check — Progressive AutoHub",
  description:
    "Understand how to check vehicle challans, pending traffic fines and RC-related notices. Live challan lookup is coming to Progressive AutoHub.",
};

const points = [
  {
    icon: Landmark,
    title: "What is a challan?",
    desc: "An official notice for a traffic/transit violation issued by state transport or traffic police authorities.",
  },
  {
    icon: Gauge,
    title: "Common violations",
    desc: "Overspeeding, careless driving, missing documents (RC, insurance, PUC), and unpaid toll/transit fees.",
  },
  {
    icon: FileText,
    title: "Why it matters",
    desc: "Unpaid challans can block vehicle fitness, insurance renewal, sale/ownership transfer and financing.",
  },
  {
    icon: ShieldCheck,
    title: "Selling or financing",
    desc: "A clean challan record on the RC makes your car easier to sell and finance. Clear dues before transfer.",
  },
];

export default function ChallanPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">

      {/* Hero */}
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 text-center lg:px-12">
          <span className="inline-block rounded-full border border-[#FFC700]/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#FFC700]">
            Challan &amp; Traffic Fines
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Check vehicle challans the{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFC700] to-[#3b82f6]">
              transparent way
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-300 sm:text-lg">
            Understand how challans work and how we&apos;ll soon show your
            vehicle&apos;s actual, verified pending fines — never fabricated results.
          </p>
        </div>
      </section>

      {/* Check form */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-12" aria-label="Check a challan">
        <h2 className="text-center text-3xl font-bold tracking-tight text-content">
          Try the challan check
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-content-muted">
          Enter your registration number to preview the flow.
        </p>
        <div className="mt-8">
          <ChallanCheckForm />
        </div>
      </section>

      {/* Info grid */}
      <section className="border-y border-divider bg-surface" aria-label="About challans">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:px-12">
          {points.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-line bg-card p-7 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-[#FFC700]">
                <p.icon size={20} aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-bold text-content">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-content-muted">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Data-source note */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center lg:px-12">
        <h2 className="text-2xl font-bold tracking-tight text-content">
          About this data
        </h2>
        <p className="mt-3 text-content-muted">
          Results come from Progressive AutoHub&apos;s sample challan dataset through
          <code className="mx-1 rounded bg-surface px-1.5 py-0.5 text-xs">/api/challan</code>
          — we never invent fines for an unknown plate. A live government/RTO
          integration will replace the sample source, and then{" "}
          <Link
            href="/car-check"
            className="inline-flex items-center gap-1 font-semibold text-[#FFC700] hover:text-[#FFC700]"
          >
            Car Check
            <ArrowRight size={15} aria-hidden="true" />
          </Link>{" "}
          gives you the full vehicle history and inspection report too.
        </p>
      </section>

    </div>
  );
}
