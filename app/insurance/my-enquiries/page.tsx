import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import MyInsuranceEnquiries from "@/app/components/insurance/MyInsuranceEnquiries";

export const metadata: Metadata = {
  title: "My insurance enquiries — Progressive AutoHub",
  robots: { index: false },
};

export default function MyInsuranceEnquiriesPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--color-bg))] text-[hsl(var(--color-content))]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/insurance" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[hsl(var(--color-primary-strong))] hover:underline">
          <ArrowLeft size={15} aria-hidden="true" /> Insurance
        </Link>
        <div className="mt-4"><span className="eyebrow">My account</span></div>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">My insurance enquiries</h1>
        <div className="gold-rule mt-4 max-w-[10rem]" aria-hidden="true" />
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[hsl(var(--color-content-muted))]">
          Progressive AutoHub refers your enquiry to an insurance partner. Any quote shown here comes from the partner, and any policy is issued by them.
        </p>
        <div className="mt-8">
          <MyInsuranceEnquiries />
        </div>
      </div>
    </div>
  );
}
