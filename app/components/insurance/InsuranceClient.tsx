'use client';

import { useCallback, useEffect, useState } from 'react';
import { Car, ShieldCheck, User, CheckCircle, ArrowRight, ArrowLeft, Loader2, Calculator } from 'lucide-react';

const inputCls = 'w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC700]/40 bg-card text-content min-h-[44px]';
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ referenceNo: string; id: number } | null>(null);

  useEffect(() => {
    fetch('/api/brands').then(r => r.json()).then(d => setBrands(d.brands || [])).catch(() => {});
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
    if (step === 2) return name.trim().length > 0 && /^\d{10}$/.test(phone.trim());
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
          phone,
          email: email || undefined,
          registrationNo: regNo || undefined,
          coverType,
          message: [
            `Car: ${brand} ${model} (${year}, ${fuel})`,
            claimHistory === 'yes' ? 'Previous claim: Yes' : 'No previous claims',
            expiry ? `Policy expiry: ${expiry}` : '',
            message,
          ].filter(Boolean).join('. '),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ referenceNo: `INS${Date.now().toString(36).toUpperCase().slice(-6)}`, id: data.data.id });
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
                  done ? 'bg-emerald-500 text-white' : active ? 'bg-[#FFC700] text-[#15130a]' : 'bg-card border border-line text-content-muted'
                }`}>
                  {done ? <CheckCircle size={18} /> : <Icon size={18} />}
                </div>
                <span className={`text-[10px] mt-1.5 font-semibold text-center ${active ? 'text-[#FFC700]' : done ? 'text-emerald-400' : 'text-content-muted'}`}>
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
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">{error}</div>
        )}

        {/* Step 0: Your Car */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-content flex items-center gap-2">
                <Car size={20} className="text-[#FFC700]" />
                Tell us about your car
              </h2>
              <p className="text-sm text-content-muted mt-1">Select your car details to get an accurate insurance quote.</p>
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
                <ShieldCheck size={20} className="text-[#FFC700]" />
                Choose Your Cover
              </h2>
              <p className="text-sm text-content-muted mt-1">Select cover type and see your premium breakdown instantly.</p>
            </div>

            <div>
              <label className={labelCls}>Cover Type</label>
              <div className="grid grid-cols-2 gap-3">
                {(['COMPREHENSIVE', 'THIRD_PARTY'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setCoverType(t)}
                    className={`p-4 rounded-xl border text-sm font-bold text-left transition-all ${
                      coverType === t
                        ? 'border-[#FFC700]/60 bg-[#FFC700]/10 text-[#FFC700]'
                        : 'border-line bg-card text-content-muted hover:border-[#FFC700]/30'
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
                onChange={(e) => setIdv(Number(e.target.value))} className="w-full accent-[#FFC700]" />
              <div className="flex justify-between text-xs text-content-muted mt-1">
                <span>₹1L</span><span>₹25L</span>
              </div>
            </div>

            {coverType === 'COMPREHENSIVE' && (
              <>
                <div>
                  <label className={labelCls}>No-Claim Bonus: {ncb}%</label>
                  <input type="range" min={0} max={50} step={5} value={ncb}
                    onChange={(e) => setNcb(Number(e.target.value))} className="w-full accent-[#FFC700]" />
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
                        className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2.5 text-sm font-medium text-content cursor-pointer has-[:checked]:border-[#FFC700]/60 has-[:checked]:bg-[#FFC700]/10 min-h-[44px]">
                        <input type="checkbox" checked={addons.includes(a.id)} onChange={() => toggleAddon(a.id)} className="accent-[#FFC700]" />
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
                  <Loader2 size={20} className="animate-spin text-[#FFC700]" />
                  <span className="ml-2 text-sm text-content-muted">Calculating premium…</span>
                </div>
              ) : quoteError ? (
                <p className="text-sm text-red-400 text-center py-4">{quoteError}</p>
              ) : quote ? (
                <>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#FFC700] mb-3">Premium Breakdown</h3>
                  <ul className="space-y-1.5">
                    {quote.lines.map((l) => (
                      <li key={l.label} className="flex justify-between text-sm">
                        <span className="text-content-muted">{l.label}</span>
                        <span className={`font-bold ${l.amount < 0 ? 'text-[#FFC700]' : 'text-content'}`}>
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
                      <span className="text-lg font-extrabold text-[#FFC700]">{inr(quote.total)}</span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
            <p className="text-xs text-content-muted text-center">
              Indicative premium. Final rate depends on the insurer, vehicle condition and underwriting.
            </p>
          </div>
        )}

        {/* Step 2: Your Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-content flex items-center gap-2">
                <User size={20} className="text-[#FFC700]" />
                Your Details
              </h2>
              <p className="text-sm text-content-muted mt-1">Our insurance partner will contact you with the best available plans.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Patel" />
              </div>
              <div>
                <label className={labelCls}>Phone Number *</label>
                <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <label className={labelCls}>Registration Number</label>
                <input className={inputCls} value={regNo} onChange={(e) => setRegNo(e.target.value)} placeholder="e.g. MH12AB1234" />
              </div>
              <div>
                <label className={labelCls}>Policy Expiry Date</label>
                <input className={inputCls} type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Previous Insurance Claim?</label>
                <div className="grid grid-cols-2 gap-2">
                  {['no', 'yes'].map((v) => (
                    <button key={v} type="button" onClick={() => setClaimHistory(v)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] border transition-all ${
                        claimHistory === v
                          ? 'border-[#FFC700]/60 bg-[#FFC700]/10 text-[#FFC700]'
                          : 'border-line bg-card text-content-muted hover:border-[#FFC700]/30'
                      }`}>
                      {v === 'yes' ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Additional Requirements</label>
                <textarea className={inputCls} rows={3} value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder="Any specific requirements or questions…" />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && result && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
              <CheckCircle size={32} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-content">Enquiry Submitted!</h2>
              <p className="text-sm text-content-muted mt-2">
                Our insurance partner will contact you within 2 hours with the best available plans.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface space-y-2 max-w-sm mx-auto">
              <p className="text-xs text-content-muted uppercase tracking-wider font-semibold">Reference Number</p>
              <p className="text-xl font-extrabold text-[#FFC700] font-mono">{result.referenceNo}</p>
            </div>
            <div className="text-sm text-content-muted space-y-1 text-left max-w-sm mx-auto">
              <p className="font-semibold text-content">What happens next:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Our insurance partner reviews your requirements</li>
                <li>You receive a call with tailored plan options</li>
                <li>Choose a plan that fits your needs</li>
                <li>Policy is issued within 24 hours of acceptance</li>
              </ol>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        {step < 3 && (
          <div className="flex justify-between mt-8 pt-6 border-t border-line">
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-content-muted hover:text-content disabled:opacity-30 min-h-[44px]"
            >
              <ArrowLeft size={16} /> Back
            </button>
            {step < 2 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#FFC700] text-[#15130a] rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-40 min-h-[44px]"
              >
                Next <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => void handleSubmit()}
                disabled={!canNext() || submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#FFC700] text-[#15130a] rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-40 min-h-[44px]"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {submitting ? 'Submitting…' : 'Get Insurance Quote'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Trust badges */}
      {step < 3 && (
        <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-xs text-content-muted">
          <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-400" /> IRDAI Licensed Partners</span>
          <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-400" /> Instant Policy Issuance</span>
          <span className="flex items-center gap-1.5"><Calculator size={14} className="text-emerald-400" /> Compare Multiple Plans</span>
        </div>
      )}
    </div>
  );
}
