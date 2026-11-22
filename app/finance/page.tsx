import type { Metadata } from "next";
import FinanceClient from "@/app/components/finance/FinanceClient";
import PageHeader from "@/app/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Car Finance & EMI Calculator — Progressive AutoHub",
  description: "Calculate EMI and apply for car finance with flexible tenures and competitive rates.",
};

export default function FinancePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--color-bg))] font-sans text-[hsl(var(--color-content))]">
      <PageHeader
        eyebrow="Car finance"
        title="Car Finance"
        description="Calculate your EMI and apply for financing in minutes."
      />
      <div className="page-container flex-1 py-10">
        {/* One wizard serves the menu's "Car Loans", "EMI Calculator" and "Apply for Finance" links. */}
        <span id="loans" className="block scroll-mt-28" aria-hidden="true" />
        <span id="apply" className="block scroll-mt-28" aria-hidden="true" />
        <span id="emi-calculator" className="block scroll-mt-28" aria-hidden="true" />
        <FinanceClient />
      </div>
    </div>
  );
}
