import type { Metadata } from "next";
import { BadgeCheck, FileText, Handshake, Phone } from "lucide-react";

import SellForm from "@/app/components/sell/SellForm";
import { SUPPORT_PHONE, telHref } from "@/app/data/navigation";

export const metadata: Metadata = {
  title: "Sell Your Car — Progressive Auto Sports",
  description:
    "Request a free, no-obligation valuation and sell your premium car with confidence. Connect with verified buyers and dealers.",
};

const steps = [
  {
    icon: FileText,
    title: "Tell us about your car",
    body: "Make, model, variant, year, fuel type and transmission — in one short step.",
  },
  {
    icon: BadgeCheck,
    title: "Describe its condition",
    body: "Kilometres driven, ownership, registration location and overall condition.",
  },
  {
    icon: Handshake,
    title: "We call you back",
    body: "Our team reviews your details and returns an indicative offer. No obligation to sell.",
  },
] as const;

/** Registration numbers are stored verbatim from the URL, so sanitise before rendering. */
function safeRegistration(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/[^A-Za-z0-9 -]/g, "").trim().slice(0, 20);
}

export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const registration = safeRegistration(q);

  return (
    <div className="bg-glass-scene min-h-screen font-sans text-[hsl(var(--color-content))]">
      <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-12 sm:px-6 lg:px-10 lg:pt-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
          {/* ---------------------------------------------------------- */}
          {/*  Copy                                                       */}
          {/* ---------------------------------------------------------- */}
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--color-primary-strong))]">
              Sell your car
            </span>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-[hsl(var(--color-content))] sm:text-4xl">
              Know what your car is worth — then sell it.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-[hsl(var(--color-content-muted))]">
              Get a transparent valuation and connect with verified buyers and dealers. You stay in
              control of the price and the timing.
            </p>

            {registration && (
              <div
                className="mt-6 flex items-start gap-3 rounded-2xl border border-[hsl(var(--color-primary)/0.45)] bg-[hsl(var(--color-primary))]/0.12 px-4 py-3.5"
                role="status"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--color-primary-strong))]">
                  IND
                </span>
                <div>
                  <p className="text-sm font-bold text-[hsl(var(--color-content))]">
                    {registration}
                  </p>
                  <p className="mt-0.5 text-xs text-[hsl(var(--color-content-muted))]">
                    Carried over from the quick valuation. Complete the form and our team will use
                    this registration to look up the vehicle.
                  </p>
                </div>
              </div>
            )}

            <ol className="mt-8 space-y-5">
              {steps.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))]">
                    <step.icon
                      size={17}
                      className="text-[hsl(var(--color-primary-strong))]"
                      aria-hidden="true"
                    />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[hsl(var(--color-content))]">
                      <span className="mr-1.5 text-[hsl(var(--color-primary-strong))]">
                        {i + 1}.
                      </span>
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-sm leading-6 text-[hsl(var(--color-content-muted))]">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex items-center gap-2.5 border-t border-[hsl(var(--color-line))] pt-6 text-sm text-[hsl(var(--color-content-muted))]">
              <Phone size={15} className="text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
              Prefer to talk? Call{" "}
              <a
                href={telHref(SUPPORT_PHONE)}
                className="font-semibold text-[hsl(var(--color-content))] underline decoration-[hsl(var(--color-primary))] underline-offset-4 transition hover:text-[hsl(var(--color-primary-strong))]"
              >
                {SUPPORT_PHONE}
              </a>
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/*  Form                                                       */}
          {/* ---------------------------------------------------------- */}
          <div>
            <SellForm initialRegistration={registration} />
          </div>
        </div>
      </main>
    </div>
  );
}
