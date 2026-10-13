import type { Metadata } from "next";
import ServicesClient from "@/app/components/services/ServicesClient";

export const metadata: Metadata = {
  title: "Automotive Services — Progressive AutoHub",
  description: "Book car service, detailing, tyres, battery, AC service and roadside assistance.",
};

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Automotive Services</h1>
          <p className="mt-1 text-sm text-slate-400">Verified service providers across car care, repairs and roadside assistance.</p>
        </div>
      </section>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-12"><ServicesClient /></main>
    </div>
  );
}
