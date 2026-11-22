import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import BookServiceForm from "@/app/components/services/BookServiceForm";

export const metadata: Metadata = {
  title: "Request a service — Progressive AutoHub",
  description: "Request a car service from a provider on Progressive AutoHub.",
  robots: { index: false },
};

type SearchParams = Promise<{ category?: string; provider?: string }>;

export default async function BookServicePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  // Only well-formed values are handed to the client component.
  const category = /^[A-Z][A-Z_]{1,30}$/.test(sp.category ?? "") ? sp.category : undefined;
  const provider = /^\d{1,9}$/.test(sp.provider ?? "") ? Number(sp.provider) : undefined;

  return (
    <div className="min-h-screen bg-[hsl(var(--color-bg))] text-[hsl(var(--color-content))]">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/services" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[hsl(var(--color-primary-strong))] hover:underline">
          <ArrowLeft size={15} aria-hidden="true" /> All services
        </Link>
        <div className="mt-4"><span className="eyebrow">Service request</span></div>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Book a service</h1>
        <div className="gold-rule mt-4 max-w-[10rem]" aria-hidden="true" />
        <p className="mt-4 text-sm leading-6 text-[hsl(var(--color-content-muted))]">
          This sends a <strong>request</strong>. The provider’s availability decides whether it is
          confirmed, and we’ll update you at every step.
        </p>
        <div className="mt-8">
          <BookServiceForm initialCategory={category} initialProvider={provider} />
        </div>
      </div>
    </div>
  );
}
