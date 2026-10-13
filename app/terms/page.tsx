
const sections = [
  {
    title: "1. Using AutoHub",
    body:
      "AutoHub is a marketplace connecting buyers and sellers of pre-owned vehicles. By using the platform you agree to these terms.",
  },
  {
    title: "2. Listings & Pricing",
    body:
      "Prices shown on vehicle listings are indicative estimates based on inspection data and market trends until confirmed by the seller or dealer.",
  },
  {
    title: "3. Inspections & Returns",
    body:
      "Certified vehicles carry an inspection report and return-policy eligibility, subject to the specific conditions provided at purchase.",
  },
  {
    title: "4. Finance Applications",
    body:
      "Loan products are offered solely by partner banks and NBFCs, whose own terms govern approval, interest rates and repayment. AutoHub does not approve or disburse loans.",
  },
  {
    title: "5. Full Terms",
    body:
      "This page is a structural placeholder. The complete, binding terms and conditions will be published here once reviewed by our legal team.",
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">

      <section className="max-w-3xl mx-auto w-full px-6 py-20" aria-label="Terms and conditions">
        <h1 className="text-4xl font-extrabold tracking-tight mb-3">Terms &amp; Conditions</h1>
        <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold px-4 py-1.5 mb-4">
          Placeholder document — pending legal review
        </p>
        <p className="text-sm text-content-muted mb-8">
          This is a template preview. The final Terms &amp; Conditions will be published
          after legal review.
        </p>

        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-xl font-bold text-content tracking-tight mb-3">{s.title}</h2>
              <p className="text-sm text-content-muted leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>
      </section>

    </div>
  );
}
