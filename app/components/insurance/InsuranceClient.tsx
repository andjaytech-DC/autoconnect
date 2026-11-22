'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Car, ShieldCheck, User, CheckCircle, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import {
  CONTACT_PREFERENCES,
  COVER_TYPES,
  COVER_TYPE_HINT,
  COVER_TYPE_LABEL,
  EXISTING_INSURANCE_OPTIONS,
} from '@/app/lib/insurance';

const inputCls = 'w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))]/40 bg-card text-content min-h-[44px]';
const labelCls = 'block text-sm font-semibold text-content mb-1.5';

interface Brand { id: number; name: string }

const STEPS = [
  { key: 'car', label: 'Your Car', icon: Car },
  { key: 'cover', label: 'Cover & Quote', icon: ShieldCheck },
  { key: 'details', label: 'Your Details', icon: User },
  { key: 'confirm', label: 'Confirmation', icon: CheckCircle },
];

interface QuoteLine { label: string; amount: number }
interface Quote { idv: number; coverType: string; lines: QuoteLine[]; subtotal: number; gst: number; total: number }

const FUELS = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];
const YEARS = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i);

export default function InsuranceClient() {
  const [step, setStep] = useState(0);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [fuel, setFuel] = useState('Petrol');
  const [coverType, setCoverType] = useState<'COMPREHENSIVE' | 'THIRD_PARTY'>('COMPREHENSIVE');
  const [idv, setIdv] = useState(650000);
  const [ncb, setNcb] = useState(20);
  const [addons, setAddons] = useState<string[]>(['ZERO_DEP']);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [regNo, setRegNo] = useState('');
  const [expiry, setExpiry] = useState('');
  const [claimHistory, setClaimHistory] = useState('no');
  const [message, setMessage] = useState('');
  const [city, setCity] = useState('');
  // What the customer wants. Defaults to the cover chosen for the estimate, but can be
  // a renewal, a new policy or an add-on — the estimate only models two cover types.
  const [requirement, setRequirement] = useState('');
  const [existing, setExisting] = useState('UNKNOWN');
  const [contactPref, setContactPref] = useState('PHONE');
  const [consent, setConsent] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const effectiveRequirement = requirement || coverType;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ referenceNo: string; id: number } | null>(null);

  useEffect(() => {
    fetch('/api/brands').then(r => r.json()).then(d => setBrands(d.brands || [])).catch(() => {});
    fetch('/api/auth/me').then(r => setSignedIn(r.ok)).catch(() => setSignedIn(false));
  }, []);

  const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

  const fetchQuote = useCallback(async () => {
    setQuoteLoading(true);
    setQuoteError('');
    try {
      const res = await fetch('/api/insurance/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idv,
          vehicleAgeYears: new Date().getFullYear() - year,
          engineCc: 1500,
          coverType,
          ncbSlab: coverType === 'COMPREHENSIVE' ? ncb : 0,
          addons: coverType === 'COMPREHENSIVE' ? addons : [],
        }),
      });
      const data = await res.json();
      if (res.ok && data.quote) setQuote(data.quote);
      else setQuoteError(data.error || 'Could not calculate quote');
    } catch {
      setQuoteError('Network error');
    } finally {
      setQuoteLoading(false);
    }
  }, [idv, year, coverType, ncb, addons]);

  useEffect(() => {
    if (step !== 1) return;
    void (async () => {
      await fetchQuote();
    })();
  }, [step, fetchQuote]);

  const toggleAddon = (id: string) => {
    setAddons((cur) => cur.includes(id) ? cur.filter((a) => a !== id) : [...cur, id]);
  };

  const canNext = () => {
    if (step === 0) return brand.length > 0;
    if (step === 1) return !!quote;
    if (step === 2) return name.trim().length > 0 && /^\d{10}$/.test(phone.trim()) && consent;
    return false;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/insurance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          phone: phone.trim(),
          email: email || undefined,
          city: city || undefined,
          registrationNo: regNo || undefined,
          registrationYear: year,
          vehicleMake: brand || undefined,
          vehicleModel: model || undefined,
          fuelType: fuel,
          coverType: effectiveRequirement,
          existingInsurance: existing,
          policyExpiry: expiry || undefined,
          hadClaim: claimHistory === 'yes',
          contactPreference: contactPref,
          message: message || undefined,
          consent,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // The reference comes from the saved record — never made up in the browser.
        setResult({ referenceNo: data.data.referenceNo, id: data.data.id });
        setStep(3);
      } else {
        setError(data.error || 'Failed to submit');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <div key={s.key} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  done ? 'bg-emerald-500 text-white' : active ? 'bg-[hsl(var(--color-primary))] text-[#15130a]' : 'bg-card border border-line text-content-muted'
                }`}>
                  {done ? <CheckCircle size={18} /> : <Icon size={18} />}
                </div>
                <span className={`text-[10px] mt-1.5 font-semibold text-center ${active ? 'text-[hsl(var(--color-primary-strong))]' : done ? 'text-emerald-700' : 'text-content-muted'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 rounded-full ${done ? 'bg-emerald-500' : 'bg-line'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="rounded-2xl border border-line bg-card p-6 sm:p-8">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-700">{error}</div>
        )}

        {/* Step 0: Your Car */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-content flex items-center gap-2">
                <Car size={20} className="text-[hsl(var(--color-primary-strong))]" />
                Tell us about your car
              </h2>
              <p className="text-sm text-content-muted mt-1">Tell us about your car. We use it to estimate a premium and to brief the insurance partner.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Brand *</label>
                <select className={inputCls} value={brand} onChange={(e) => setBrand(e.target.value)}>
                  <option value="">Select brand</option>
                  {brands.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Model</label>
                <input className={inputCls} value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Swift, City, Creta" />
              </div>
              <div>
                <label className={labelCls}>Registration Year</label>
                <select className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Fuel Type</label>
                <select className={inputCls} value={fuel} onChange={(e) => setFuel(e.target.value)}>
                  {FUELS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Cover & Quote */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-content flex items-center gap-2">
                <ShieldCheck size={20} className="text-[hsl(var(--color-primary-strong))]" />
                Choose Your Cover
              </h2>
              <p className="text-sm text-content-muted mt-1">Pick a cover type to see an indicative premium estimate.</p>
            </div>

            <div>
              <label className={labelCls}>Cover Type</label>
              <div className="grid grid-cols-2 gap-3">
                {(['COMPREHENSIVE', 'THIRD_PARTY'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setCoverType(t)}
                    className={`p-4 rounded-xl border text-sm font-bold text-left transition-all ${
                      coverType === t
                        ? 'border-[hsl(var(--color-primary))]/60 bg-[hsl(var(--color-primary))]/10 text-[hsl(var(--color-primary-strong))]'
                        : 'border-line bg-card text-content-muted hover:border-[hsl(var(--color-primary))]/30'
                    }`}>
                    <p className="font-bold">{t === 'COMPREHENSIVE' ? 'Comprehensive' : 'Third-party'}</p>
                    <p className="text-xs font-normal mt-1 opacity-70">
                      {t === 'COMPREHENSIVE' ? 'Own damage + third-party liability' : 'Third-party liability only'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Insured Declared Value (IDV): {inr(idv)}</label>
              <input type="range" min={100000} max={2500000} step={25000} value={idv}
                onChange={(e) => setIdv(Number(e.target.value))} className="w-full accent-[hsl(var(--color-primary))]" />
              <div className="flex justify-between text-xs text-content-muted mt-1">
                <span>₹1L</span><span>₹25L</span>
              </div>
            </div>

            {coverType === 'COMPREHENSIVE' && (
              <>
                <div>
                  <label className={labelCls}>No-Claim Bonus: {ncb}%</label>
                  <input type="range" min={0} max={50} step={5} value={ncb}
                    onChange={(e) => setNcb(Number(e.target.value))} className="w-full accent-[hsl(var(--color-primary))]" />
                  <div className="flex justify-between text-xs text-content-muted mt-1">
                    <span>0%</span><span>50%</span>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Add-ons</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'ZERO_DEP', label: 'Zero Depreciation' },
                      { id: 'ENGINE_PROTECT', label: 'Engine Protect' },
                      { id: 'ROADSIDE_ASSISTANCE', label: 'Roadside Assistance' },
                      { id: 'NCB_PROTECT', label: 'NCB Protect' },
                    ].map((a) => (
                      <label key={a.id}
                        className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2.5 text-sm font-medium text-content cursor-pointer has-[:checked]:border-[hsl(var(--color-primary))]/60 has-[:checked]:bg-[hsl(var(--color-primary))]/10 min-h-[44px]">
                        <input type="checkbox" checked={addons.includes(a.id)} onChange={() => toggleAddon(a.id)} className="accent-[hsl(var(--color-primary))]" />
                        {a.label}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Quote result */}
            <div className="rounded-xl border border-line bg-surface p-4">
              {quoteLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={20} className="animate-spin text-[hsl(var(--color-primary-strong))]" />
                  <span className="ml-2 text-sm text-content-muted">Calculating premium…</span>
                </div>
              ) : quoteError ? (
                <p className="text-sm text-red-700 text-center py-4">{quoteError}</p>
              ) : quote ? (
                <>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[hsl(var(--color-primary-strong))] mb-3">Premium Breakdown</h3>
                  <ul className="space-y-1.5">
                    {quote.lines.map((l) => (
                      <li key={l.label} className="flex justify-between text-sm">
                        <span className="text-content-muted">{l.label}</span>
                        <span className={`font-bold ${l.amount < 0 ? 'text-[hsl(var(--color-primary-strong))]' : 'text-content'}`}>
                          {l.amount < 0 ? `- ${inr(-l.amount)}` : inr(l.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-line mt-3 pt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-content-muted">GST (18%)</span>
                      <span className="font-bold text-content">{inr(quote.gst)}</span>
                    </div>
                    <div className="flex justify-between border-t border-line pt-2">
                      <span className="font-bold text-content">Total (1 year)</span>
                      <span className="text-lg font-extrabold text-[hsl(var(--color-primary-strong))]">{inr(quote.total)}</span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
            <p className="text-xs text-content-muted text-center">
              This is our own estimate, not a quote from an insurer. A partner&apos;s actual premium depends on the insurer, your vehicle and underwriting.
            </p>
          </div>
        )}

        {/* Step 2: Your Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-content flex items-center gap-2">
                <User size={20} className="text-[hsl(var(--color-primary-strong))]" />
                Your enquiry details
              </h2>
              <p className="text-sm text-content-muted mt-1">
                We pass your enquiry to an insurance partner, who contacts you with options. Progressive AutoHub is not an insurer and does not issue policies.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ins-name" className={labelCls}>Full name *</label>
                <input id="ins-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Patel" autoComplete="name" maxLength={120} />
              </div>
              <div>
                <label htmlFor="ins-phone" className={labelCls}>Mobile number *</label>
                <input id="ins-phone" className={inputCls} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" autoComplete="tel" maxLength={20} />
              </div>
              <div>
                <label htmlFor="ins-email" className={labelCls}>Email <span className="font-normal text-content-muted">(optional)</span></label>
                <input id="ins-email" className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              </div>
              <div>
                <label htmlFor="ins-city" className={labelCls}>City <span className="font-normal text-content-muted">(optional)</span></label>
                <input id="ins-city" className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Pune" maxLength={80} />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="ins-requirement" className={labelCls}>What are you looking for? *</label>
                <select id="ins-requirement" className={inputCls} value={effectiveRequirement} onChange={(e) => setRequirement(e.target.value)} aria-describedby="ins-requirement-hint">
                  {COVER_TYPES.map((c) => (
                    <option key={c} value={c}>{COVER_TYPE_LABEL[c]}</option>
                  ))}
                </select>
                <p id="ins-requirement-hint" className="mt-1 text-xs text-content-muted">{COVER_TYPE_HINT[effectiveRequirement]}</p>
              </div>

              <div>
                <label htmlFor="ins-existing" className={labelCls}>Do you have a policy now?</label>
                <select id="ins-existing" className={inputCls} value={existing} onChange={(e) => setExisting(e.target.value)}>
                  {EXISTING_INSURANCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ins-expiry" className={labelCls}>Policy expiry date <span className="font-normal text-content-muted">(if known)</span></label>
                <input id="ins-expiry" className={inputCls} type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} disabled={existing === 'NONE'} />
              </div>

              <div>
                <label htmlFor="ins-reg" className={labelCls}>Registration number <span className="font-normal text-content-muted">(optional)</span></label>
                <input id="ins-reg" className={inputCls} value={regNo} onChange={(e) => setRegNo(e.target.value.toUpperCase())} placeholder="e.g. MH12AB1234" maxLength={20} autoCapitalize="characters" />
              </div>
              <div>
                <span id="ins-claim-label" className={labelCls}>Any claim on your last policy?</span>
                <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="ins-claim-label">
                  {['no', 'yes'].map((v) => (
                    <button key={v} type="button" onClick={() => setClaimHistory(v)} aria-pressed={claimHistory === v}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] border transition-all ${
                        claimHistory === v
                          ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary))]/10 text-[hsl(var(--color-primary-strong))]'
                          : 'border-line bg-card text-content-muted hover:border-[hsl(var(--color-primary))]/50'
                      }`}>
                      {v === 'yes' ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="ins-contact" className={labelCls}>How should the partner reach you?</label>
                <select id="ins-contact" className={inputCls} value={contactPref} onChange={(e) => setContactPref(e.target.value)}>
                  {CONTACT_PREFERENCES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ins-message" className={labelCls}>Anything else we should tell the partner? <span className="font-normal text-content-muted">(optional)</span></label>
                <textarea id="ins-message" className={inputCls} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000}
                  placeholder="Specific requirements or questions…" />
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm leading-6 text-content cursor-pointer has-[:checked]:border-[hsl(var(--color-primary))]">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--color-primary))]" />
              <span>
                I agree to be contacted about this enquiry, and to Progressive AutoHub sharing the details above with an insurance partner so they can respond.{' '}
                <Link href="/privacy-policy" className="font-semibold text-[hsl(var(--color-primary-strong))] underline">Privacy policy</Link>
              </span>
            </label>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && result && (
          <div className="space-y-6 text-center" role="status">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
              <CheckCircle size={32} className="text-emerald-600" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-content">Enquiry received</h2>
              <p className="text-sm text-content-muted mt-2 max-w-md mx-auto">
                Thank you. We&apos;ll pass your enquiry to an insurance partner and keep the status up to date. We can&apos;t promise how quickly a partner will reply.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface space-y-1 max-w-sm mx-auto">
              <p className="text-xs text-content-muted uppercase tracking-wider font-semibold">Your reference</p>
              <p className="text-xl font-bold text-[hsl(var(--color-primary-strong))] font-mono">{result.referenceNo}</p>
            </div>
            <div className="text-sm text-content-muted space-y-1 text-left max-w-sm mx-auto">
              <p className="font-semibold text-content">What happens next:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Our team reviews your enquiry.</li>
                <li>We pass it to a partner that handles this kind of cover.</li>
                <li>The partner contacts you with options and quotes.</li>
                <li>If you choose to go ahead, the partner arranges the policy — Progressive AutoHub does not issue it.</li>
              </ol>
            </div>
            {signedIn ? (
              <Link href="/insurance/my-enquiries" className="btn btn-primary">Track this enquiry</Link>
            ) : (
              <p className="text-sm text-content-muted max-w-sm mx-auto">
                Want to follow its progress? <Link href="/login" className="font-semibold text-[hsl(var(--color-primary-strong))] underline">Sign in</Link> or{' '}
                <Link href="/register" className="font-semibold text-[hsl(var(--color-primary-strong))] underline">create an account</Link> next time you enquire, and it will appear in your account.
              </p>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        {step < 3 && (
          <div className="flex justify-between mt-8 pt-6 border-t border-line">
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-content-muted hover:text-content disabled:opacity-50 min-h-[44px]"
            >
              <ArrowLeft size={16} /> Back
            </button>
            {step < 2 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[hsl(var(--color-primary))] text-[#15130a] rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-55 min-h-[44px]"
              >
                Next <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => void handleSubmit()}
                disabled={!canNext() || submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[hsl(var(--color-primary))] text-[#15130a] rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-55 min-h-[44px]"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {submitting ? 'Sending…' : 'Send enquiry'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Disclosure — what this is, and is not. */}
      {step < 3 && (
        <p className="mt-6 text-center text-xs leading-5 text-content-muted max-w-xl mx-auto">
          Progressive AutoHub refers your enquiry to insurance partners; we are not an insurer.
          Any premium shown here is our own estimate, not a quote from any insurer.{' '}
          <a href="#insurance-info" className="font-semibold text-[hsl(var(--color-primary-strong))] underline">How it works and who our partners are</a>
        </p>
      )}
    </div>
  );
}
