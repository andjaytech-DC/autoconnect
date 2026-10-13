
const sections = [
  {
    title: "Information We Collect",
    body: [
      "Account details you provide, such as name, email and phone number.",
      "Listing and inquiry data, including cars you browse, save or enquire about.",
    ],
  },
  {
    title: "How We Use Your Data",
    body: [
      "To operate the marketplace — matching you with relevant listings, dealers and finance offers.",
      "To communicate transactional updates about your inquiries, bookings and applications.",
    ],
  },
  {
    title: "Sharing & Disclosure",
    body: [
      "We do not sell your personal information.",
      "Data is shared only with service providers essential to delivering services you request (e.g. partner banks for finance applications you explicitly submit) and when required by law.",
    ],
  },
  {
    title: "Full Policy",
    body: [
      "This page is a structural placeholder. The complete privacy policy — including data retention, security practices, your rights and grievance-officer contact details — will be published here once reviewed by our legal team.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">

      <section className="max-w-3xl mx-auto w-full px-6 py-20" aria-label="Privacy policy">
        <h1 className="text-4xl font-extrabold tracking-tight mb-3">Privacy Policy</h1>
        <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold px-4 py-1.5 mb-4">
          Placeholder document — pending legal review
        </p>
        <p className="text-sm text-content-muted mb-8">
          This is a template preview. The final Privacy Policy will be published after
          legal review.
        </p>

        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-xl font-bold text-content tracking-tight mb-4">{s.title}</h2>
              <ul className="list-disc pl-5 space-y-3 text-sm text-content-muted leading-relaxed">
                {s.body.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

    </div>
  );
}
