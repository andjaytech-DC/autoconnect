"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";

import HeroSlider from "@/app/components/heroSlider";
import { SUPPORT_WHATSAPP } from "@/app/data/navigation";

interface HeroSectionProps {
  children: React.ReactNode;
}

export function HeroSection({ children }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden" aria-label="Hero">
      <div
        className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-[hsl(var(--color-primary)/0.1)] blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-32 top-1/4 h-[380px] w-[380px] rounded-full bg-amber-200/30 blur-[100px]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-6 py-14 lg:px-12 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--color-primary)/0.4)] bg-[hsl(var(--color-primary)/0.15)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--color-primary-strong))]">
              <Sparkles size={11} aria-hidden="true" />
              Progressive Auto Sports
            </span>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-[hsl(var(--color-content))] sm:text-4xl lg:text-5xl leading-[1.1]">
              Premium Pre-Owned
              <br />
              <span className="text-[hsl(var(--color-primary-strong))]">Luxury Cars</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-[hsl(var(--color-content-muted))] sm:text-base">
              Exclusive deals on certified pre-owned luxury vehicles.
              Personalized service and transparent pricing for the discerning buyer.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/cars"
                className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--color-primary))] px-6 py-3 text-sm font-bold text-[hsl(var(--color-primary-foreground))] shadow-[var(--shadow-subtle)] transition hover:brightness-105 hover:shadow-[var(--shadow-elevated)]"
              >
                Browse Exclusive Collection <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link
                href="/sell"
                className="inline-flex items-center rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] px-6 py-3 text-sm font-semibold text-[hsl(var(--color-content))] shadow-[var(--shadow-subtle)] transition hover:border-[hsl(var(--color-line-hover))] hover:shadow-[var(--shadow-elevated)]"
              >
                Sell Your Car
              </Link>
              <a
                href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--color-whatsapp))] px-5 py-3 text-sm font-bold text-[hsl(var(--color-whatsapp-foreground))] transition hover:bg-[hsl(var(--color-whatsapp-hover))] hover:shadow-[var(--shadow-elevated)]"
              >
                Chat on WhatsApp <MessageCircle size={14} aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="hidden lg:block animate-rise rise-delay-2">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HeroSliderWrapper() {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem] border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] shadow-[var(--shadow-elevated)]">
      <HeroSlider />
    </div>
  );
}