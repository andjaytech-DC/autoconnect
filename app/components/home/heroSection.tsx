"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

import HeroSlider from "@/app/components/heroSlider";
import { SUPPORT_WHATSAPP } from "@/app/data/navigation";

interface HeroSectionProps {
  children: React.ReactNode;
}

/* Faint lozenge lattice — a nod to classic damask, kept at ~4% so it reads as
   texture, not pattern. Inline SVG data URI: no extra request. */
const LATTICE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Cpath d='M28 4 52 28 28 52 4 28Z' fill='none' stroke='%23C9A24B' stroke-opacity='.07' stroke-width='1'/%3E%3C/svg%3E\")";

export function HeroSection({ children }: HeroSectionProps) {
  return (
    <section
      className="relative isolate overflow-hidden bg-ink-900 text-white"
      aria-label="Hero"
    >
      {/* Royal depth: a lit crown of navy over a deeper base */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(90%_70%_at_50%_0%,#16245A_0%,#0A1128_55%,#060B1E_100%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-100"
        style={{ backgroundImage: LATTICE }}
        aria-hidden="true"
      />
      {/* Warm gold glow behind the headline */}
      <div
        className="pointer-events-none absolute -left-1/4 top-0 -z-10 h-[560px] w-[560px] rounded-full bg-[hsl(var(--color-primary)/0.10)] blur-[160px]"
        aria-hidden="true"
      />
      {/* Gold hairlines top and bottom frame the whole stage */}
      <div className="gold-rule absolute inset-x-0 top-0" aria-hidden="true" />
      <div className="gold-rule absolute inset-x-0 bottom-0" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-12 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* Content Column */}
          <div className="animate-rise">
            <p className="inline-flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-[#E2C97F]">
              <span className="h-px w-8 bg-[#C9A24B]" aria-hidden="true" />
              Progressive Auto Sports
            </p>
            <h1 className="mt-6 text-[2.2rem] font-bold leading-[1.08] sm:text-5xl xl:text-[3.4rem]">
              Premium Pre&#8209;Owned
              <br />
              <span className="text-gold-metal italic">Luxury Cars</span>
            </h1>

            <div className="ornament mt-7 max-w-[15rem]" aria-hidden="true">
              <span className="ornament__gem" />
            </div>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-[#C9CEDF] sm:text-lg">
              Exclusive deals on pre-owned luxury vehicles. Personalized service and
              transparent pricing for the discerning buyer.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/cars"
                className="btn btn-primary gap-2 px-7 text-sm focus-visible:ring-offset-[#0A1128]"
              >
                Explore Cars <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link
                href="/sell"
                className="btn gap-2 border border-[hsl(var(--color-primary)/0.55)] bg-white/[0.03] px-7 text-sm text-[#F3E7BE] hover:border-[hsl(var(--color-primary))] hover:bg-[hsl(var(--color-primary)/0.12)] focus-visible:ring-[#ECD48C] focus-visible:ring-offset-[#0A1128]"
              >
                Sell Your Car
              </Link>
              <a
                href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn gap-2 border border-white/20 px-6 text-sm text-white/90 hover:border-white/40 hover:bg-white/5 focus-visible:ring-white/70 focus-visible:ring-offset-[#0A1128]"
              >
                Chat on WhatsApp
                <MessageCircle size={14} className="text-emerald-400" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Visual Column — the vehicle slider is shown at every breakpoint. */}
          <div className="animate-rise rise-delay-2">{children}</div>
        </div>
      </div>
    </section>
  );
}

/**
 * The slider sits in an engraved gold frame: a 6px metal bezel (the gradient
 * padding) around a hairline-inset photograph.
 */
export function HeroSliderWrapper() {
  return (
    <div className="relative rounded-xl bg-gradient-to-b from-[#ECD48C] via-[#C9A24B] to-[#8A6724] p-[5px] shadow-[0_30px_60px_-24px_rgba(0,0,0,0.7)]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[0.5rem] ring-1 ring-black/40 sm:aspect-[16/9] lg:aspect-[4/3]">
        <HeroSlider />
      </div>
    </div>
  );
}
