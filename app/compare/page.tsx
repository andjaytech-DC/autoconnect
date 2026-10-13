import { Suspense } from "react";
import type { Metadata } from "next";
import CompareClient from "@/app/components/compare/CompareClient";

export const metadata: Metadata = {
  title: "Compare Cars — Progressive AutoHub",
  description: "Compare up to 4 cars side by side — price, specs, features and more.",
};

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Compare Cars</h1>
          <p className="mt-1 text-sm text-slate-400">Select up to 4 vehicles to compare specifications, pricing and features.</p>
        </div>
      </section>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-12">
        <Suspense fallback={<p className="text-content-muted">Loading…</p>}>
          <CompareClient />
        </Suspense>
      </main>
    </div>
  );
}
