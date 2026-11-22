import type { Metadata } from "next";
import Link from "next/link";

import InsuranceClient from "@/app/components/insurance/InsuranceClient";
import InsuranceInfo from "@/app/components/insurance/InsuranceInfo";
import PageHeader from "@/app/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Car Insurance Enquiry — Progressive AutoHub",
  description:
    "Send a car insurance enquiry (new policy, renewal, comprehensive, third-party or add-ons) and we'll refer it to an insurance partner. Progressive AutoHub is not an insurer.",
};

export default function InsurancePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--color-bg))] font-sans text-[hsl(var(--color-content))]">
      <PageHeader
        eyebrow="Car insurance"
        title="Send an insurance enquiry"
        description="Tell us about your car and what you need. We refer your enquiry to an insurance partner, who contacts you with options. We're not an insurer, so any policy is issued by the partner."
        actions={
          <Link
            href="/insurance/my-enquiries"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-amber-300 underline-offset-4 hover:underline"
          >
            Already sent one? Track my enquiries →
          </Link>
        }
      />
      <div className="page-container flex-1 py-10">
        <InsuranceClient />
        <InsuranceInfo />
      </div>
    </div>
  );
}
