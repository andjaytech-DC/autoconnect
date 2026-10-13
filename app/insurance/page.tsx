import type { Metadata } from "next";
import InsuranceClient from "@/app/components/insurance/InsuranceClient";

export const metadata: Metadata = {
  title: "Car Insurance — Progressive AutoHub",
  description: "Get a car insurance quote. Compare plans and renew your policy.",
};

export default function InsurancePage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Car Insurance</h1>
          <p className="mt-1 text-sm text-slate-400">New policies, renewals and comparisons — register an enquiry and our team will assist you.</p>
        </div>
      </section>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-12"><InsuranceClient /></main>
    </div>
  );
}
