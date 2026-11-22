'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, MessageCircle, Phone } from 'lucide-react';
import VehicleGallery from './VehicleGallery';
import { SUPPORT_PHONE, SUPPORT_WHATSAPP } from '@/app/data/navigation';

interface VehicleLite {
  id: number; title: string; brand: string; year: number; price: number;
  fuel: string; transmission: string; mileage: number; city: string;
  description: string; images: string[]; features: string[];
  videoUrl?: string; videoThumbnail?: string; videoTitle?: string;
}

const inputCls = 'w-full min-h-11 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-focus)/0.4)] text-content border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))]';

/** Avoids "Mercedes-Benz Mercedes-Benz S450" when the title already starts with the brand. */
function displayName(brand: string, title: string): string {
  const b = (brand ?? '').trim();
  const t = (title ?? '').trim();
  return b && t.toLowerCase().startsWith(b.toLowerCase()) ? t : `${b} ${t}`.trim();
}

/** Keeps digits only so a tel:/wa.me link works with spaces, +91 or dashes. */
function digits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

export default function VehicleDetailClient({
  vehicle, dealer, specs,
}: {
  vehicle: VehicleLite;
  dealer: { name: string; city: string; state: string | null; phone: string | null } | null;
  specs: { label: string; value: string | null | undefined }[];
}) {
  const [downPayment, setDownPayment] = useState(Math.round(vehicle.price * 0.2));
  const [rate, setRate] = useState(9.5);
  const [tenure, setTenure] = useState(60);
  const [tab, setTab] = useState<'contact' | 'testdrive'>('contact');

  const emi = useMemo(() => {
    const principal = Math.max(0, vehicle.price - downPayment);
    const r = rate / 12 / 100;
    if (principal === 0 || r === 0) return Math.round(principal / tenure);
    return Math.round((principal * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1));
  }, [vehicle.price, downPayment, rate, tenure]);

  const galleryImages = vehicle.images.map((url) => ({ url }));
  const name = displayName(vehicle.brand, vehicle.title);
  // Always the showroom's own WhatsApp line, never the dealer record's phone.
  const waNumber = digits(SUPPORT_WHATSAPP);
  const waText = encodeURIComponent(`Hi, I'm interested in the ${vehicle.year} ${name} (₹${vehicle.price.toLocaleString('en-IN')}) listed on Progressive Auto Sports.`);

  const openForm = (next: 'contact' | 'testdrive') => {
    setTab(next);
    document.getElementById('enquiry')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="pb-24 lg:pb-0">
      {/* ─── GALLERY + VEHICLE INFO ─── */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <VehicleGallery
          images={galleryImages}
          title={name}
          price={vehicle.price}
          year={vehicle.year}
          fuel={vehicle.fuel}
          transmission={vehicle.transmission}
          mileage={vehicle.mileage}
          city={vehicle.city}
          dealer={dealer}
        />

        <div>
          <h2 className="text-2xl font-extrabold text-content">{name}</h2>
          <p className="text-sm text-content-muted mt-1">{vehicle.year} · {vehicle.mileage.toLocaleString('en-IN')} km · {vehicle.fuel} · {vehicle.transmission}{vehicle.city ? ` · ${vehicle.city}` : ''}</p>
          <p className="mt-4 text-3xl font-extrabold text-[hsl(var(--color-primary-strong))]">₹{vehicle.price.toLocaleString('en-IN')}</p>

          {/* EMI Calculator */}
          <div className="mt-6 bento-tile p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-content-muted mb-4">EMI Calculator</h3>
            <div className="space-y-3 text-sm">
              <label className="block">Down Payment: <strong>₹{downPayment.toLocaleString('en-IN')}</strong>
                <input type="range" min={0} max={vehicle.price} step={10000} value={downPayment} onChange={(e) => setDownPayment(Number(e.target.value))} className="h-8 w-full accent-[hsl(var(--color-primary-strong))]" />
              </label>
              <label className="block">Interest Rate: <strong>{rate}% p.a.</strong>
                <input type="range" min={6} max={18} step={0.5} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="h-8 w-full accent-[hsl(var(--color-primary-strong))]" />
              </label>
              <label className="block">Tenure: <strong>{tenure} months</strong>
                <input type="range" min={12} max={84} step={6} value={tenure} onChange={(e) => setTenure(Number(e.target.value))} className="h-8 w-full accent-[hsl(var(--color-primary-strong))]" />
              </label>
              <p className="pt-2 text-lg">Monthly EMI: <strong className="text-[hsl(var(--color-primary-strong))]">₹{emi.toLocaleString('en-IN')}</strong></p>
            </div>
          </div>

          {/* Dealer info */}
          {dealer && (
            <div className="mt-6 bento-tile p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-content-muted mb-2">Seller</h3>
              <p className="font-semibold text-content">{dealer.name}</p>
              <p className="text-sm text-content-muted">{[dealer.city, dealer.state].filter(Boolean).join(', ')}</p>
              {/* Showroom line from site settings; the dealer record's phone is not shown. */}
              <a href={`tel:+91${digits(SUPPORT_PHONE)}`} className="mt-1 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[hsl(var(--color-primary-strong))] hover:underline">
                <Phone size={14} aria-hidden="true" /> {SUPPORT_PHONE}
              </a>
            </div>
          )}

          {/* CTA buttons */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => openForm('contact')}
              className="min-h-11 rounded-xl bg-[hsl(var(--color-primary))] px-3 py-3 text-sm font-bold text-[hsl(var(--color-primary-foreground))] transition hover:brightness-105">
              Contact Dealer
            </button>
            <button type="button" onClick={() => openForm('testdrive')}
              className="min-h-11 rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] px-3 py-3 text-sm font-bold text-content transition hover:bg-[hsl(var(--color-surface-strong))] active:shadow-none">
              Book Test Drive
            </button>
            <a href={`https://wa.me/${waNumber.length === 10 ? '91' : ''}${waNumber}?text=${waText}`} target="_blank" rel="noopener noreferrer"
              className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--color-whatsapp))] px-3 py-3 text-sm font-bold text-[hsl(var(--color-whatsapp-foreground))] transition hover:bg-[hsl(var(--color-whatsapp-hover))]">
              <MessageCircle size={16} aria-hidden="true" /> Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* ─── DESCRIPTION ─── */}
      {vehicle.description && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-content mb-2">Overview</h2>
          <p className="text-sm text-content-muted whitespace-pre-line">{vehicle.description}</p>
        </section>
      )}

      {/* ─── FEATURES ─── */}
      {vehicle.features.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-content mb-3">Features</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {vehicle.features.map((f) => (
              <p key={f} className="flex items-center gap-2 text-sm text-content"><CheckCircle2 size={16} className="text-[hsl(var(--color-primary-strong))] flex-shrink-0" /> {f}</p>
            ))}
          </div>
        </section>
      )}

      {/* ─── SPECIFICATIONS ─── */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-content mb-3">Specifications</h2>
        <div className="grid gap-x-8 sm:grid-cols-2 bento-tile p-5">
          {specs.filter((s) => s.value).map((s) => (
            <div key={s.label} className="flex justify-between py-2.5 border-b border-line last:border-0 text-sm">
              <span className="text-content-muted">{s.label}</span>
              <span className="font-medium text-content">{s.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CONTACT / TEST DRIVE FORMS ─── */}
      <section id="enquiry" className="mt-10 scroll-mt-24 bento-tile p-6">
        <div className="flex gap-2 mb-5">
          <button type="button" onClick={() => setTab('contact')} className={'min-h-11 px-4 py-2 rounded-lg text-sm font-semibold ' + (tab === 'contact' ? 'bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]' : 'bg-surface text-content')}>Contact Dealer</button>
          <button type="button" onClick={() => setTab('testdrive')} className={'min-h-11 px-4 py-2 rounded-lg text-sm font-semibold ' + (tab === 'testdrive' ? 'bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]' : 'bg-surface text-content')}>Book Test Drive</button>
        </div>
        {tab === 'contact' ? <ContactForm vehicleId={vehicle.id} /> : <TestDriveForm vehicleId={vehicle.id} />}
      </section>

      {/* Mobile sticky action bar (liquid glass) */}
      <div className="glass-liquid fixed inset-x-3 bottom-3 z-40 flex items-center gap-3 rounded-2xl p-2 pl-4 lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-content-muted">{name}</p>
          <p className="text-base font-extrabold text-content">₹{vehicle.price.toLocaleString('en-IN')}</p>
        </div>
        <button type="button" onClick={() => openForm('contact')} className="btn btn-primary min-h-11 rounded-xl px-5 text-sm font-bold">Enquire</button>
      </div>
    </div>
  );
}


function FormSuccess({ msg }: { msg: string }) {
  return <p className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-sm text-emerald-700 flex items-center gap-2"><CheckCircle2 size={16} /> {msg}</p>;
}

/** POSTs JSON and returns an error message, or null on success. Never throws. */
async function postForm(url: string, body: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return data.error || 'Something went wrong. Please try again.';
  } catch {
    return 'Could not reach the server. Check your connection and try again.';
  }
}

const labelCls = 'mb-1 block text-xs font-semibold text-content-muted';
const submitCls = 'sm:col-span-2 justify-self-start min-h-11 px-6 py-2.5 bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))] rounded-xl text-sm font-semibold hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60';

function ContactForm({ vehicleId }: { vehicleId: number }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form className="grid gap-4 sm:grid-cols-2 max-w-2xl" onSubmit={async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      setError(''); setDone(false); setBusy(true);
      const fd = new FormData(form);
      const err = await postForm('/api/leads', { vehicleId, customerName: fd.get('name'), customerPhone: fd.get('phone'), customerEmail: fd.get('email') || '', message: fd.get('message') || '' });
      setBusy(false);
      if (err) setError(err); else { setDone(true); form.reset(); }
    }}>
      <div className="sm:col-span-2" role="status" aria-live="polite">
        {done && <FormSuccess msg="Thanks! The dealer will contact you shortly." />}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
      <div><label htmlFor="lead-name" className={labelCls}>Your name</label><input id="lead-name" name="name" required autoComplete="name" className={inputCls} /></div>
      <div><label htmlFor="lead-phone" className={labelCls}>Phone number</label><input id="lead-phone" name="phone" required autoComplete="tel-national" className={inputCls} inputMode="numeric" maxLength={10} pattern="\d{10}" title="10-digit mobile number" /></div>
      <div className="sm:col-span-2"><label htmlFor="lead-email" className={labelCls}>Email (optional)</label><input id="lead-email" name="email" type="email" autoComplete="email" className={inputCls} /></div>
      <div className="sm:col-span-2"><label htmlFor="lead-message" className={labelCls}>Message</label><textarea id="lead-message" name="message" rows={3} placeholder="I'm interested in this vehicle. Please contact me." className={inputCls} /></div>
      <button type="submit" disabled={busy} className={submitCls}>{busy ? 'Sending…' : 'Send Enquiry'}</button>
    </form>
  );
}

function TestDriveForm({ vehicleId }: { vehicleId: number }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form className="grid gap-4 sm:grid-cols-2 max-w-2xl" onSubmit={async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      setError(''); setDone(false); setBusy(true);
      const fd = new FormData(form);
      const err = await postForm('/api/test-drives', { vehicleId, customerName: fd.get('name'), customerPhone: fd.get('phone'), preferredDate: fd.get('date'), preferredTime: fd.get('time') });
      setBusy(false);
      if (err) setError(err); else { setDone(true); form.reset(); }
    }}>
      <div className="sm:col-span-2" role="status" aria-live="polite">
        {done && <FormSuccess msg="Test drive requested! We'll confirm the slot soon." />}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
      <div><label htmlFor="td-name" className={labelCls}>Your name</label><input id="td-name" name="name" required autoComplete="name" className={inputCls} /></div>
      <div><label htmlFor="td-phone" className={labelCls}>Phone number</label><input id="td-phone" name="phone" required autoComplete="tel-national" className={inputCls} inputMode="numeric" maxLength={10} pattern="\d{10}" title="10-digit mobile number" /></div>
      <div><label htmlFor="td-date" className={labelCls}>Preferred date</label><input id="td-date" name="date" type="date" required min={new Date().toISOString().slice(0, 10)} className={inputCls} /></div>
      <div><label htmlFor="td-time" className={labelCls}>Preferred time</label>
        <select id="td-time" name="time" required className={inputCls} defaultValue="10:30 AM">
          {['10:30 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM'].map((t) => <option key={t}>{t}</option>)}
        </select></div>
      <button type="submit" disabled={busy} className={submitCls}>{busy ? 'Requesting…' : 'Request Test Drive'}</button>
    </form>
  );
}
