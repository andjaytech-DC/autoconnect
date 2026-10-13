'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import VehicleGallery from './VehicleGallery';

interface VehicleLite {
  id: number; title: string; brand: string; year: number; price: number;
  fuel: string; transmission: string; mileage: number; city: string;
  description: string; images: string[]; features: string[];
  videoUrl?: string; videoThumbnail?: string; videoTitle?: string;
}

const inputCls = 'w-full px-3 py-2.5 border border-[hsl(var(--color-line))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-focus)/0.4)] bg-card text-content';

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

  return (
    <div>
      {/* ─── GALLERY + VEHICLE INFO ─── */}
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <VehicleGallery
          images={galleryImages}
          title={`${vehicle.brand} ${vehicle.title}`}
          price={vehicle.price}
          year={vehicle.year}
          fuel={vehicle.fuel}
          transmission={vehicle.transmission}
          mileage={vehicle.mileage}
          city={vehicle.city}
          dealer={dealer}
        />

        <div>
          <h1 className="text-2xl font-extrabold text-content">{vehicle.brand} {vehicle.title}</h1>
          <p className="text-sm text-content-muted mt-1">{vehicle.year} · {vehicle.mileage.toLocaleString('en-IN')} km · {vehicle.fuel} · {vehicle.transmission}{vehicle.city ? ` · ${vehicle.city}` : ''}</p>
          <p className="mt-4 text-3xl font-extrabold text-[hsl(var(--color-primary-strong))]">₹{vehicle.price.toLocaleString('en-IN')}</p>

          {/* EMI Calculator */}
          <div className="mt-6 rounded-2xl border border-line bg-card p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-content-muted mb-4">EMI Calculator</h3>
            <div className="space-y-3 text-sm">
              <label className="block">Down Payment: <strong>₹{downPayment.toLocaleString('en-IN')}</strong>
                <input type="range" min={0} max={vehicle.price} step={10000} value={downPayment} onChange={(e) => setDownPayment(Number(e.target.value))} className="w-full accent-[hsl(var(--color-primary-strong))]" />
              </label>
              <label className="block">Interest Rate: <strong>{rate}% p.a.</strong>
                <input type="range" min={6} max={18} step={0.5} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full accent-[hsl(var(--color-primary-strong))]" />
              </label>
              <label className="block">Tenure: <strong>{tenure} months</strong>
                <input type="range" min={12} max={84} step={6} value={tenure} onChange={(e) => setTenure(Number(e.target.value))} className="w-full accent-[hsl(var(--color-primary-strong))]" />
              </label>
              <p className="pt-2 text-lg">Monthly EMI: <strong className="text-[hsl(var(--color-primary-strong))]">₹{emi.toLocaleString('en-IN')}</strong></p>
            </div>
          </div>

          {/* Dealer info */}
          {dealer && (
            <div className="mt-6 rounded-2xl border border-line bg-card p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-content-muted mb-2">Seller</h3>
              <p className="font-semibold text-content">{dealer.name}</p>
              <p className="text-sm text-content-muted">{[dealer.city, dealer.state].filter(Boolean).join(', ')}{dealer.phone ? ` · ${dealer.phone}` : ''}</p>
            </div>
          )}

          {/* CTA buttons */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setTab('contact')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                tab === 'contact' ? 'bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]' : 'bg-surface border border-line text-content-muted hover:border-[hsl(var(--color-primary)/0.4)]'
              }`}
            >
              Contact Dealer
            </button>
            <button
              onClick={() => setTab('testdrive')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                tab === 'testdrive' ? 'bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]' : 'bg-surface border border-line text-content-muted hover:border-[hsl(var(--color-primary)/0.4)]'
              }`}
            >
              Book Test Drive
            </button>
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
        <div className="grid gap-x-8 sm:grid-cols-2 rounded-2xl border border-line bg-card p-5">
          {specs.filter((s) => s.value).map((s) => (
            <div key={s.label} className="flex justify-between py-2.5 border-b border-line last:border-0 text-sm">
              <span className="text-content-muted">{s.label}</span>
              <span className="font-medium text-content">{s.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CONTACT / TEST DRIVE FORMS ─── */}
      <section className="mt-10 rounded-2xl border border-line bg-card p-6">
        <div className="flex gap-2 mb-5">
          <button type="button" onClick={() => setTab('contact')} className={'px-4 py-2 rounded-lg text-sm font-semibold ' + (tab === 'contact' ? 'bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]' : 'bg-surface text-content')}>Contact Dealer</button>
          <button type="button" onClick={() => setTab('testdrive')} className={'px-4 py-2 rounded-lg text-sm font-semibold ' + (tab === 'testdrive' ? 'bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]' : 'bg-surface text-content')}>Book Test Drive</button>
        </div>
        {tab === 'contact' ? <ContactForm vehicleId={vehicle.id} /> : <TestDriveForm vehicleId={vehicle.id} />}
      </section>
    </div>
  );
}


function FormSuccess({ msg }: { msg: string }) {
  return <p className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-sm text-emerald-400 flex items-center gap-2"><CheckCircle2 size={16} /> {msg}</p>;
}

function ContactForm({ vehicleId }: { vehicleId: number }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  return (
    <form className="grid gap-4 sm:grid-cols-2 max-w-2xl" onSubmit={async (e) => {
      e.preventDefault(); setError('');
      const fd = new FormData(e.currentTarget);
      const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, customerName: fd.get('name'), customerPhone: fd.get('phone'), customerEmail: fd.get('email') || '', message: fd.get('message') || '' }) });
      if (res.ok) setDone(true); else setError(((await res.json()) as { error?: string }).error || 'Failed');
    }}>
      {done && <div className="sm:col-span-2"><FormSuccess msg="Thanks! The dealer will contact you shortly." /></div>}
      {error && <p className="sm:col-span-2 text-sm text-red-400">{error}</p>}
      <input name="name" required placeholder="Your name" className={inputCls} />
      <input name="phone" required placeholder="Phone number" className={inputCls} inputMode="numeric" maxLength={10} pattern="\d{10}" />
      <input name="email" type="email" placeholder="Email (optional)" className={inputCls + ' sm:col-span-2'} />
      <textarea name="message" rows={3} placeholder="I'm interested in this vehicle. Please contact me." className={inputCls + ' sm:col-span-2'} />
      <button type="submit" className="sm:col-span-2 justify-self-start px-6 py-2.5 bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))] rounded-xl text-sm font-semibold hover:brightness-110">Send Enquiry</button>
    </form>
  );
}

function TestDriveForm({ vehicleId }: { vehicleId: number }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  return (
    <form className="grid gap-4 sm:grid-cols-2 max-w-2xl" onSubmit={async (e) => {
      e.preventDefault(); setError('');
      const fd = new FormData(e.currentTarget);
      const res = await fetch('/api/test-drives', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, customerName: fd.get('name'), customerPhone: fd.get('phone'), preferredDate: fd.get('date'), preferredTime: fd.get('time') }) });
      if (res.ok) setDone(true); else setError(((await res.json()) as { error?: string }).error || 'Failed');
    }}>
      {done && <div className="sm:col-span-2"><FormSuccess msg="Test drive requested! We'll confirm the slot soon." /></div>}
      {error && <p className="sm:col-span-2 text-sm text-red-400">{error}</p>}
      <input name="name" required placeholder="Your name" className={inputCls} />
      <input name="phone" required placeholder="Phone number" className={inputCls} inputMode="numeric" maxLength={10} pattern="\d{10}" />
      <input name="date" type="date" required min={new Date().toISOString().slice(0, 10)} className={inputCls} />
      <select name="time" required className={inputCls} defaultValue="10:30 AM">
        {['10:30 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM'].map((t) => <option key={t}>{t}</option>)}
      </select>
      <button type="submit" className="sm:col-span-2 justify-self-start px-6 py-2.5 bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))] rounded-xl text-sm font-semibold hover:brightness-110">Request Test Drive</button>
    </form>
  );
}
