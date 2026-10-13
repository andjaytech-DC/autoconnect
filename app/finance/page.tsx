import type { Metadata } from "next";
import FinanceClient from "@/app/components/finance/FinanceClient";

export const metadata: Metadata = {
  title: "Car Finance & EMI Calculator — Progressive AutoHub",
  description: "Calculate EMI and apply for car finance with flexible tenures and competitive rates.",
};

export default function FinancePage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Car Finance</h1>
          <p className="mt-1 text-sm text-slate-400">Calculate your EMI and apply for financing in minutes.</p>
        </div>
      </section>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-12"><FinanceClient /></main>
    </div>
  );
}
