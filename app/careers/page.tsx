import Link from "next/link";
import PageHeader from "@/app/components/ui/PageHeader";

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--color-bg))] flex flex-col font-sans text-[hsl(var(--color-content))]">

      <PageHeader eyebrow="Careers" title="Build the future of car ownership" align="center" size="lg" description="Join the team making India’s used-car market transparent, trusted and effortless." />

      {/* Openings */}
      <section className="max-w-3xl mx-auto w-full px-6 py-20" aria-label="Open positions">
        <div className="bg-card rounded-2xl border border-line p-10 text-center">
          <h2 className="text-xl font-bold text-content tracking-tight mb-3">Open Positions</h2>
          <p className="text-sm text-content-muted leading-relaxed mb-6">
            We don&apos;t have any roles published at the moment. This page will list
            current openings as they become available.
          </p>
          <Link
            href="/about#contact"
            className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-gradient-to-r from-[hsl(var(--color-primary))] to-yellow-500 text-[#15130a] font-semibold shadow-md shadow-amber-500/25 hover:shadow-lg transition-all"
          >
            Contact Us
          </Link>
        </div>
      </section>

    </div>
  );
}
