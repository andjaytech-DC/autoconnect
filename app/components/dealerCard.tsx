import Link from "next/link";
import { MapPin, Phone, Star, Car, ArrowUpRight } from "lucide-react";
import type { UiDealer } from "@/app/lib/nest-public";

interface DealerCardProps {
  dealer: UiDealer;
}

/**
 * Reusable dealer card used on the listing page.
 * Shows logo, name, rating, location, contact and quick actions.
 */
export default function DealerCard({ dealer }: DealerCardProps) {
  return (
    <article className="bg-card rounded-2xl border border-line p-7 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br ${dealer.logoGradient} flex items-center justify-center text-white font-bold text-xl`}
            aria-hidden="true"
          >
            {dealer.logo}
          </div>
          <h3 className="font-bold text-content text-lg leading-snug">
            <Link
              href={`/dealers/${dealer.id}`}
              className="hover:text-[#FFC700] transition-colors"
            >
              {dealer.name}
            </Link>
          </h3>
        </div>
        {/* rating is clamped to 0 by the mapper because the backend does not
            supply reviews yet; rendering "0.0" would show a placeholder as a
            real score. */}
        {dealer.reviewCount > 0 && (
          <span className="inline-flex items-center gap-1 shrink-0 bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-md">
            <Star size={12} className="fill-[#FFC700]" aria-hidden="true" />
            {dealer.rating.toFixed(1)}
          </span>
        )}
      </div>

      <div className="space-y-2.5 text-sm text-content-muted mb-6">
        <p className="flex items-start gap-2">
          <MapPin size={15} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>{dealer.address}</span>
        </p>
        <p className="flex items-center gap-2">
          <Phone size={15} aria-hidden="true" />
          {dealer.phone ? (
            <a
              href={`tel:${dealer.phone.replace(/\s/g, "")}`}
              className="hover:text-[#FFC700] transition-colors"
            >
              {dealer.phone}
            </a>
          ) : (
            // Contact details are released only to a signed-in session.
            <Link href="/login" className="underline hover:text-[#FFC700]">
              Sign in to view phone
            </Link>
          )}
        </p>
        <p className="flex items-center gap-2">
          <Car size={15} aria-hidden="true" />
          {dealer.carsAvailable} cars available
        </p>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2">
        <Link
          href={`/dealers/${dealer.id}`}
          className="inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FFC700] text-[#15130a] font-semibold hover:brightness-110 transition-colors"
        >
          <ArrowUpRight size={16} aria-hidden="true" />
          Details
        </Link>
        <Link
          href="/cars"
          className="inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-line font-semibold text-content hover:border-[#FFC700]/60 hover:text-[#FFC700] transition-colors"
        >
          <Car size={16} aria-hidden="true" />
          Inventory
        </Link>
      </div>
    </article>
  );
}
