'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardList, MapPin, MessageSquareText, Phone, Wrench } from 'lucide-react';

import type { ServiceCategory, ServiceProviderLite } from '@/app/lib/service-booking';

const selectCls =
  'min-h-11 rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] px-3 text-sm text-[hsl(var(--color-content))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]';

const STEPS = [
  { icon: Wrench, title: 'Choose a service', body: 'Pick what your car needs from the providers who actually offer it.' },
  { icon: MessageSquareText, title: 'Send a request', body: 'Tell us the vehicle, a preferred date and what is wrong.' },
  { icon: ClipboardList, title: 'Track it', body: 'We confirm against the provider’s availability, and you follow each step.' },
];

export default function ServicesClient() {
  const [categories, setCategories] = useState<ServiceCategory[] | null>(null);
  const [categoryError, setCategoryError] = useState(false);
  const [providers, setProviders] = useState<ServiceProviderLite[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [contactAvailable, setContactAvailable] = useState(false);
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    let live = true;
    fetch('/api/services/categories')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => live && setCategories(d.categories ?? []))
      .catch(() => live && (setCategories([]), setCategoryError(true)));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    const qs = new URLSearchParams({ limit: '50' });
    if (category) qs.set('service', category);
    if (city) qs.set('city', city);
    fetch(`/api/services/providers?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        setProviders(d.providers ?? []);
        setContactAvailable(Boolean(d.contactAvailable));
      })
      .catch(() => live && setProviders([]))
      .finally(() => live && setProvidersLoading(false));
    return () => {
      live = false;
    };
  }, [category, city]);

  const bookable = useMemo(() => (categories ?? []).filter((c) => c.bookable), [categories]);
  const unavailable = useMemo(() => (categories ?? []).filter((c) => !c.bookable), [categories]);
  const nameByCode = useMemo(() => new Map((categories ?? []).map((c) => [c.code, c.name])), [categories]);
  const cities = useMemo(() => [...new Set(bookable.flatMap((c) => c.cities))].sort(), [bookable]);

  return (
    <div className="space-y-12">
      {/* How it works */}
      <ol className="grid gap-3 sm:grid-cols-3" aria-label="How booking works">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[#ECD48C] ring-1 ring-[hsl(var(--color-primary))]">
              <s.icon size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-[hsl(var(--color-content))]">
                {i + 1}. {s.title}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Categories */}
      <section aria-labelledby="available-services">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="eyebrow">Available now</span>
            <h2 id="available-services" className="mt-2 text-2xl font-bold sm:text-3xl">
              What do you need?
            </h2>
          </div>
          <Link
            href="/services/my-bookings"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[hsl(var(--color-primary-strong))] hover:underline"
          >
            My service bookings <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        {categories === null ? (
          <p role="status" className="text-sm text-[hsl(var(--color-content-muted))]">Loading services…</p>
        ) : categoryError ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            We couldn’t load the services right now. Please try again shortly.
          </p>
        ) : bookable.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-10 text-center">
            <Wrench size={30} className="mx-auto text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
            <p className="mt-3 text-sm text-[hsl(var(--color-content-muted))]">
              No service providers are available yet. Please check back soon.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {bookable.map((c) => (
              <li key={c.code} id={c.code === "ROADSIDE" ? "roadside" : undefined} className="flex scroll-mt-28 flex-col rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-5 shadow-[var(--shadow-subtle)] transition hover:border-[hsl(var(--color-primary)/0.7)] hover:shadow-[var(--shadow-elevated)]">
                <h3 className="text-lg font-bold leading-snug">{c.name}</h3>
                {c.description && (
                  <p className="mt-1.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">{c.description}</p>
                )}
                <p className="mt-3 flex items-start gap-1.5 text-xs text-[hsl(var(--color-content-muted))]">
                  <MapPin size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    {c.providerCount} provider{c.providerCount === 1 ? '' : 's'} · {c.cities.join(', ')}
                  </span>
                </p>
                <div className="mt-auto pt-4">
                  <Link
                    href={`/services/book?category=${encodeURIComponent(c.code)}`}
                    className="btn btn-primary btn-sm"
                    aria-label={`Book ${c.name}`}
                  >
                    Book <ArrowRight size={14} className="ml-1" aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        {unavailable.length > 0 && !categoryError && (
          <p className="mt-6 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
            <span className="font-semibold">Not available yet:</span>{' '}
            {unavailable.map((c) => c.name).join(' · ')}. We list a service only once a provider offers it.
          </p>
        )}
      </section>

      {/* Providers */}
      <section aria-labelledby="provider-directory">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Our providers</span>
            <h2 id="provider-directory" className="mt-2 text-2xl font-bold sm:text-3xl">
              Workshops and service centres
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="filter-category">Service</label>
            <select id="filter-category" value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
              <option value="">All services</option>
              {bookable.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="filter-city">City</label>
            <select id="filter-city" value={city} onChange={(e) => setCity(e.target.value)} className={selectCls}>
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {providersLoading ? (
          <p role="status" className="text-sm text-[hsl(var(--color-content-muted))]">Loading providers…</p>
        ) : providers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-10 text-center">
            <Wrench size={30} className="mx-auto text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
            <p className="mt-3 text-sm text-[hsl(var(--color-content-muted))]">No providers match this filter.</p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((p) => (
              <li key={p.id} className="flex flex-col rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-5">
                <h3 className="text-base font-bold">{p.name}</h3>
                <p className="mt-1 flex items-center gap-1 text-xs text-[hsl(var(--color-content-muted))]">
                  <MapPin size={12} aria-hidden="true" /> {p.city}
                  {contactAvailable && p.address ? ` · ${p.address}` : ''}
                </p>
                {p.description && (
                  <p className="mt-2 text-xs leading-5 text-[hsl(var(--color-content-muted))]">{p.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.services.map((code) => (
                    <span key={code} className="rounded-full border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface-strong))] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--color-content-muted))]">
                      {nameByCode.get(code) ?? code}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[hsl(var(--color-line))] pt-3">
                  {contactAvailable && p.phone ? (
                    <a href={`tel:${p.phone}`} className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-[hsl(var(--color-content-muted))] hover:text-[hsl(var(--color-content))]">
                      <Phone size={13} aria-hidden="true" /> {p.phone}
                    </a>
                  ) : (
                    <Link href="/login" className="inline-flex min-h-11 items-center text-xs font-semibold text-[hsl(var(--color-primary-strong))] hover:underline">
                      Sign in to see contact details
                    </Link>
                  )}
                  <Link
                    href={`/services/book?provider=${p.id}${category ? `&category=${encodeURIComponent(category)}` : ''}`}
                    className="btn btn-outline btn-sm"
                  >
                    Book here
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
