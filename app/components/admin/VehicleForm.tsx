'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { X, Upload, Star, AlertCircle, CheckCircle2, Loader2, ImagePlus, Trash2 } from 'lucide-react';
import { validateRegistrationNumber } from '@/app/lib/registration-number';

interface VehicleFormProps {
  onSuccess?: (vehicle: Record<string, unknown>) => void;
  onCancel?: () => void;
  initialData?: Record<string, unknown> | null;
  /** Dealer mode: locks the dealer selector to the caller's dealership and hides admin-only fields. */
  dealerMode?: boolean;
  /** Dealer's own dealerId (required with dealerMode) — pre-selected and locked. */
  lockedDealerId?: number;
  /** Dealer's own dealer label shown in place of the selector. */
  lockedDealerLabel?: string;
}

interface FormData {
  brandId: number; categoryId: number; dealerId: number;
  model: string; variant: string; year: string; price: string;
  mileage: string; fuel: string; transmission: string; bodyType: string; color: string;
  registrationNumber: string; registrationState: string; city: string; state: string; pincode: string;
  description: string; features: string; highlights: string; status: string;
  listingStatus: string;
  isFeatured: boolean; isCertified: boolean; availableForFinance: boolean; images: string[];
  videoUrl?: string; videoThumbnail?: string; videoTitle?: string;
}

interface RefBrand { id: number; name: string; country?: string; isActive?: boolean; vehicleCount?: number }
interface RefCategory { id: number; name: string; slug?: string; isActive?: boolean; vehicleCount?: number }
interface RefDealer { id: number; name: string; businessName?: string; city?: string; state?: string; status?: string }



const FUEL_TYPES = ['PETROL','DIESEL','ELECTRIC','HYBRID','CNG'];
const TRANSMISSION_TYPES = ['MANUAL','AUTOMATIC','AMT','DCT','CVT'];
const BODY_TYPES = ['SUV','Sedan','Hatchback','Compact SUV','Luxury SUV','MUV','Crossover'];
const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'INACTIVE', label: 'Archived' },
];
const LISTING_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft — hidden from the public site' },
  { value: 'PUBLISHED', label: 'Published — visible on the public site' },
];
const INDIAN_STATES = ['Uttar Pradesh','Maharashtra','Delhi','Karnataka','Tamil Nadu','Telangana','Gujarat','Rajasthan','West Bengal','Madhya Pradesh','Punjab','Haryana','Kerala','Bihar','Odisha','Jharkhand','Chhattisgarh','Assam','Andhra Pradesh','Goa'];



const CITIES_BY_STATE: Record<string, string[]> = {
  'Uttar Pradesh': ['Noida','Lucknow','Kanpur','Varanasi','Agra'],
  'Maharashtra': ['Mumbai','Pune','Nagpur','Nashik','Thane'],
  'Delhi': ['New Delhi','Noida','Gurgaon','Faridabad','Ghaziabad'],
  'Karnataka': ['Bengaluru','Mysore','Mangalore'],
  'Tamil Nadu': ['Chennai','Coimbatore','Madurai'],
  'Telangana': ['Hyderabad','Warangal'],
  'Gujarat': ['Ahmedabad','Surat','Vadodara'],
  'Rajasthan': ['Jaipur','Jodhpur','Udaipur'],
};const inputCls = 'w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC700]/40 bg-card text-content';
const labelCls = 'block text-sm font-medium text-content mb-1.5';

interface FieldProps {
  label: string;
  req?: boolean;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  sel?: boolean;
  options?: string[];
  min?: number | string;
  max?: number | string;
}

function Field({ label, req, type, value, onChange, placeholder, sel, options, min, max }: FieldProps) {
  if (sel) {
    return (
      <div>
        <label className={labelCls}>{label}{req && <span className="text-red-500"> *</span>}</label>
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          {(options || []).map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  return (
    <div>
      <label className={labelCls}>{label}{req && <span className="text-red-500"> *</span>}</label>
      <input type={type || 'text'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} min={min} max={max} className={inputCls} required={!!req} />
    </div>
  );
}function Toggle({ label, checked, onChange, star }: { label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; star?: boolean }) {
  return (
    <div className="flex items-center gap-3 pt-6">
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-surface border border-border rounded-full peer peer-checked:bg-[#FFC700] peer-checked:border-[#FFC700] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#161b21] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
      </label>
      <div className="flex items-center gap-1.5">{star && <Star size={16} className={checked ? 'text-amber-500 fill-amber-500' : 'text-content-muted'} />}<span className="text-sm font-medium text-content">{label}</span></div>
    </div>
  );
}
export default function VehicleForm({ onSuccess, onCancel, initialData, dealerMode, lockedDealerId, lockedDealerLabel }: VehicleFormProps) {
  const VIDEO_FORMAT_TEXT = "MP4" + String.fromCharCode(47) + "WebM";
  const d = (k: string): string => (initialData ? String((initialData as Record<string, unknown>)[k] ?? '') : '');
  const dBool = (k: string, fallback: boolean): boolean => (initialData ? Boolean((initialData as Record<string, unknown>)[k] ?? fallback) : fallback);
  const dArr = (k: string): string[] => {
    const arr = initialData ? (initialData as Record<string, unknown>)[k] : undefined;
    return Array.isArray(arr) ? arr.map(String) : [];
  };
  const [formData, setFormData] = useState<FormData>({
    brandId: Number(d('brandId')) || 0, categoryId: Number(d('categoryId')) || 0,
    dealerId: Number(d('dealerId')) || lockedDealerId || 0,
    model: d('model'), variant: d('variant'),
    year: d('year') || new Date().getFullYear().toString(), price: d('price'),
    mileage: d('mileage'), fuel: d('fuel') || 'PETROL', transmission: d('transmission') || 'AUTOMATIC',
    bodyType: d('bodyType') || 'SUV', color: d('color'), registrationNumber: d('registrationNumber'),
    registrationState: d('registrationState') || 'Uttar Pradesh', city: d('city') || 'Noida', state: d('state') || 'Uttar Pradesh',
    pincode: d('pincode'), description: d('description'), features: d('features'),
    highlights: d('highlights'), status: d('status') || 'DRAFT',
    listingStatus: d('listingStatus') || 'DRAFT',
    isFeatured: dBool('isFeatured', false),
    isCertified: dBool('isCertified', false), availableForFinance: dBool('availableForFinance', true), images: dArr('images'),
    videoUrl: d('videoUrl') || '', videoThumbnail: d('videoThumbnail') || '', videoTitle: d('videoTitle') || '',
  });
  // Edit mode: initialData with an id switches the submit to PATCH and the
  // copy to "update" wording (the edit route reuses this form).
  const editId = initialData && Number(initialData.id) ? Number(initialData.id) : null;
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // The number plate is required: without it the RTO/VAHAN history check can
  // never run, which is the point of the trust layer.
  const plateCheck = useMemo(
    () => validateRegistrationNumber(formData.registrationNumber),
    [formData.registrationNumber],
  );
  const plateValid = plateCheck.valid;
  const plateError = plateCheck.reason ?? 'Enter a valid registration number.';
  const [brands, setBrands] = useState<RefBrand[]>([]);
  const [categories, setCategories] = useState<RefCategory[]>([]);
  const [dealers, setDealers] = useState<RefDealer[]>([]);
  // Direct file upload (POST /api/upload) — any authenticated user (admin
  // vehicle manager, dealer inventory form). Files land in formData.images
  // as /uploads/*.webp URLs, clearing the image error on success.
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  // Uploaded file URLs created by THIS form instance, tracked so a cancel
  // can discard them (orphan cleanup). Cleared once the vehicle is saved.
  const uploadedRef = useRef<string[]>([]);
  const submittedRef = useRef(false);
  // Pending single-image deletion: set by the thumbnail × button, executed
  // only after the confirmation modal is accepted.
  const [pendingDelete, setPendingDelete] = useState<{ index: number; url: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Public catalog endpoints work for every role; /api/admin/lookups is
    // ADMIN-only so dealer mode must not call it (dealers get 401 + empty
    // selectors). Dealer selector stays locked to lockedDealerId anyway.
    if (dealerMode) {
      Promise.all([
        fetch('/api/brands').then((r) => r.json()).catch(() => ({ brands: [] })),
        fetch('/api/categories').then((r) => r.json()).catch(() => ({ categories: [] })),
      ]).then(([b, c]) => {
        setBrands(b.brands || []);
        setCategories(c.categories || []);
        setDealers([]);
      }).catch(() => { setBrands([]); setCategories([]); setDealers([]); });
      return;
    }
    fetch('/api/admin/lookups')
      .then((r) => r.json())
      .then((d) => {
        setBrands(d.brands || []);
        setCategories(d.categories || []);
        // Only show APPROVED dealers in the selector for admins
        setDealers(
          (d.dealers || []).filter(
            (dl: { status?: string | null }) => dl.status === "APPROVED",
          ),
        );
      })
      .catch(() => { setBrands([]); setCategories([]); setDealers([]); });
  }, [dealerMode]);

  const cities = CITIES_BY_STATE[formData.state] || ['Noida'];
  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => { setFormData(pv => ({ ...pv, [k]: v })); setError(''); setSuccess(''); };
  const handleStateChange = (state: string) => {
    const cs = CITIES_BY_STATE[state] || ['Noida'];
    setFormData(pv => ({ ...pv, state, city: cs[0], registrationState: state })); setError(''); setSuccess('');
  };
  const addImageUrl = () => {
    // Accept pasted URLs and uploaded paths (/uploads/*.webp); anything
    // non-empty counts — validation only requires >= 1 image.
    const v = imageUrl.trim();
    if (!v) return;
    setFormData(pv => ({ ...pv, images: [...pv.images, v] }));
    setImageUrl('');
    setError('');
    setSuccess('');
  };
  // Stage (not execute) an image removal — the confirmation modal decides.
  const removeImage = (i: number) => { setPendingDelete({ index: i, url: formData.images[i] }); setError(''); setSuccess(''); };
  /** Execute the confirmed deletion: drop it from the list and physically
   *  delete the stored asset (disk /uploads file or Cloudinary object). */
  const confirmRemoveImage = async () => {
    if (!pendingDelete) return;
    const { index, url } = pendingDelete;
    setPendingDelete(null);
    // Only managed storage is cleaned up — external pasted URLs are not ours.
    const isManaged = url.startsWith('/uploads/') || url.includes('res.cloudinary.com');
    if (isManaged) {
      setIsDeleting(true);
      try {
        await fetch('/api/upload/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: [url] }),
        });
      } catch { /* best-effort — image removal must not block the form */ }
      setIsDeleting(false);
    }
    setFormData(pv => ({ ...pv, images: pv.images.filter((_, x) => x !== index) }));
    setSuccess(isManaged ? 'Image removed and file deleted from storage.' : 'Image removed.');
    setTimeout(() => setSuccess(''), 2500);
  };
  const moveImage = (i: number, d: 'up' | 'down') => {
    const imgs = [...formData.images];
    if (d === 'up' && i > 0) [imgs[i-1], imgs[i]] = [imgs[i], imgs[i-1]];
    else if (d === 'down' && i < imgs.length - 1) [imgs[i], imgs[i+1]] = [imgs[i+1], imgs[i]];
    setFormData(pv => ({ ...pv, images: imgs }));
  };
  const handleFiles = async (files: FileList | File[] | null) => {
    const list = files ? Array.from(files) : [];
    if (list.length === 0) return;
    // Client-side payload guard: mirror the server's 10MB rule per file so
    // oversized drops fail fast with a named message instead of a 413 round-trip.
    const MAX_BYTES = 10 * 1024 * 1024;
    const oversized = list.filter((f) => f.size > MAX_BYTES);
    if (oversized.length > 0) {
      setUploadError(
        oversized.length === 1
          ? `“${oversized[0].name}” exceeds the 10MB limit — compress or pick a smaller file.`
          : `${oversized.length} files exceed the 10MB limit: ${oversized.map((f) => f.name).join(', ')}.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setUploadError('');
    setIsUploading(true);
    setUploadProgress({ done: 0, total: list.length, current: list[0]?.name || '' });
    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        setUploadProgress({ done: i, total: list.length, current: file.name });
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed: ' + file.name);
        uploadedRef.current.push(data.url as string);
        setFormData(pv => ({ ...pv, images: [...pv.images, data.url as string] }));
        setError('');
        setSuccess('');
        setUploadProgress({ done: i + 1, total: list.length, current: file.name });
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('');

    if (!plateValid) {
      setError(
        `Registration number is required and must be a valid Indian plate. ${plateError}`,
      );
      return;
    }
    // Auto-commit a typed-but-unadded URL so users who paste then hit
    // Create (without clicking Add Image) don't hit a stale-state error.
    let images = formData.images;
    const pending = imageUrl.trim();
    if (images.length === 0 && pending) {
      images = [...images, pending];
      setFormData(pv => ({ ...pv, images }));
      setImageUrl('');
    }
    const brandName = brands.find((b) => b.id === formData.brandId)?.name || '';
    if (!brandName) return setError('Brand is required');
    if (!formData.model.trim()) return setError('Model is required');
    if (!formData.year.trim()) return setError('Year is required');
    if (!formData.price.trim()) return setError('Price is required');
    if (!formData.mileage.trim()) return setError('Mileage is required');
    if (!formData.color.trim()) return setError('Color is required');
    if (!formData.city.trim()) return setError('City is required');
    if (images.length === 0) return setError('At least one image is required');
    if (!formData.brandId) return setError('Brand is required');
    if (!formData.categoryId) return setError('Category is required');
    if (!formData.dealerId) return setError('Dealer is required');
    
    // Dealer approval is verified server-side by the backend API
    
    setIsSubmitting(true);
    try {
      const title = formData.variant.trim() ? brandName + ' ' + formData.model + ' ' + formData.variant : brandName + ' ' + formData.model;
      const featuresArr = formData.features.split(',').map((s) => s.trim()).filter(Boolean);
      const highlightsArr = formData.highlights.split(',').map((s) => s.trim()).filter(Boolean);
      const payload = {
        title, price: Number(formData.price), year: Number(formData.year), mileage: Number(formData.mileage),
        fuel: formData.fuel, transmission: formData.transmission, color: formData.color,
        bodyType: formData.bodyType || undefined,
        city: formData.city, state: formData.state || undefined,
        pincode: formData.pincode || undefined,
        description: formData.description || undefined,
        engine: undefined,
        images: images,
        status: formData.status === 'DRAFT' ? 'INACTIVE' : formData.status,
        listingStatus: formData.listingStatus,
        isFeatured: dealerMode ? undefined : formData.isFeatured,
        isCertified: formData.isCertified,
        brandId: formData.brandId, categoryId: formData.categoryId, dealerId: formData.dealerId,
        registrationNumber: plateCheck.normalised,
        registrationState: formData.registrationState || undefined,
        features: featuresArr.length ? featuresArr : undefined,
        highlights: highlightsArr.length ? highlightsArr : undefined,
        availableForFinance: formData.availableForFinance,
        videoUrl: formData.videoUrl || undefined,
        videoThumbnail: formData.videoThumbnail || undefined,
        videoTitle: formData.videoTitle || undefined,
      };
      if (editId) {
        // Edit mode — update the existing vehicle (specs, status, imagery).
        const response = await fetch('/api/vehicles/' + editId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || data.error || 'Failed to update vehicle');
        setSuccess('Vehicle updated successfully!');
        // The vehicle still owns its files — do NOT discard them.
        submittedRef.current = true;
        uploadedRef.current = [];
        if (onSuccess) onSuccess(data.data);
        return;
      }
      const response = await fetch('/api/vehicles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Failed to create vehicle');
      setSuccess('Vehicle created successfully!');
      setFormData({ brandId: 0, categoryId: 0, dealerId: 0, model: '', variant: '', year: new Date().getFullYear().toString(), price: '', mileage: '',
        fuel: 'PETROL', transmission: 'AUTOMATIC', bodyType: 'SUV', color: '', registrationNumber: '', registrationState: 'Uttar Pradesh',
        city: 'Noida', state: 'Uttar Pradesh', pincode: '', description: '', features: '', highlights: '', status: 'DRAFT',
        listingStatus: 'DRAFT',
        isFeatured: false, isCertified: false, availableForFinance: true, images: [], videoUrl: '', videoThumbnail: '', videoTitle: '' });
      if (onSuccess) onSuccess(data.data);
      // Success: the vehicle now owns these files — do NOT discard them.
      submittedRef.current = true;
      uploadedRef.current = [];
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) { const msg = err instanceof Error ? err.message : 'An error occurred'; setError(msg); }
    finally { setIsSubmitting(false); }
  };

  // Best-effort orphan cleanup when the user closes/discards the form without
  // saving: POST the /uploads/*.webp files this instance created so the
  // server can remove them from disk (see /api/upload/cleanup).
  const discard = () => {
    if (!submittedRef.current && uploadedRef.current.length > 0) {
      void fetch('/api/upload/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: uploadedRef.current }),
      }).catch(() => { /* best-effort */ });
      uploadedRef.current = [];
    }
    if (onCancel) onCancel();
  };

  return (
  <div className="bg-card rounded-2xl border border-line p-6">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-content">{initialData ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
      {onCancel && <button type="button" onClick={discard} className="p-2 hover:bg-surface rounded-lg" aria-label="Close"><X size={20} className="text-content-muted" /></button>}
    </div>
    {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3"><AlertCircle size={20} className="text-red-400 flex-shrink-0" /><p className="text-sm text-red-400">{error}</p></div>}
    {success && <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3"><CheckCircle2 size={20} className="text-[#FFC700] flex-shrink-0" /><p className="text-sm text-emerald-400">{success}</p></div>}
    <form onSubmit={handleSubmit} className="space-y-8">
      <section>
        <h3 className="text-sm font-bold uppercase tracking-wider text-content-muted mb-4">Basic Information</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelCls}>Brand<span className="text-red-500"> *</span></label>
            <select value={formData.brandId} onChange={(e) => set('brandId', Number(e.target.value))} className={inputCls} aria-label="Brand">
              <option value={0}>Select Brand</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <Field label="Model" req value={formData.model} onChange={(v: string) => set('model', v)} placeholder="e.g., Creta" />
          <Field label="Variant" value={formData.variant} onChange={(v: string) => set('variant', v)} placeholder="e.g., SX (O)" />
          <div>
            <label className={labelCls}>Category<span className="text-red-500"> *</span></label>
            <select value={formData.categoryId} onChange={(e) => set('categoryId', Number(e.target.value))} className={inputCls} aria-label="Category">
              <option value={0}>Select Category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Dealer<span className="text-red-500"> *</span></label>
            {dealerMode ? (
              <input value={lockedDealerLabel || 'Your dealership'} disabled className={inputCls + ' opacity-70 cursor-not-allowed'} aria-label="Dealership (locked)" />
            ) : (
            <select value={formData.dealerId} onChange={(e) => set('dealerId', Number(e.target.value))} className={inputCls} aria-label="Dealer">
              <option value={0}>Select Dealer</option>
              {dealers.map((dl) => <option key={dl.id} value={dl.id}>{dl.name}{dl.city ? ` — ${dl.city}` : ''}</option>)}
            </select>
            )}
          </div>
          <Field label="Year" req type="number" value={formData.year} onChange={(v: string) => set('year', v)} min="1990" max={new Date().getFullYear() + 1} />
          <Field label="Price (Rs)" req type="number" value={formData.price} onChange={(v: string) => set('price', v)} placeholder="1450000" min="0" />
          <Field label="Mileage (km)" req type="number" value={formData.mileage} onChange={(v: string) => set('mileage', v)} placeholder="18500" min="0" />
          <Field label="Fuel Type" req sel value={formData.fuel} onChange={(v: string) => set('fuel', v)} options={FUEL_TYPES} />
          <Field label="Transmission" req sel value={formData.transmission} onChange={(v: string) => set('transmission', v)} options={TRANSMISSION_TYPES} />
          <Field label="Body Type" sel value={formData.bodyType} onChange={(v: string) => set('bodyType', v)} options={BODY_TYPES} />
          <Field label="Color" req value={formData.color} onChange={(v: string) => set('color', v)} placeholder="e.g., Polar White" />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold uppercase tracking-wider text-content-muted mb-4">Registration</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Field req label="Registration Number" value={formData.registrationNumber} onChange={(v: string) => set('registrationNumber', v.toUpperCase())} placeholder="UP16AB1234" />
            {formData.registrationNumber.trim() !== '' && !plateValid && (
              <p className="mt-1 text-xs text-red-500">{plateError}</p>
            )}
            {formData.registrationNumber.trim() === '' && (
              <p className="mt-1 text-xs text-content-muted">
                Required. Used to run the RTO/VAHAN history check.
              </p>
            )}
          </div>
          <Field label="Registration State" sel value={formData.registrationState} onChange={(v: string) => set('registrationState', v)} options={INDIAN_STATES} />
        </div>
      </section>      <section>
        <h3 className="text-sm font-bold uppercase tracking-wider text-content-muted mb-4">Location</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>State <span className="text-red-500">*</span></label>
            <select value={formData.state} onChange={(e) => handleStateChange(e.target.value)} className={inputCls}>{INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select>
          </div>
          <div>
            <label className={labelCls}>City <span className="text-red-500">*</span></label>
            <select value={formData.city} onChange={(e) => set('city', e.target.value)} className={inputCls}>{cities.map(c => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <Field label="Pincode" value={formData.pincode} onChange={(v: string) => set('pincode', v)} placeholder="201301" />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold uppercase tracking-wider text-content-muted mb-4">Description</h3>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Vehicle Description</label>
            <textarea value={formData.description} onChange={(e) => set('description', e.target.value)} rows={4} placeholder="Detailed description..." className={inputCls + ' resize-none'} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Features (comma-separated)</label>
              <textarea value={formData.features} onChange={(e) => set('features', e.target.value)} rows={3} placeholder="Sunroof, Leather seats" className={inputCls + ' resize-none'} />
            </div>
            <div>
              <label className={labelCls}>Highlights (comma-separated)</label>
              <textarea value={formData.highlights} onChange={(e) => set('highlights', e.target.value)} rows={3} placeholder="Single owner, Service records" className={inputCls + ' resize-none'} />
            </div>
          </div>
        </div>
      </section>      <section>
        <h3 className="text-sm font-bold uppercase tracking-wider text-content-muted mb-4">Inventory Settings</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelCls}>Status <span className="text-red-500">*</span></label>
            <select value={formData.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>{STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          </div>
          <div>
            <label className={labelCls}>Listing Visibility <span className="text-red-500">*</span></label>
            <select value={formData.listingStatus} onChange={(e) => set('listingStatus', e.target.value)} className={inputCls} aria-label="Listing visibility">{LISTING_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          </div>
          {!dealerMode && <Toggle label="Featured" checked={formData.isFeatured} onChange={(v) => set('isFeatured', v)} star />}
          <Toggle label="Certified" checked={formData.isCertified} onChange={(v) => set('isCertified', v)} />
          <Toggle label="Finance Available" checked={formData.availableForFinance} onChange={(v) => set('availableForFinance', v)} />
        </div>
        {dealerMode && <p className="text-xs text-content-muted mt-2">New listings go live as Available under your dealership. Featured placement is managed by admins.</p>}
      </section>

      <section>
        <h3 className="text-sm font-bold uppercase tracking-wider text-content-muted mb-4">Vehicle Images <span className="text-red-500">*</span></h3>
        <div className="flex gap-3 mb-3">
          <input type="url" value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); if (error) setError(''); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl(); } }} placeholder="https://example.com/car-image.jpg" className={inputCls + ' flex-1'} aria-label="Image URL" />
          <button type="button" onClick={addImageUrl} disabled={!imageUrl.trim()} className="px-4 py-2.5 bg-[#FFC700] text-[#15130a] rounded-lg text-sm font-semibold hover:brightness-110 disabled:opacity-50 flex items-center gap-2"><Upload size={16} /> Add Image</button>
        </div>
        <div className="mb-4">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => void handleFiles(e.target.files)} aria-label="Upload images from device" />
          {/* Drop zone: click to browse, or drag & drop files. */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload images: click to browse or drop files here"
            onClick={() => { if (!isUploading) fileInputRef.current?.click(); }}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isUploading) { e.preventDefault(); fileInputRef.current?.click(); } }}
            onDragEnter={(e) => { e.preventDefault(); dragDepth.current++; setIsDragging(true); }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => { e.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setIsDragging(false); }}
            onDrop={(e) => { e.preventDefault(); dragDepth.current = 0; setIsDragging(false); if (!isUploading) void handleFiles(e.dataTransfer.files); }}
            className={'flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 text-sm transition-colors ' + (isDragging ? 'border-[#FFC700] bg-[#FFC700]/10 text-content' : 'border-border text-content-muted hover:border-[#FFC700]/60 hover:text-content') + (isUploading ? ' opacity-70 pointer-events-none' : ' cursor-pointer')}
          >
            {isUploading ? <Loader2 size={18} className="animate-spin shrink-0" /> : <ImagePlus size={18} className="shrink-0" />}
            <span className="font-semibold">{isUploading ? 'Uploading…' : isDragging ? 'Drop images to upload' : 'Upload from device — click or drag & drop'}</span>
          </div>
          {/* Per-file progress while sharp compresses each upload server-side. */}
          {uploadProgress && (
            <div className="mt-3" role="status" aria-live="polite" aria-label="Upload progress">
              <div className="flex items-center justify-between text-xs text-content-muted mb-1.5">
                <span className="truncate">Uploading {uploadProgress.done + 1} of {uploadProgress.total}: {uploadProgress.current}</span>
                <span className="ml-2 shrink-0 font-semibold">{Math.round((uploadProgress.done / uploadProgress.total) * 100)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuemin={0} aria-valuemax={uploadProgress.total} aria-valuenow={uploadProgress.done}>
                <div className="h-full rounded-full bg-gradient-to-r from-[#FFC700] to-yellow-500 transition-all duration-300" style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }} />
              </div>
            </div>
          )}
          <p className="text-xs text-content-muted mt-2">jpg, png or webp up to 10 MB — compressed automatically. Or paste an image URL above.</p>
          {uploadError && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={13} /> {uploadError}</p>}
        </div>
        {formData.images.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {formData.images.map((url, i) => (
              <div key={i} className="relative group" data-vehicle-image={url}>
                <div className="relative aspect-[4/3] bg-surface rounded-lg overflow-hidden border border-border">
                  {url.startsWith('data:') || url.startsWith('http') || url.startsWith('/') ? (
                    <Image
                      src={url}
                      alt={'Vehicle ' + (i + 1)}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                      // Local /uploads + data URIs skip the optimizer (no
                      // remotePattern covers them); remote https URLs use it.
                      unoptimized={url.startsWith('/') || url.startsWith('data:')}
                    />
                  ) : <div className="w-full h-full flex items-center justify-center text-xs text-content-muted">Preview</div>}
                </div>
                {i === 0 && <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#FFC700] text-[#15130a] text-xs font-bold rounded">Primary</span>}
                <div className="absolute top-2 right-2 flex gap-1">
                  {i > 0 && <button type="button" onClick={() => moveImage(i, 'up')} className="p-1.5 bg-white/90 rounded shadow text-xs font-bold">↑</button>}
                  {i < formData.images.length - 1 && <button type="button" onClick={() => moveImage(i, 'down')} className="p-1.5 bg-white/90 rounded shadow text-xs font-bold">↓</button>}
                  <button type="button" onClick={() => removeImage(i)} className="p-1.5 bg-red-500 text-white rounded shadow text-xs font-bold">×</button>
                </div>
              </div>
            ))}
          </div>
) : (
          <div className="text-center py-10 border-2 border-dashed border-border rounded-xl"><Upload size={28} className="mx-auto text-content-muted mb-2" /><p className="text-sm text-content-muted">No images added yet</p></div>
        )}
      </section>

      {/* Vehicle Videos */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-wider text-content-muted mb-4">Vehicle Videos <span className="text-slate-500">(Optional)</span></h3>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Video URL <span className="text-slate-500">(MP4, WebM)</span></label>
              <input type="url" value={formData.videoUrl || ''} onChange={(e) => setFormData(pv => ({ ...pv, videoUrl: e.target.value }))} placeholder="https://example.com/video.mp4" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Thumbnail URL (Optional)</label>
              <input type="url" value={formData.videoThumbnail || ''} onChange={(e) => setFormData(pv => ({ ...pv, videoThumbnail: e.target.value }))} placeholder="https://example.com/thumb.jpg" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Video Title (Optional)</label>
              <input type="text" value={formData.videoTitle || ''} onChange={(e) => setFormData(pv => ({ ...pv, videoTitle: e.target.value }))} placeholder="e.g., Interior Walkthrough" className={inputCls} />
            </div>
          </div>
          </div>
        </section>
        {onCancel && (
          <button type="button" onClick={discard} className="px-6 py-2.5 border border-border rounded-xl text-sm font-semibold text-content hover:bg-surface transition-colors">
            Cancel
          </button>
        )}
        <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#FFC700] text-[#15130a] rounded-xl text-sm font-semibold hover:brightness-110 disabled:opacity-50 flex items-center gap-2">
          {isSubmitting ? (editId ? 'Saving...' : 'Creating...') : editId ? 'Save Changes' : formData.status === 'DRAFT' ? 'Save as Draft' : 'Create Vehicle'}
        </button>
    </form>

      {/* Confirmation modal for un-recoverable image deletions. */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-asset-title"
          onClick={() => !isDeleting && setPendingDelete(null)}
        >
          <div className="bg-card rounded-2xl border border-line p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 bg-red-500/10 rounded-full"><Trash2 size={20} className="text-red-400" /></div>
              <div>
                <h3 id="delete-asset-title" className="text-lg font-bold text-content">Are you sure you want to delete this asset?</h3>
                <p className="text-sm text-content-muted mt-1">
                  This permanently deletes the image file from storage (disk or Cloudinary) and removes it from the vehicle&apos;s gallery. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setPendingDelete(null)} disabled={isDeleting} className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-content hover:bg-surface disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={() => void confirmRemoveImage()} disabled={isDeleting} className="px-5 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-50 flex items-center gap-2">
                {isDeleting && <Loader2 size={15} className="animate-spin" />} Delete Asset
              </button>
            </div>
          </div>
        </div>
      )}
  </div>
);
}