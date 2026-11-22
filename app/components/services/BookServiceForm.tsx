'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, LogIn } from 'lucide-react';

import {
  TIME_SLOTS,
  istDate,
  type ServiceCategory,
  type ServiceProviderLite,
} from '@/app/lib/service-booking';

const labelCls = 'mb-1.5 block text-sm font-semibold text-[hsl(var(--color-content))]';
const fieldCls =
  'min-h-11 w-full rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] px-3 py-2 text-sm text-[hsl(var(--color-content))] placeholder:text-[hsl(var(--color-content-faint))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] disabled:opacity-60';
const hintCls = 'mt-1 text-xs text-[hsl(var(--color-content-muted))]';

type Me = 'loading' | 'anon' | { name: string };

interface Props {
  initialCategory?: string;
  initialProvider?: number;
}

export default function BookServiceForm({ initialCategory, initialProvider }: Props) {
  const [me, setMe] = useState<Me>('loading');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loadError, setLoadError] = useState('');

  const [category, setCategory] = useState(initialCategory ?? '');
  const [city, setCity] = useState('');
  const [providerId, setProviderId] = useState<number | ''>(initialProvider ?? '');
  const [providers, setProviders] = useState<ServiceProviderLite[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [vehicleDetails, setVehicleDetails] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState<string>('10:00');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ id: number; service: string; provider: string } | null>(null);

  // Who is signed in, and the catalogue.
  useEffect(() => {
    let live = true;
    fetch('/api/auth/me')
      .then(async (r) => {
        if (!live) return;
        if (!r.ok) return setMe('anon');
        const d = await r.json();
        setMe({ name: d.user?.name ?? '' });
        setName((cur) => cur || d.user?.name || '');
      })
      .catch(() => live && setMe('anon'));
    fetch('/api/services/categories')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d) => live && setCategories((d.categories ?? []).filter((c: ServiceCategory) => c.bookable)))
      .catch(() => live && setLoadError('We couldn’t load the services right now. Please try again shortly.'));
    return () => {
      live = false;
    };
  }, []);

  const selected = useMemo(() => categories.find((c) => c.code === category), [categories, category]);

  // Providers that REALLY offer the chosen service (and city, if chosen).
  useEffect(() => {
    if (!category) return;
    let live = true;
    const qs = new URLSearchParams({ service: category, limit: '50' });
    if (city) qs.set('city', city);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for the fetch below
    setProvidersLoading(true);
    fetch(`/api/services/providers?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        const list: ServiceProviderLite[] = d.providers ?? [];
        setProviders(list);
        // Drop a provider that no longer fits the filters.
        setProviderId((cur) => (cur !== '' && list.some((p) => p.id === cur) ? cur : ''));
      })
      .catch(() => live && setProviders([]))
      .finally(() => live && setProvidersLoading(false));
    return () => {
      live = false;
    };
  }, [category, city]);

  // Arriving from "Book here" on a provider: take its city and a bookable service.
  useEffect(() => {
    if (!initialProvider || category || categories.length === 0) return;
    fetch('/api/services/providers?limit=50')
      .then((r) => r.json())
      .then((d) => {
        const p = (d.providers ?? []).find((x: ServiceProviderLite) => x.id === initialProvider);
        const code = p?.services.find((s: string) => categories.some((c) => c.code === s));
        if (p && code) {
          setCategory(code);
          setCity(p.city);
          setProviderId(p.id);
        }
      })
      .catch(() => undefined);
  }, [initialProvider, category, categories]);

  const cities = selected?.cities ?? [];
  const canSubmit =
    me !== 'anon' && me !== 'loading' && category && providerId !== '' && name.trim() && phone.trim() && date && time && !submitting;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || typeof providerId !== 'number') return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/service-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          categoryCode: category,
          customerName: name,
          customerPhone: phone,
          vehicleReg: vehicleReg || undefined,
          vehicleDetails: vehicleDetails || undefined,
          notes: notes || undefined,
          preferredDate: date,
          preferredTime: time,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setMe('anon');
        return;
      }
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setDone({
        id: data.data?.id,
        service: selected?.name ?? 'Service',
        provider: providers.find((p) => p.id === providerId)?.name ?? 'the provider',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="rounded-2xl border border-[hsl(var(--color-primary)/0.5)] bg-[hsl(var(--color-card))] p-8 text-center">
        <CheckCircle2 size={40} className="mx-auto text-[hsl(var(--color-success))]" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-bold">Request received</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[hsl(var(--color-content-muted))]">
          Your <strong>{done.service}</strong> request for <strong>{done.provider}</strong> is in. It is{' '}
          <strong>not confirmed yet</strong> — we’ll check it against the provider’s availability and update the
          status. You can follow it any time.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/services/my-bookings" className="btn btn-primary">Track my booking</Link>
          <Link href="/services" className="btn btn-secondary">Back to services</Link>
        </div>
      </div>
    );
  }

  if (me === 'loading') {
    return <p role="status" className="text-sm text-[hsl(var(--color-content-muted))]">Loading…</p>;
  }

  if (me === 'anon') {
    return (
      <div className="rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-8 text-center">
        <LogIn size={30} className="mx-auto text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-bold">Sign in to request a service</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[hsl(var(--color-content-muted))]">
          Your booking is saved to your account so you can track every step and cancel it if your plans change.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="btn btn-primary">Sign in</Link>
          <Link href="/register" className="btn btn-secondary">Create an account</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6 rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-6 sm:p-8">
      {loadError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loadError}</p>
      )}

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">Service and provider</legend>
        <div className="sm:col-span-2">
          <label htmlFor="svc-category" className={labelCls}>Service</label>
          <select
            id="svc-category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setCity('');
              setProviderId('');
            }}
            className={fieldCls}
            required
          >
            <option value="">Choose a service…</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          {selected?.description && <p className={hintCls}>{selected.description}</p>}
        </div>

        <div>
          <label htmlFor="svc-city" className={labelCls}>City</label>
          <select id="svc-city" value={city} onChange={(e) => setCity(e.target.value)} className={fieldCls} disabled={!category}>
            <option value="">Any city</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="svc-provider" className={labelCls}>Provider</label>
          <select
            id="svc-provider"
            value={providerId}
            onChange={(e) => setProviderId(e.target.value ? Number(e.target.value) : '')}
            className={fieldCls}
            disabled={!category || providersLoading}
            required
            aria-describedby="svc-provider-hint"
          >
            <option value="">{providersLoading ? 'Loading providers…' : 'Choose a provider…'}</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
            ))}
          </select>
          <p id="svc-provider-hint" className={hintCls}>
            {category && !providersLoading && providers.length === 0
              ? 'No provider offers this in the chosen city yet.'
              : 'Only providers who offer this service are listed.'}
          </p>
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">Your vehicle</legend>
        <div>
          <label htmlFor="svc-reg" className={labelCls}>Registration number <span className="font-normal text-[hsl(var(--color-content-muted))]">(optional)</span></label>
          <input id="svc-reg" value={vehicleReg} onChange={(e) => setVehicleReg(e.target.value.toUpperCase())} maxLength={20} placeholder="MH12AB1234" autoCapitalize="characters" className={fieldCls} />
        </div>
        <div>
          <label htmlFor="svc-vehicle" className={labelCls}>Make, model and year <span className="font-normal text-[hsl(var(--color-content-muted))]">(optional)</span></label>
          <input id="svc-vehicle" value={vehicleDetails} onChange={(e) => setVehicleDetails(e.target.value)} maxLength={120} placeholder="Honda City, 2019" className={fieldCls} />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">When</legend>
        <div>
          <label htmlFor="svc-date" className={labelCls}>Preferred date</label>
          <input id="svc-date" type="date" value={date} min={istDate(0)} max={istDate(180)} onChange={(e) => setDate(e.target.value)} className={fieldCls} required />
        </div>
        <div>
          <label htmlFor="svc-time" className={labelCls}>Preferred time</label>
          <select id="svc-time" value={time} onChange={(e) => setTime(e.target.value)} className={fieldCls} aria-describedby="svc-time-hint">
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <p id="svc-time-hint" className={hintCls}>A preference, not a reserved slot — the provider confirms.</p>
        </div>
      </fieldset>

      <div>
        <label htmlFor="svc-notes" className={labelCls}>What does the car need? <span className="font-normal text-[hsl(var(--color-content-muted))]">(optional)</span></label>
        <textarea id="svc-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={4} placeholder="e.g. AC is not cooling, rattling noise from the front left." className={fieldCls} />
        <p className={hintCls}>{notes.length}/1000</p>
      </div>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">Contact</legend>
        <div>
          <label htmlFor="svc-name" className={labelCls}>Your name</label>
          <input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" className={fieldCls} required />
        </div>
        <div>
          <label htmlFor="svc-phone" className={labelCls}>Mobile number</label>
          <input id="svc-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} autoComplete="tel" placeholder="98765 43210" className={fieldCls} required aria-describedby="svc-phone-hint" />
          <p id="svc-phone-hint" className={hintCls}>The provider uses this to confirm your booking.</p>
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={!canSubmit} className="btn btn-primary min-w-44">
          {submitting ? (<><Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" /> Sending…</>) : 'Send request'}
        </button>
        <p className="text-xs leading-5 text-[hsl(var(--color-content-muted))]">
          We use your details only to arrange this service.
        </p>
      </div>
    </form>
  );
}
