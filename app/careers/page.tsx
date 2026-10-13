import Link from "next/link";

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">

      {/* Hero */}
      <section className="bg-[var(--color-bg-dark)] text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 text-center">
          <span className="inline-block bg-emerald-500/15 border border-[#FFC700]/30 text-[#FFC700] text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-6">
            Careers
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto leading-tight">
            Build the future of{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFC700] to-[#3b82f6]">
              car ownership
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
            Join the team making India&apos;s used-car market transparent, trusted and
            effortless.
          </p>
        </div>
      </section>

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
            className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-gradient-to-r from-[#FFC700] to-yellow-500 text-[#15130a] font-semibold shadow-md shadow-amber-500/25 hover:shadow-lg transition-all"
          >
            Contact Us
          </Link>
        </div>
      </section>

    </div>
  );
}
