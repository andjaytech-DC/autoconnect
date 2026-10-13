'use client';

import { useState } from 'react';
import { Store, FileText, CheckCircle } from 'lucide-react';
import { INDIAN_STATES } from '@/app/data/india-states';

const inputCls = 'w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC700]/40 bg-card text-content min-h-[44px]';
const labelCls = 'block text-xs font-semibold text-content-muted mb-1';
const errorCls = 'text-xs text-red-400 mt-1';

interface FieldErrors {
  businessName?: string;
  ownerName?: string;
  phone?: string;
  email?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  pincode?: string;
  gstNumber?: string;
}

/** Normalize phone for validation: strip spaces, dashes, parens, +91/91 prefix. */
function normalizePhone(raw: string): string {
  let cleaned = raw.trim().replace(/[\s\-()]/g, "");
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

function validate(fd: FormData): FieldErrors {
  const errors: FieldErrors = {};
  const businessName = (fd.get('businessName') as string || '').trim();
  const ownerName = (fd.get('ownerName') as string || '').trim();
  const rawPhone = (fd.get('phone') as string || '').trim();
  const email = (fd.get('email') as string || '').trim();
  const state = (fd.get('state') as string || '').trim();
  const city = (fd.get('city') as string || '').trim();
  const address = (fd.get('address') as string || '').trim();
  const pincode = (fd.get('pincode') as string || '').trim();

  const phone = normalizePhone(rawPhone);

  if (!businessName) errors.businessName = 'Business name is required';
  if (!ownerName) errors.ownerName = 'Owner name is required';
  if (!rawPhone) errors.phone = 'Phone number is required';
  else if (!/^\d{10}$/.test(phone)) errors.phone = 'Enter a valid 10-digit mobile number';
  if (!email) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email';
  if (!state) errors.state = 'State is required';
  if (!city) errors.city = 'City is required';
  if (!address) errors.address = 'Address is required';
  if (!pincode) errors.pincode = 'PIN code is required';
  else if (!/^\d{6}$/.test(pincode)) errors.pincode = 'PIN code must be 6 digits';

  return errors;
}

export default function DealerRegisterClient() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  if (done) return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 flex items-start gap-4 max-w-2xl">
      <CheckCircle size={24} className="text-emerald-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-bold text-emerald-400">Application submitted</p>
        <p className="text-sm text-content-muted mt-1">Your dealership application has been submitted and is awaiting admin approval. Vehicle listing will be available after approval.</p>
      </div>
    </div>
  );

  return (
    <form
      className="grid gap-4 sm:grid-cols-2 max-w-2xl rounded-2xl border border-line bg-card p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        const fd = new FormData(e.currentTarget);
        const errors = validate(fd);
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setSubmitting(true);
        try {
          const rawPhone = (fd.get('phone') as string || '').trim();
          let phone = rawPhone.trim().replace(/[\s\-()]/g, "");
          if (phone.startsWith('+91')) phone = phone.slice(3);
          else if (phone.startsWith('91') && phone.length === 12) phone = phone.slice(2);

          const res = await fetch('/api/dealer/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessName: (fd.get('businessName') as string || '').trim(),
              ownerName: (fd.get('ownerName') as string || '').trim(),
              phone,
              email: (fd.get('email') as string || '').trim(),
              country: 'India',
              city: (fd.get('city') as string || '').trim(),
              state: (fd.get('state') as string || '').trim(),
              address: (fd.get('address') as string || '').trim(),
              pincode: (fd.get('pincode') as string || '').trim(),
              gstNumber: (fd.get('gstNumber') as string || '').trim() || undefined,
            }),
          });
          if (res.ok) {
            setDone(true);
          } else {
            let message = `Request failed (${res.status})`;
            try {
              const data = (await res.json()) as { error?: string };
              if (data?.error) message = data.error;
            } catch { /* non-JSON body */ }
            setError(message);
          }
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {error && <p className="sm:col-span-2 text-sm text-red-400 bg-red-500/10 rounded-lg p-3">{error}</p>}

      {/* Business Information */}
      <div className="sm:col-span-2">
        <p className="text-xs font-bold uppercase tracking-wider text-content-muted mb-2">Business Information</p>
      </div>

      <div>
        <label htmlFor="businessName" className={labelCls}>Business Name *</label>
        <input id="businessName" name="businessName" required placeholder="e.g. Sharma Motors" className={inputCls} />
        {fieldErrors.businessName && <p className={errorCls}>{fieldErrors.businessName}</p>}
      </div>

      <div>
        <label htmlFor="ownerName" className={labelCls}>Owner Name *</label>
        <input id="ownerName" name="ownerName" required placeholder="e.g. Rajesh Sharma" className={inputCls} />
        {fieldErrors.ownerName && <p className={errorCls}>{fieldErrors.ownerName}</p>}
      </div>

      <div>
        <label htmlFor="phone" className={labelCls}>Phone *</label>
        <input id="phone" name="phone" required placeholder="9876543210" className={inputCls} inputMode="numeric" maxLength={10} pattern="\d{10}" />
        {fieldErrors.phone && <p className={errorCls}>{fieldErrors.phone}</p>}
      </div>

      <div>
        <label htmlFor="email" className={labelCls}>Email *</label>
        <input id="email" name="email" type="email" required placeholder="dealer@example.com" className={inputCls} inputMode="email" autoComplete="email" />
        {fieldErrors.email && <p className={errorCls}>{fieldErrors.email}</p>}
      </div>

      {/* Location */}
      <div className="sm:col-span-2">
        <p className="text-xs font-bold uppercase tracking-wider text-content-muted mt-2 mb-2">Location</p>
      </div>

      {/* Country - fixed to India */}
      <div>
        <label htmlFor="country" className={labelCls}>Country *</label>
        <select id="country" name="country" className={inputCls} defaultValue="India" disabled>
          <option value="India">India</option>
        </select>
      </div>

      <div>
        <label htmlFor="state" className={labelCls}>State *</label>
        <select id="state" name="state" required className={inputCls} defaultValue="">
          <option value="" disabled>Select state</option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {fieldErrors.state && <p className={errorCls}>{fieldErrors.state}</p>}
      </div>

      <div>
        <label htmlFor="city" className={labelCls}>City *</label>
        <input id="city" name="city" required placeholder="e.g. Noida" className={inputCls} />
        {fieldErrors.city && <p className={errorCls}>{fieldErrors.city}</p>}
      </div>

      <div>
        <label htmlFor="pincode" className={labelCls}>PIN Code *</label>
        <input id="pincode" name="pincode" required placeholder="e.g. 201301" className={inputCls} inputMode="numeric" maxLength={6} pattern="\d{6}" />
        {fieldErrors.pincode && <p className={errorCls}>{fieldErrors.pincode}</p>}
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="address" className={labelCls}>Address *</label>
        <textarea id="address" name="address" required rows={2} placeholder="Full address with landmark" className={inputCls + ' resize-none'} />
        {fieldErrors.address && <p className={errorCls}>{fieldErrors.address}</p>}
      </div>

      {/* Optional */}
      <div className="sm:col-span-2">
        <p className="text-xs font-bold uppercase tracking-wider text-content-muted mt-2 mb-2">Additional Details</p>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="gstNumber" className={labelCls}>GST Number (optional)</label>
        <input id="gstNumber" name="gstNumber" placeholder="e.g. 27AALCS1234F1ZH" className={inputCls} />
      </div>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto justify-self-start px-6 py-3 bg-[#FFC700] text-[#15130a] rounded-xl text-sm font-semibold hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
        >
          {submitting ? 'Submitting…' : <><FileText size={16} /> Submit Application</>}
        </button>
      </div>
    </form>
  );
}
