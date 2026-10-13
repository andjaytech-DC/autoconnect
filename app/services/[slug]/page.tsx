import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  ClipboardCheck,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

interface ServiceDetailPageProps {
  params: Promise<{ slug: string }>;
}

interface ServiceDef {
  slug: string;
  badge: string;
  title: string;
  gradient: string;
  headline: string[];
  intro: string;
  steps: { title: string; desc: string }[];
  ctaLabel: string;
  ctaHref: string;
  ctaSecondary?: { label: string; href: string };
}

const SERVICES: Record<string, ServiceDef> = {
  inspection: {
    slug: "inspection",
    badge: "Car Inspection",
    title: "Car Inspection",
    gradient: "from-[#FFC700] to-[#3b82f6]",
    headline: ["Independent inspection,", "before you buy"],
    intro:
      "Book an independent vehicle inspection and our team covers body, paint, engine, electricals, suspension and interior. Your inspection request is tracked end-to-end so you know exactly where it stands.",
    steps: [
      { title: "Book a slot", desc: "Pick a convenient time and location for your inspection." },
      { title: "We inspect", desc: "An engineer inspects the vehicle and records findings against the areas above." },
      { title: "Track the outcome", desc: "Follow the status of your inspection from request through to completion." },
    ],
    ctaLabel: "Check a report",
    ctaHref: "/car-check",
    ctaSecondary: { label: "Browse certified cars", href: "/cars" },
  },
  service: {
    slug: "service",
    badge: "Car Service",
    title: "Car Service",
    gradient: "from-sky-400 to-[#3b82f6]",
    headline: ["Routine service,", "done right"],
    intro:
      "Schedule preventive maintenance, periodic servicing and manufacturer-recommended care from verified providers — with transparent pricing and genuine parts.",
    steps: [
      { title: "Choose your service", desc: "Pick periodic, comprehensive or manufacturer-specific servicing." },
      { title: "Compare providers", desc: "Review verified workshops and pricing near you." },
      { title: "Get it serviced", desc: "Book, track and collect your car with a full service record." },
    ],
    ctaLabel: "Find a provider",
    ctaHref: "/services",
  },
  repair: {
    slug: "repair",
    badge: "Car Repair",
    title: "Car Repair",
    gradient: "from-amber-400 to-orange-400",
    headline: ["Repairs you can", "trust"],
    intro:
      "From denting and painting to AC, electricals and mechanical repairs, connect with trusted service providers who back their work.",
    steps: [
      { title: "Describe the issue", desc: "Tell us what needs fixing — body, engine, AC or electricals." },
      { title: "Get a quote", desc: "Receive transparent estimates from verified partners." },
      { title: "Complete the repair", desc: "Authorise, get it fixed and review the work." },
    ],
    ctaLabel: "Find a provider",
    ctaHref: "/services",
  },
  "roadside-assistance": {
    slug: "roadside-assistance",
    badge: "Roadside Assistance",
    title: "Roadside Assistance",
    gradient: "from-[#FFC700] to-yellow-300",
    headline: ["Help, wherever you are,", "24/7"],
    intro:
      "Breakdown? Flat tyre? Out of fuel? Our roadside assistance network gets you moving again — available day and night across India.",
    steps: [
      { title: "Call for help", desc: "Reach 24/7 assistance from wherever you're stranded." },
      { title: "We dispatch", desc: "The nearest trusted provider is sent to your location." },
      { title: "Back on the road", desc: "Repair on site or tow to a secure facility." },
    ],
    ctaLabel: "Explore all services",
    ctaHref: "/services",
  },
};

export function generateStaticParams() {
  return Object.keys(SERVICES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ServiceDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = SERVICES[slug as string];
  if (!service) return { title: "Service not found — Progressive AutoHub" };
  return {
    title: `${service.title} — Progressive AutoHub`,
    description: service.intro,
  };
}
export default async function ServiceDetailPage({
  params,
}: ServiceDetailPageProps) {
  const { slug } = await params;
  const service = SERVICES[slug as string];
  if (!service) notFound();

  const icons = [ClipboardCheck, Wrench, HeartHandshake];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">

      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--color-bg-dark)] text-white">
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#FFC700]/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#FFC700]">
            <Sparkles size={14} aria-hidden="true" />
            {service.badge}
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            {service.headline[0]}{" "}
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${service.gradient}`}>
              {service.headline[1]}
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-slate-300 sm:text-lg">{service.intro}</p>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-12" aria-label="How it works">
        <div className="grid gap-6 md:grid-cols-3">
          {service.steps.map((step, index) => {
            const Icon = icons[index % icons.length];
            return (
              <div
                key={step.title}
                className="rounded-2xl border border-line bg-card p-8 transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-[#FFC700]">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <span className="text-3xl font-extrabold text-[var(--color-text-muted)]/30">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-content">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-content-muted">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Reassurance */}
      <section className="border-y border-divider bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-12">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, label: "Verified providers", desc: "Background-checked partners." },
              { icon: BadgeCheck, label: "Transparent pricing", desc: "Clear quotes, no surprises." },
              { icon: Clock, label: "On-time service", desc: "Tracked scheduling and status." },
              { icon: MapPin, label: "Pan-India network", desc: "Coverage across major cities." },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2 text-center">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-[#FFC700]">
                  <item.icon size={20} aria-hidden="true" />
                </span>
                <h3 className="text-sm font-bold text-content">{item.label}</h3>
                <p className="text-xs text-content-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-y border-divider bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-14 text-center sm:flex-row sm:text-left lg:px-12">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-content sm:text-3xl">
              Ready to get started?
            </h2>
            <p className="mt-3 text-content-muted">
              Explore all automotive services and verified providers on the Progressive AutoHub platform.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={service.ctaHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFC700] to-yellow-500 px-7 py-3.5 text-sm font-bold text-[#15130a] shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl"
            >
              {service.ctaLabel}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            {service.ctaSecondary && (
              <Link
                href={service.ctaSecondary.href}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-card px-7 py-3.5 text-sm font-bold text-content transition-colors hover:text-[#FFC700]"
              >
                {service.ctaSecondary.label}
              </Link>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}