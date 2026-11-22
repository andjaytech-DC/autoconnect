'use client';

import { useMemo, useState } from 'react';
import { Calculator, Car, User, CheckCircle, ArrowRight, ArrowLeft, Loader2, Shield } from 'lucide-react';

const inputCls = 'w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-card text-content min-h-[44px]';
const labelCls = 'block text-sm font-semibold text-content mb-1.5';

const STEPS = [
  { key: 'car', label: 'Car Details', icon: Car },
  { key: 'emi', label: 'EMI Preview', icon: Calculator },
  { key: 'details', label: 'Your Details', icon: User },
  { key: 'confirm', label: 'Confirmation', icon: CheckCircle },
];

export default function FinanceClient() {
  const [step, setStep] = useState(0);
  const [price, setPrice] = useState(800000);
  const [down, setDown] = useState(100000);
  const [rate, setRate] = useState(9.5);
  const [tenure, setTenure] = useState(60);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [income, setIncome] = useState('');
  const [employment, setEmployment] = useState('SALARIED');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ referenceNo: string; id: number } | null>(null);

  const emi = useMemo(() => {
    const p = Math.max(0, price - down);
    const r = rate / 12 / 100;
    if (p === 0 || r === 0) return { monthly: Math.round(p / tenure), interest: 0, total: p, loanAmount: p };
    const monthly = Math.round((p * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1));
    const total = monthly * tenure;
    return { monthly, interest: total - p, total, loanAmount: p };
  }, [price, down, rate, tenure]);

  const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

  const canNext = () => {
    if (step === 0) return price > 0;
    if (step === 1) return true;
    if (step === 2) return name.trim().length > 0 && /^\d{10}$/.test(phone.trim()) && income && Number(income) > 0;
    return false;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/finance-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicantName: name,
          phone,
          email: email || undefined,
          monthlyIncome: Number(income),
          employmentType: employment,
          loanAmount: emi.loanAmount,
        }),
      });
      const data = await res.json();
      if (res.ok) {
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
                  done ? 'bg-success text-success-foreground' : active ? 'bg-primary text-primary-foreground' : 'bg-card border border-line text-content-muted'
                }`}>
                  {done ? <CheckCircle size={18} /> : <Icon size={18} />}
                </div>
                <span className={`text-xs mt-1.5 font-semibold text-center ${active ? 'text-primary-strong' : done ? 'text-success' : 'text-content-muted'}`}>
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
          <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/30 text-sm text-error">{error}</div>
        )}

        {/* Step 0: Car Details */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-content flex items-center gap-2">
                <Car size={20} className="text-primary-strong" />
                Tell us about your car
              </h2>
              <p className="text-sm text-content-muted mt-1">Adjust the sliders or type to set your car&apos;s estimated price.</p>
            </div>
            <div>
              <label className={labelCls}>Car Price: {inr(price)}</label>
              <input type="range" min={100000} max={5000000} step={25000} value={price}
                onChange={(e) => setPrice(Number(e.target.value))} className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-content-muted mt-1">
                <span>₹1L</span><span>₹50L</span>
              </div>
            </div>
            <div>
              <label className={labelCls}>Down Payment: {inr(down)}</label>
              <input type="range" min={0} max={price} step={10000} value={down}
                onChange={(e) => setDown(Number(e.target.value))} className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-content-muted mt-1">
                <span>₹0</span><span>{inr(price)}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-surface text-sm flex items-center gap-3">
              <Shield size={16} className="text-primary-strong flex-shrink-0" />
              <span className="text-content-muted">Loan amount: <strong className="text-content">{inr(emi.loanAmount)}</strong></span>
            </div>
          </div>
        )}

        {/* Step 1: EMI Preview */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-content flex items-center gap-2">
                <Calculator size={20} className="text-primary-strong" />
                Your EMI Estimate
              </h2>
              <p className="text-sm text-content-muted mt-1">Adjust rate and tenure to find your comfortable EMI.</p>
            </div>
            <div>
              <label className={labelCls}>Interest Rate: {rate}% p.a.</label>
              <input type="range" min={6} max={18} step={0.5} value={rate}
                onChange={(e) => setRate(Number(e.target.value))} className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-content-muted mt-1">
                <span>6%</span><span>18%</span>
              </div>
            </div>
            <div>
              <label className={labelCls}>Loan Tenure: {tenure} months ({Math.round(tenure / 12 * 10) / 10} years)</label>
              <input type="range" min={12} max={84} step={6} value={tenure}
                onChange={(e) => setTenure(Number(e.target.value))} className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-content-muted mt-1">
                <span>1 yr</span><span>7 yrs</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-xl bg-surface">
                <p className="text-2xl font-extrabold text-primary-strong">{inr(emi.monthly)}</p>
                <p className="text-xs text-content-muted mt-1">Monthly EMI</p>
              </div>
              <div className="p-4 rounded-xl bg-surface">
                <p className="text-lg font-bold text-content">{inr(emi.interest)}</p>
                <p className="text-xs text-content-muted mt-1">Total Interest</p>
              </div>
              <div className="p-4 rounded-xl bg-surface">
                <p className="text-lg font-bold text-content">{inr(emi.total)}</p>
                <p className="text-xs text-content-muted mt-1">Total Payment</p>
              </div>
            </div>
            <p className="text-xs text-content-muted text-center">
              Indicative EMI based on reducing-balance interest. Actual terms depend on your credit profile and lender.
            </p>
          </div>
        )}

        {/* Step 2: Your Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-content flex items-center gap-2">
                <User size={20} className="text-primary-strong" />
                Your Details
              </h2>
              <p className="text-sm text-content-muted mt-1">Our lending partners will review your application within 24-48 hours.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Sharma" />
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
                <label className={labelCls}>Monthly Income (₹) *</label>
                <input className={inputCls} type="number" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="e.g. 75000" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Employment Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {['SALARIED', 'SELF_EMPLOYED', 'BUSINESS'].map((e) => (
                    <button key={e} type="button" onClick={() => setEmployment(e)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] border transition-all ${
                        employment === e
                          ? 'border-primary/60 bg-primary/10 text-primary-strong'
                          : 'border-line bg-card text-content-muted hover:border-primary/30'
                      }`}>
                      {e === 'SELF_EMPLOYED' ? 'Self Employed' : e === 'SALARIED' ? 'Salaried' : 'Business'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-surface text-sm">
              <p className="text-content-muted">
                By submitting, you agree to our{' '}
                <span className="text-primary-strong font-semibold cursor-pointer">Terms &amp; Conditions</span> and consent to be contacted by our lending partners.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && result && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto">
              <CheckCircle size={32} className="text-success" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-content">Application Submitted!</h2>
              <p className="text-sm text-content-muted mt-2">
                Our lending partners will review your application and contact you within 24-48 hours.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface space-y-2 max-w-sm mx-auto">
              <p className="text-xs text-content-muted uppercase tracking-wider font-semibold">Reference Number</p>
              <p className="text-xl font-extrabold text-primary-strong font-mono">{result.referenceNo}</p>
            </div>
            <div className="text-sm text-content-muted space-y-1 text-left max-w-sm mx-auto">
              <p className="font-semibold text-content">What happens next:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Our team verifies your details</li>
                <li>You receive a call from our lending partner</li>
                <li>Loan offer with final terms is shared</li>
                <li>Post acceptance, disbursement within 24 hours</li>
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-content-muted hover:text-content disabled:opacity-50 min-h-[44px]"
            >
              <ArrowLeft size={16} /> Back
            </button>
            {step < 2 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-55 min-h-[44px]"
              >
                Next <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => void handleSubmit()}
                disabled={!canNext() || submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-55 min-h-[44px]"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                {submitting ? 'Submitting…' : 'Submit Application'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Trust badges */}
      {step < 3 && (
        <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-xs text-content-muted">
          <span className="flex items-center gap-1.5"><Shield size={14} className="text-success" /> 100% Secure</span>
          <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-success" /> RBI-Registered Partners</span>
          <span className="flex items-center gap-1.5"><Calculator size={14} className="text-success" /> No Hidden Charges</span>
        </div>
      )}
    </div>
  );
}
