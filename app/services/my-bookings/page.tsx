import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import MyServiceBookings from "@/app/components/services/MyServiceBookings";

export const metadata: Metadata = {
  title: "My service bookings — Progressive AutoHub",
  robots: { index: false },
};

export default function MyServiceBookingsPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--color-bg))] text-[hsl(var(--color-content))]">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/services" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[hsl(var(--color-primary-strong))] hover:underline">
          <ArrowLeft size={15} aria-hidden="true" /> All services
        </Link>
        <div className="mt-4"><span className="eyebrow">My account</span></div>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">My service bookings</h1>
        <div className="gold-rule mt-4 max-w-[10rem]" aria-hidden="true" />
        <div className="mt-8">
          <MyServiceBookings />
        </div>
      </div>
    </div>
  );
}
