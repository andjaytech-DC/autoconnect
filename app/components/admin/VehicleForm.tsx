'use client';

import { useId, useRef, useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  AlertCircle,
  Car,
  CheckCircle2,
  ImagePlus,
  Loader2,
  MapPin,
  Settings2,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { validateRegistrationNumber } from '@/app/lib/registration-number';
import PremiumVehicleSection, {
  premiumFromStored,
  premiumToPayload,
  type PremiumTagOption,
} from '@/app/components/admin/PremiumVehicleSection';

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
};

const inputCls = 'admin-input';
const labelCls = 'admin-label';
const selectCls = 'admin-input';

interface FieldProps {
  label: string;
  req?: boolean;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  min?: number | string;
  max?: number | string;
  disabled?: boolean;
  inputMode?: 'text' | 'numeric' | 'decimal';
}

function Field({
  label,
  req,
  type,
  value,
  onChange,
  placeholder,
  hint,
  error,
  min,
  max,
  disabled,
  inputMode,
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
        {req && (
          <span className="ml-0.5 text-[hsl(var(--color-error))]" aria-hidden="true">
            *
          </span>
        )}
        {req && <span className="sr-only"> (required)</span>}
      </label>
      <input
        id={id}
        type={type || 'text'}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        disabled={disabled}
        className={inputCls + (disabled ? ' cursor-not-allowed opacity-70' : '')}
        required={!!req}
        aria-required={!!req}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}
      />
      {hint && !error && (
        <p id={hintId} className="form-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="form-error">
          <AlertCircle size={12} aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

function SelectField({
  label,
  req,
  value,
  onChange,
  options,
  placeholder,
  hint,
  disabled,
}: {
  label: string;
  req?: boolean;
  value: string | number;
  onChange: (v: string) => void;
  options: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
        {req && (
          <span className="ml-0.5 text-[hsl(var(--color-error))]" aria-hidden="true">
            *
          </span>
        )}
        {req && <span className="sr-only"> (required)</span>}
      </label>
      <select
        id={id}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className={selectCls + (disabled ? ' cursor-not-allowed opacity-70' : '')}
        disabled={disabled}
        required={!!req}
        aria-required={!!req}
        aria-describedby={hint ? hintId : undefined}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={hintId} className="form-hint">
          {hint}
        </p>
      )}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  star,
}: {
  label: React.ReactNode;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  star?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] p-3.5 transition-colors hover:border-[hsl(var(--color-line-hover))] focus-within:ring-2 focus-within:ring-[hsl(var(--color-focus))]">
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="block h-6 w-11 rounded-full border border-[hsl(var(--color-line-hover))] bg-slate-200 transition-colors peer-checked:border-[hsl(var(--color-primary))] peer-checked:bg-[hsl(var(--color-primary))]" />
        <span className="absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--color-content))]">
          {star && (
            <Star
              size={15}
              className={checked ? 'fill-amber-500 text-amber-600' : 'text-[hsl(var(--color-content-faint))]'}
              aria-hidden="true"
            />
          )}
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs leading-5 text-[hsl(var(--color-content-muted))]">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

/** A titled card for one logical group of fields. */
function FormSection({
  id,
  icon: Icon,
  title,
  description,
  children,
  action,
}: {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  description: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="admin-card overflow-hidden" aria-labelledby={`${id}-heading`}>
      <div className="flex items-start justify-between gap-3 border-b border-[hsl(var(--color-line))] px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--admin-surface-muted))] text-[hsl(var(--color-primary-strong))]">
            <Icon size={17} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id={`${id}-heading`} className="text-base font-bold tracking-tight text-[hsl(var(--color-content))]">
              {title}
            </h2>
            <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
              {description}
            </p>
          </div>
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export default function VehicleForm({ onSuccess, onCancel, initialData, dealerMode, lockedDealerId, lockedDealerLabel }: VehicleFormProps) {
  const VIDEO_FORMAT_TEXT = "MP4" + String.fromCharCode(47) + "WebM";
  const formId = useId();
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
  const editId = initialData && Number(initialData.id) ? Number(initialData.id) : null;
  const premiumTagOptions = (initialData?.premiumTagOptions as PremiumTagOption[] | undefined) ?? null;
  const storedPremium = (initialData?.premium as Parameters<typeof premiumFromStored>[0]) ?? null;
  const showPremium = !dealerMode && !!editId && !!premiumTagOptions && !!storedPremium;
  const initialPremium = useMemo(() => premiumFromStored(storedPremium), [storedPremium]);
  const [premium, setPremium] = useState(initialPremium);
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoadingRefs, setIsLoadingRefs] = useState(true);

  const plateCheck = useMemo(
    () => validateRegistrationNumber(formData.registrationNumber),
    [formData.registrationNumber],
  );
  const plateValid = plateCheck.valid;
  const plateError = plateCheck.reason ?? 'Enter a valid registration number.';
  const [brands, setBrands] = useState<RefBrand[]>([]);
  const [categories, setCategories] = useState<RefCategory[]>([]);
  const [dealers, setDealers] = useState<RefDealer[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const MAX_IMAGES = 20;
  const uploadedRef = useRef<string[]>([]);
  const submittedRef = useRef(false);
  const [pendingDelete, setPendingDelete] = useState<{ index: number; url: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // `isLoadingRefs` starts true, so the first paint already shows the load
    // state; the effect only resolves it once the reference data arrives.
    if (dealerMode) {
      Promise.all([
        fetch('/api/brands').then((r) => r.json()).catch(() => ({ brands: [] })),
        fetch('/api/categories').then((r) => r.json()).catch(() => ({ categories: [] })),
      ]).then(([b, c]) => {
        setBrands(b.brands || []);
        setCategories(c.categories || []);
        setDealers([]);
        setIsLoadingRefs(false);
      }).catch(() => { setBrands([]); setCategories([]); setDealers([]); setIsLoadingRefs(false); });
      return;
    }
    fetch('/api/admin/lookups')
      .then((r) => r.json())
      .then((d) => {
        setBrands(d.brands || []);
        setCategories(d.categories || []);
        setDealers(
          (d.dealers || []).filter(
            (dl: { status?: string | null }) => !dl.status || dl.status === "APPROVED",
          ),
        );
        setIsLoadingRefs(false);
      })
      .catch(() => { setBrands([]); setCategories([]); setDealers([]); setIsLoadingRefs(false); });
  }, [dealerMode]);

  const cities = CITIES_BY_STATE[formData.state] || ['Noida'];
  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => { setFormData(pv => ({ ...pv, [k]: v })); setError(''); setSuccess(''); };
  const handleStateChange = (state: string) => {
    const cs = CITIES_BY_STATE[state] || ['Noida'];
    setFormData(pv => ({ ...pv, state, city: cs[0], registrationState: state })); setError(''); setSuccess('');
  };
  const addImageUrl = () => {
    const v = imageUrl.trim();
    if (!v) return;
    if (formData.images.length >= MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images allowed per vehicle.`);
      return;
    }
    setFormData(pv => ({ ...pv, images: [...pv.images, v] }));
    setImageUrl('');
    setError('');
    setSuccess('');
  };
  const removeImage = (i: number) => { setPendingDelete({ index: i, url: formData.images[i] }); setError(''); setSuccess(''); };
  const confirmRemoveImage = async () => {
    if (!pendingDelete) return;
    const { index, url } = pendingDelete;
    setPendingDelete(null);
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
    if (formData.images.length + list.length > MAX_IMAGES) {
      setUploadError(`Maximum ${MAX_IMAGES} images allowed per vehicle. You have ${formData.images.length}, trying to add ${list.length}.`);
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
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setSuccess('');

    // Wait for reference data to load
    if (isLoadingRefs) {
      setError('Please wait for reference data to load...');
      return;
    }

    // Validate plate first
    if (!plateValid) {
      setError(
        `Registration number is required and must be a valid Indian plate. ${plateError}`,
      );
      return;
    }

    // Auto-commit a typed-but-unadded URL
    let images = formData.images;
    const pending = imageUrl.trim();
    if (images.length === 0 && pending) {
      images = [...images, pending];
      setFormData(pv => ({ ...pv, images }));
      setImageUrl('');
    }

    // Validation matching backend createSchema exactly
    const errors: string[] = [];
    const brandName = brands.find((b) => b.id === formData.brandId)?.name || '';
    if (!brandName) errors.push('Brand is required');
    if (!formData.model.trim()) errors.push('Model is required');
    // variant is optional — only used for title construction
    if (!formData.year.trim()) errors.push('Year is required');
    if (!formData.price.trim()) errors.push('Price is required');
    if (!formData.mileage.trim()) errors.push('Mileage is required');
    if (!formData.fuel) errors.push('Fuel type is required');
    if (!formData.transmission) errors.push('Transmission is required');
    if (!formData.color.trim()) errors.push('Color is required');
    // bodyType is optional in backend
    if (!formData.city.trim()) errors.push('City is required');
    // state is optional in backend
    // registrationState is optional in backend
    if (images.length === 0) errors.push('At least one image is required');
    if (!formData.brandId || formData.brandId <= 0) errors.push('Brand is required');
    if (!formData.categoryId || formData.categoryId <= 0) errors.push('Category is required');
    // dealerId: must be positive number (0 is invalid)
    if (!formData.dealerId || formData.dealerId <= 0) errors.push('Dealer is required');
    if (!formData.registrationNumber.trim()) errors.push('Registration number is required');

    // Validate numeric fields
    const priceNum = Number(formData.price);
    const yearNum = Number(formData.year);
    const mileageNum = Number(formData.mileage);
    if (priceNum <= 0) errors.push('Price must be greater than 0');
    if (yearNum < 1900 || yearNum > new Date().getFullYear() + 1) errors.push(`Year must be between 1900 and ${new Date().getFullYear() + 1}`);
    if (mileageNum < 0) errors.push('Mileage cannot be negative');

    if (errors.length > 0) {
      setError(errors.join(' · '));
      return;
    }

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
        premium: showPremium ? premiumToPayload(premium, initialPremium) : undefined,
      };
      if (editId) {
        const response = await fetch('/api/vehicles/' + editId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || data.error || 'Failed to update vehicle');
        setSuccess('Vehicle updated successfully!');
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
      submittedRef.current = true;
      uploadedRef.current = [];
      if (onSuccess) {
        onSuccess(data.data);
      } else {
        // Embedded usage without a navigation callback: refresh so the new
        // vehicle appears in the surrounding inventory.
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (err) { const msg = err instanceof Error ? err.message : 'An error occurred'; setError(msg); }
    finally { setIsSubmitting(false); }
  };

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

  const brandOptions = brands.map(b => ({ value: b.id, label: b.name }));
  const categoryOptions = categories.map(c => ({ value: c.id, label: c.name }));
  const dealerOptions = dealers.map(dl => ({ value: dl.id, label: dl.name + (dl.city ? ` — ${dl.city}` : '') }));
  const fuelOptions = FUEL_TYPES.map(f => ({ value: f, label: f }));
  const transmissionOptions = TRANSMISSION_TYPES.map(t => ({ value: t, label: t }));
  const bodyTypeOptions = BODY_TYPES.map(b => ({ value: b, label: b }));
  const statusOptions = STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }));
  const listingStatusOptions = LISTING_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }));
  const stateOptions = INDIAN_STATES.map(s => ({ value: s, label: s }));
  const cityOptions = cities.map(c => ({ value: c, label: c }));
  const registrationStateOptions = INDIAN_STATES.map(s => ({ value: s, label: s }));

  return (
    <div className="space-y-4">
      <div className="admin-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold tracking-tight text-[hsl(var(--color-content))]">
              {editId ? 'Vehicle details' : 'New vehicle details'}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[hsl(var(--color-content-muted))]">
              {editId
                ? 'Changes are written to the live marketplace record. Fields marked with an asterisk are required.'
                : 'Complete the listing in logical sections. You can keep it as a draft and publish it later.'}
            </p>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={discard}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-[hsl(var(--color-content-muted))] transition-colors hover:bg-[hsl(var(--admin-surface-muted))] hover:text-[hsl(var(--color-content))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
              aria-label="Close the vehicle form"
            >
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">The vehicle was not saved</p>
            <p className="mt-0.5 leading-6">{error}</p>
          </div>
        </div>
      )}
      {success && (
        <div
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
          role="status"
        >
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="font-medium">{success}</p>
        </div>
      )}

      {isLoadingRefs && (
        <div
          className="flex items-center gap-3 rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] p-4"
          role="status"
        >
          <Loader2 size={18} className="shrink-0 animate-spin text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
          <p className="text-sm text-[hsl(var(--color-content-muted))]">
            Loading brands, categories and dealers…
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormSection
          id={`${formId}-basic`}
          icon={Car}
          title="Basic information"
          description="Identify the vehicle and assign it to a brand, category and dealer."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label="Brand"
              req
              value={formData.brandId}
              onChange={(v) => set('brandId', Number(v))}
              options={brandOptions}
              placeholder="Select brand"
              disabled={isLoadingRefs}
            />
            <Field
              label="Model"
              req
              value={formData.model}
              onChange={(v: string) => set('model', v)}
              placeholder="e.g., Creta"
            />
            <Field
              label="Variant"
              value={formData.variant}
              onChange={(v: string) => set('variant', v)}
              placeholder="e.g., SX (O)"
              hint="Optional. Appended to the generated listing title."
            />
            <SelectField
              label="Category"
              req
              value={formData.categoryId}
              onChange={(v) => set('categoryId', Number(v))}
              options={categoryOptions}
              placeholder="Select category"
              disabled={isLoadingRefs}
            />
            <div>
              <label className={labelCls} htmlFor={`${formId}-dealer`}>
                Dealer
                <span className="ml-0.5 text-[hsl(var(--color-error))]" aria-hidden="true">*</span>
                <span className="sr-only"> (required)</span>
              </label>
              {dealerMode ? (
                <input
                  id={`${formId}-dealer`}
                  value={lockedDealerLabel || 'Your dealership'}
                  disabled
                  className={inputCls + ' cursor-not-allowed opacity-70'}
                  aria-label="Dealership (locked)"
                />
              ) : (
                <select
                  id={`${formId}-dealer`}
                  value={formData.dealerId}
                  onChange={(e) => set('dealerId', Number(e.target.value))}
                  className={selectCls}
                  disabled={isLoadingRefs}
                  required
                  aria-required
                >
                  <option value={0}>Select dealer</option>
                  {dealerOptions.map((dl) => (
                    <option key={dl.value} value={dl.value}>{dl.label}</option>
                  ))}
                </select>
              )}
            </div>
            <Field
              label="Colour"
              req
              value={formData.color}
              onChange={(v: string) => set('color', v)}
              placeholder="e.g., Polar White"
            />
          </div>
        </FormSection>

        <FormSection
          id={`${formId}-specs`}
          icon={Tag}
          title="Specifications & pricing"
          description="The figures customers use to compare this vehicle."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Price (₹)"
              req
              type="number"
              inputMode="numeric"
              value={formData.price}
              onChange={(v: string) => set('price', v)}
              placeholder="1450000"
              min="1"
              hint="Ex-showroom price in Indian rupees."
            />
            <Field
              label="Year"
              req
              type="number"
              inputMode="numeric"
              value={formData.year}
              onChange={(v: string) => set('year', v)}
              min="1900"
              max={new Date().getFullYear() + 1}
            />
            <Field
              label="Mileage (km)"
              req
              type="number"
              inputMode="numeric"
              value={formData.mileage}
              onChange={(v: string) => set('mileage', v)}
              placeholder="18500"
              min="0"
            />
            <SelectField
              label="Fuel type"
              req
              value={formData.fuel}
              onChange={(v: string) => set('fuel', v)}
              options={fuelOptions}
            />
            <SelectField
              label="Transmission"
              req
              value={formData.transmission}
              onChange={(v: string) => set('transmission', v)}
              options={transmissionOptions}
            />
            <SelectField
              label="Body type"
              value={formData.bodyType}
              onChange={(v: string) => set('bodyType', v)}
              options={bodyTypeOptions}
              placeholder="Select body type"
            />
          </div>
        </FormSection>

        <FormSection
          id={`${formId}-registration`}
          icon={MapPin}
          title="Registration & location"
          description="Used for the RTO/VAHAN history check and for local inventory search."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Registration number"
              req
              value={formData.registrationNumber}
              onChange={(v: string) => set('registrationNumber', v.toUpperCase())}
              placeholder="UP16AB1234"
              hint="Required. Used to run the RTO/VAHAN history check."
              error={
                formData.registrationNumber.trim() !== '' && !plateValid
                  ? plateError
                  : undefined
              }
            />
            <SelectField
              label="Registration state"
              value={formData.registrationState}
              onChange={(v: string) => set('registrationState', v)}
              options={registrationStateOptions}
              placeholder="Select registration state"
            />
            <div>
              <label className={labelCls} htmlFor={`${formId}-state`}>
                State
                <span className="ml-0.5 text-[hsl(var(--color-error))]" aria-hidden="true">*</span>
                <span className="sr-only"> (required)</span>
              </label>
              <select
                id={`${formId}-state`}
                value={formData.state}
                onChange={(e) => handleStateChange(e.target.value)}
                className={selectCls}
                required
                aria-required
              >
                {stateOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor={`${formId}-city`}>
                City
                <span className="ml-0.5 text-[hsl(var(--color-error))]" aria-hidden="true">*</span>
                <span className="sr-only"> (required)</span>
              </label>
              <select
                id={`${formId}-city`}
                value={formData.city}
                onChange={(e) => set('city', e.target.value)}
                className={selectCls}
                required
                aria-required
              >
                {cityOptions.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <Field
              label="Pincode"
              value={formData.pincode}
              onChange={(v: string) => set('pincode', v)}
              placeholder="201301"
              inputMode="numeric"
            />
          </div>
        </FormSection>

        <FormSection
          id={`${formId}-description`}
          icon={Sparkles}
          title="Description & highlights"
          description="Explain the condition and the details that make this vehicle stand out."
        >
          <div className="space-y-4">
            <div>
              <label className={labelCls} htmlFor={`${formId}-vehicle-description`}>
                Vehicle description
              </label>
              <textarea
                id={`${formId}-vehicle-description`}
                value={formData.description}
                onChange={(e) => set('description', e.target.value)}
                rows={4}
                placeholder="Condition, ownership history and anything a buyer should know…"
                className={inputCls + ' resize-y'}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor={`${formId}-features`}>
                  Features
                </label>
                <textarea
                  id={`${formId}-features`}
                  value={formData.features}
                  onChange={(e) => set('features', e.target.value)}
                  rows={3}
                  placeholder="Sunroof, Leather seats, 360° camera"
                  className={inputCls + ' resize-y'}
                  aria-describedby={`${formId}-features-hint`}
                />
                <p id={`${formId}-features-hint`} className="form-hint">
                  Separate each feature with a comma.
                </p>
              </div>
              <div>
                <label className={labelCls} htmlFor={`${formId}-highlights`}>
                  Highlights
                </label>
                <textarea
                  id={`${formId}-highlights`}
                  value={formData.highlights}
                  onChange={(e) => set('highlights', e.target.value)}
                  rows={3}
                  placeholder="Single owner, Full service records"
                  className={inputCls + ' resize-y'}
                  aria-describedby={`${formId}-highlights-hint`}
                />
                <p id={`${formId}-highlights-hint`} className="form-hint">
                  Separate each highlight with a comma.
                </p>
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection
          id={`${formId}-publishing`}
          icon={Settings2}
          title="Publishing settings"
          description="Control the operational status and whether the listing is visible on the storefront."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Operational status"
              req
              value={formData.status}
              onChange={(v: string) => set('status', v)}
              options={statusOptions}
            />
            <SelectField
              label="Listing visibility"
              req
              value={formData.listingStatus}
              onChange={(v: string) => set('listingStatus', v)}
              options={listingStatusOptions}
              hint="Drafts are hidden from customers and excluded from public search."
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {!dealerMode && (
              <Toggle
                label="Featured"
                description="Promote this vehicle in featured sections."
                checked={formData.isFeatured}
                onChange={(v) => set('isFeatured', v)}
                star
              />
            )}
            <Toggle
              label="Certified"
              description="Show the certified badge on the storefront."
              checked={formData.isCertified}
              onChange={(v) => set('isCertified', v)}
            />
            <Toggle
              label="Finance available"
              description="Let customers apply for finance on this vehicle."
              checked={formData.availableForFinance}
              onChange={(v) => set('availableForFinance', v)}
            />
          </div>
          {dealerMode && (
            <p className="mt-3 rounded-lg bg-[hsl(var(--admin-surface-muted))] p-3 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
              New listings go live as Available under your dealership. Featured placement is managed by admins.
            </p>
          )}
        </FormSection>

        {showPremium && (
          <PremiumVehicleSection
            value={premium}
            onChange={setPremium}
            tags={premiumTagOptions ?? []}
            storedFeaturedUntil={storedPremium?.featuredUntil}
          />
        )}

        <FormSection
          id={`${formId}-images`}
          icon={ImagePlus}
          title="Images & media"
          description="The first image is used as the listing thumbnail. Drag files in or paste a URL."
          action={
            <span className="shrink-0 rounded-full bg-[hsl(var(--admin-surface-muted))] px-2.5 py-1 text-xs font-semibold tabular-nums text-[hsl(var(--color-content-muted))]">
              {formData.images.length} / {MAX_IMAGES}
            </span>
          }
        >
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addImageUrl();
                }
              }}
              placeholder="https://example.com/car-image.jpg"
              className={inputCls + ' flex-1'}
              aria-label="Image URL"
            />
            <button
              type="button"
              onClick={addImageUrl}
              disabled={!imageUrl.trim()}
              className="admin-btn admin-btn-secondary shrink-0"
            >
              <Upload size={16} aria-hidden="true" /> Add image
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
            aria-label="Upload images from device"
          />
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload images: click to browse or drop files here"
            onClick={() => {
              if (!isUploading) fileInputRef.current?.click();
            }}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !isUploading) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              dragDepth.current++;
              setIsDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              e.preventDefault();
              dragDepth.current = Math.max(0, dragDepth.current - 1);
              if (dragDepth.current === 0) setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              dragDepth.current = 0;
              setIsDragging(false);
              if (!isUploading) void handleFiles(e.dataTransfer.files);
            }}
            className={
              'flex items-center gap-3 rounded-xl border border-dashed px-4 py-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] ' +
              (isDragging
                ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.12)] text-[hsl(var(--color-content))]'
                : 'border-[hsl(var(--color-line-hover))] bg-[hsl(var(--admin-surface-muted))] text-[hsl(var(--color-content-muted))] hover:border-[hsl(var(--color-primary))] hover:text-[hsl(var(--color-content))]') +
              (isUploading ? ' pointer-events-none opacity-70' : ' cursor-pointer')
            }
          >
            {isUploading ? (
              <Loader2 size={18} className="shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus size={18} className="shrink-0" aria-hidden="true" />
            )}
            <span className="font-semibold">
              {isUploading
                ? 'Uploading…'
                : isDragging
                  ? 'Drop images to upload'
                  : 'Upload from device — click or drag & drop'}
            </span>
          </div>

          {uploadProgress && (
            <div className="mt-3" role="status" aria-live="polite" aria-label="Upload progress">
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-[hsl(var(--color-content-muted))]">
                <span className="truncate">
                  Uploading {uploadProgress.done + 1} of {uploadProgress.total}: {uploadProgress.current}
                </span>
                <span className="shrink-0 font-semibold">
                  {Math.round((uploadProgress.done / uploadProgress.total) * 100)}%
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--admin-surface-muted))]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={uploadProgress.total}
                aria-valuenow={uploadProgress.done}
              >
                <div
                  className="h-full rounded-full bg-[hsl(var(--color-primary))] transition-all duration-300 motion-reduce:transition-none"
                  style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          <p className="form-hint">
            JPG, PNG or WebP up to 10 MB — compressed automatically. Or paste an image URL above.
          </p>
          {uploadError && (
            <p className="form-error" role="alert">
              <AlertCircle size={13} aria-hidden="true" /> {uploadError}
            </p>
          )}

          {formData.images.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {formData.images.map((url, i) => (
                <div key={`${url}-${i}`} className="group relative" data-vehicle-image={url}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface-muted))]">
                    {url.startsWith('data:') || url.startsWith('http') || url.startsWith('/') ? (
                      <Image
                        src={url}
                        alt={`Vehicle image ${i + 1}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                        unoptimized={url.startsWith('/') || url.startsWith('data:')}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[hsl(var(--color-content-muted))]">
                        Preview unavailable
                      </div>
                    )}
                  </div>
                  {i === 0 && (
                    <span className="absolute left-2 top-2 rounded-md bg-[hsl(var(--color-primary))] px-2 py-0.5 text-[11px] font-bold text-[hsl(var(--color-primary-foreground))]">
                      Primary
                    </span>
                  )}
                  <div className="absolute right-2 top-2 flex gap-1">
                    {i > 0 && (
                      <button
                        type="button"
                        onClick={() => moveImage(i, 'up')}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-sm font-bold text-slate-800 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
                        aria-label={`Move image ${i + 1} earlier`}
                      >
                        ↑
                      </button>
                    )}
                    {i < formData.images.length - 1 && (
                      <button
                        type="button"
                        onClick={() => moveImage(i, 'down')}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-sm font-bold text-slate-800 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
                        aria-label={`Move image ${i + 1} later`}
                      >
                        ↓
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
                      aria-label={`Remove image ${i + 1}`}
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-[hsl(var(--color-line-hover))] px-4 py-10 text-center">
              <Upload size={26} className="mx-auto text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-[hsl(var(--color-content))]">
                No images added yet
              </p>
              <p className="mt-1 text-xs text-[hsl(var(--color-content-muted))]">
                At least one image is required before the listing can be saved.
              </p>
            </div>
          )}
        </FormSection>

        <FormSection
          id={`${formId}-videos`}
          icon={Video}
          title="Vehicle video"
          description={`Optional walkthrough video. ${VIDEO_FORMAT_TEXT} files are supported.`}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Video URL"
              type="url"
              value={formData.videoUrl || ''}
              onChange={(v: string) => setFormData((pv) => ({ ...pv, videoUrl: v }))}
              placeholder="https://example.com/video.mp4"
            />
            <Field
              label="Thumbnail URL"
              type="url"
              value={formData.videoThumbnail || ''}
              onChange={(v: string) => setFormData((pv) => ({ ...pv, videoThumbnail: v }))}
              placeholder="https://example.com/thumb.jpg"
            />
            <Field
              label="Video title"
              value={formData.videoTitle || ''}
              onChange={(v: string) => setFormData((pv) => ({ ...pv, videoTitle: v }))}
              placeholder="e.g., Interior walkthrough"
            />
          </div>
        </FormSection>

        <div className="admin-card sticky bottom-0 z-30 flex items-center justify-between gap-3 rounded-b-none p-3 shadow-[var(--admin-shadow-hover)] sm:bottom-3 sm:rounded-b-2xl">
          <p className="hidden text-xs leading-5 text-[hsl(var(--color-content-muted))] sm:block">
            Fields marked <span className="font-semibold text-[hsl(var(--color-error))]">*</span> are required.
          </p>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {onCancel && (
              <button type="button" onClick={discard} className="admin-btn admin-btn-secondary flex-1 sm:flex-none">
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || isLoadingRefs}
              className="admin-btn admin-btn-primary min-w-0 flex-1 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-40 sm:flex-none"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {isSubmitting
                ? editId
                  ? 'Saving…'
                  : 'Creating…'
                : editId
                  ? 'Save changes'
                  : formData.status === 'DRAFT'
                    ? 'Save as draft'
                    : 'Create vehicle'}
            </button>
          </div>
        </div>
      </form>

      {/* Confirmation modal for un-recoverable image deletions. */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-asset-title"
          aria-describedby="delete-asset-description"
          onClick={() => !isDeleting && setPendingDelete(null)}
        >
          <div
            className="admin-card w-full max-w-md bg-[hsl(var(--admin-surface))] p-5 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
                <Trash2 size={19} aria-hidden="true" />
              </div>
              <div>
                <h3 id="delete-asset-title" className="text-lg font-bold tracking-tight text-[hsl(var(--color-content))]">
                  Delete this image?
                </h3>
                <p id="delete-asset-description" className="mt-1 text-sm leading-6 text-[hsl(var(--color-content-muted))]">
                  This permanently deletes the file from storage and removes it
                  from the vehicle&apos;s gallery. This action cannot be undone.
                </p>
                {pendingDelete.url && (
                  <p className="mt-2 break-all rounded-lg bg-[hsl(var(--admin-surface-muted))] px-2.5 py-1.5 text-[11px] text-[hsl(var(--color-content-faint))]">
                    {pendingDelete.url}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={isDeleting}
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRemoveImage()}
                disabled={isDeleting}
                className="admin-btn inline-flex bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting && <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                Delete image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}