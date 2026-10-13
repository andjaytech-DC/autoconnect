import type { Metadata } from "next";
import DealerRegisterClient from "@/app/components/dealer/DealerRegisterClient";

export const metadata: Metadata = {
  title: "Register as a Dealer — Progressive AutoHub",
  description: "Join the Progressive AutoHub dealer network. Apply to list your inventory.",
};

export default function DealerRegisterPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Register as a Dealer</h1>
          <p className="mt-1 text-sm text-slate-400">Apply to join our dealer network. Applications are reviewed by our team.</p>
        </div>
      </section>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-12"><DealerRegisterClient /></main>
    </div>
  );
}
