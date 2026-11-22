'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import {
  AlertCircle,
  Car,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

import { PanelEmpty, PanelError, PanelLoading } from './ui/AdminPanelState';
import { formatINR } from '@/app/lib/currency';

interface NewCar {
  id: number;
  brandName: string;
  model: string;
  variant: string;
  slug: string;
  exShowroomPrice: number;
  onRoadPrice: number | null;
  fuel: string;
  transmission: string;
  mileageKmpl: number | null;
  engine: string | null;
  bodyType: string | null;
  features: string[];
  imageUrl: string | null;
  isElectric: boolean;
  batteryCapacityKwh: number | null;
  claimedRangeKm: number | null;
  chargingType: string | null;
  fastCharging: boolean | null;
  chargingTimeHours: number | null;
}

interface Brand {
  id: number;
  name: string;
}

const FUEL_TYPES = ['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID', 'CNG'];
const TRANSMISSION_TYPES = ['MANUAL', 'AUTOMATIC', 'AMT', 'DCT', 'CVT'];
const BODY_TYPES = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Coupe', 'Convertible', 'Luxury', 'Pickup'];

const emptyForm = {
  brandName: '',
  model: '',
  variant: '',
  exShowroomPrice: '',
  onRoadPrice: '',
  fuel: 'PETROL',
  transmission: 'MANUAL',
  mileageKmpl: '',
  engine: '',
  bodyType: '',
  features: '',
  imageUrl: '',
  isElectric: false,
  batteryCapacityKwh: '',
  claimedRangeKm: '',
  chargingType: '',
  fastCharging: false,
  chargingTimeHours: '',
};

export default function AdminNewCarsPanel() {
  const [cars, setCars] = useState<NewCar[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [isNewBrand, setIsNewBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const formId = useId();

  const fetchCars = useCallback(async () => {
    setLoadError('');
    try {
      const res = await fetch('/api/admin/new-cars', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      setCars(data.cars || []);
    } catch (err) {
      setCars([]);
      setLoadError(err instanceof Error ? err.message : 'Could not load new cars.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch('/api/brands');
      const data = await res.json();
      setBrands(data.brands || data || []);
    } catch {
      setBrands([]);
    }
  }, []);

  useEffect(() => {
    // Both are pure fetches; the awaits happen before any setState, so mount
    // does not cascade a synchronous re-render.
    void (async () => {
      await Promise.all([fetchCars(), fetchBrands()]);
    })();
  }, [fetchCars, fetchBrands]);

  const openAdd = () => {
    setEditingId(null);
    setFormData({ ...emptyForm });
    setIsNewBrand(false);
    setNewBrandName('');
    setSelectedBrandId('');
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const openEdit = (car: NewCar) => {
    setEditingId(car.id);
    setFormData({
      brandName: car.brandName,
      model: car.model,
      variant: car.variant || '',
      exShowroomPrice: String(car.exShowroomPrice),
      onRoadPrice: car.onRoadPrice ? String(car.onRoadPrice) : '',
      fuel: car.fuel,
      transmission: car.transmission,
      mileageKmpl: car.mileageKmpl ? String(car.mileageKmpl) : '',
      engine: car.engine || '',
      bodyType: car.bodyType || '',
      features: car.features.join(', '),
      imageUrl: car.imageUrl || '',
      isElectric: car.isElectric,
      batteryCapacityKwh: car.batteryCapacityKwh ? String(car.batteryCapacityKwh) : '',
      claimedRangeKm: car.claimedRangeKm ? String(car.claimedRangeKm) : '',
      chargingType: car.chargingType || '',
      fastCharging: car.fastCharging || false,
      chargingTimeHours: car.chargingTimeHours ? String(car.chargingTimeHours) : '',
    });
    setIsNewBrand(false);
    setNewBrandName('');
    const brand = brands.find((b) => b.name === car.brandName);
    setSelectedBrandId(brand?.id || '');
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const brandName = isNewBrand
      ? newBrandName.trim()
      : brands.find((b) => b.id === selectedBrandId)?.name || '';
    if (!brandName) return setError('Brand is required');
    if (!formData.model.trim()) return setError('Model is required');
    if (!formData.exShowroomPrice.trim()) return setError('Ex-showroom price is required');

    setSubmitting(true);
    try {
      const payload = {
        brandName,
        model: formData.model.trim(),
        variant: formData.variant.trim() || undefined,
        exShowroomPrice: Number(formData.exShowroomPrice),
        onRoadPrice: formData.onRoadPrice ? Number(formData.onRoadPrice) : undefined,
        fuel: formData.fuel,
        transmission: formData.transmission,
        mileageKmpl: formData.mileageKmpl ? Number(formData.mileageKmpl) : undefined,
        engine: formData.engine.trim() || undefined,
        bodyType: formData.bodyType || undefined,
        features: formData.features.split(',').map((s) => s.trim()).filter(Boolean),
        imageUrl: formData.imageUrl.trim() || undefined,
        isElectric: formData.isElectric,
        batteryCapacityKwh: formData.batteryCapacityKwh ? Number(formData.batteryCapacityKwh) : undefined,
        claimedRangeKm: formData.claimedRangeKm ? Number(formData.claimedRangeKm) : undefined,
        chargingType: formData.chargingType.trim() || undefined,
        fastCharging: formData.fastCharging,
        chargingTimeHours: formData.chargingTimeHours ? Number(formData.chargingTimeHours) : undefined,
      };

      const url = editingId ? `/api/admin/new-cars/${editingId}` : '/api/admin/new-cars';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      setSuccess(editingId ? 'New car updated.' : 'New car created.');
      setTimeout(() => {
        setShowForm(false);
        void fetchCars();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleteConfirm(null);
    try {
      const res = await fetch(`/api/admin/new-cars/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setSuccess('New car deleted.');
      void fetchCars();
      setTimeout(() => setSuccess(''), 2500);
    } catch {
      setError('Failed to delete new car');
    }
  };

  const inputCls = 'admin-input';
  const labelCls = 'admin-label';

  if (loading) return <PanelLoading rows={4} label="Loading new cars" />;

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="font-medium">{error}</p>
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

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight text-[hsl(var(--color-content))]">
            New car catalogue
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
            Manufacturer models shown in the new-car discovery section. These are
            separate from used inventory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchCars()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] px-3 text-sm text-[hsl(var(--color-content-muted))] transition-colors hover:text-[hsl(var(--color-content))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
            title="Refresh new cars"
          >
            <RefreshCw size={16} aria-hidden="true" />
            <span className="sr-only">Refresh</span>
          </button>
          <button type="button" onClick={openAdd} className="admin-btn admin-btn-primary">
            <Plus size={16} aria-hidden="true" /> Add new car
          </button>
        </div>
      </div>

      {showForm && (
        <div className="admin-card overflow-hidden">
          <div className="flex items-start justify-between gap-3 border-b border-[hsl(var(--color-line))] p-4 sm:p-5">
            <div>
              <h3 className="text-base font-bold tracking-tight text-[hsl(var(--color-content))]">
                {editingId ? 'Edit new car' : 'Add new car'}
              </h3>
              <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
                Fields marked with an asterisk are required.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[hsl(var(--color-content-muted))] transition-colors hover:bg-[hsl(var(--admin-surface-muted))] hover:text-[hsl(var(--color-content))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
              aria-label="Close new car form"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-5">
            <FormGroup title="Basic information">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelCls} htmlFor={`${formId}-brand`}>
                    Brand <span className="text-[hsl(var(--color-error))]" aria-hidden="true">*</span>
                    <span className="sr-only"> (required)</span>
                  </label>
                  <select
                    id={`${formId}-brand`}
                    value={isNewBrand ? '__new' : String(selectedBrandId)}
                    onChange={(e) => {
                      if (e.target.value === '__new') {
                        setIsNewBrand(true);
                        setSelectedBrandId('');
                        setNewBrandName('');
                      } else {
                        setIsNewBrand(false);
                        setSelectedBrandId(Number(e.target.value));
                      }
                    }}
                    className={inputCls}
                  >
                    <option value="">Select brand</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                    <option value="__new">+ Add new brand</option>
                  </select>
                  {isNewBrand && (
                    <input
                      type="text"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      placeholder="Enter new brand name"
                      className={inputCls + ' mt-2'}
                      aria-label="New brand name"
                    />
                  )}
                </div>
                <div>
                  <label className={labelCls} htmlFor={`${formId}-model`}>
                    Model <span className="text-[hsl(var(--color-error))]" aria-hidden="true">*</span>
                    <span className="sr-only"> (required)</span>
                  </label>
                  <input
                    id={`${formId}-model`}
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData((p) => ({ ...p, model: e.target.value }))}
                    placeholder="e.g., Creta"
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor={`${formId}-variant`}>Variant</label>
                  <input
                    id={`${formId}-variant`}
                    type="text"
                    value={formData.variant}
                    onChange={(e) => setFormData((p) => ({ ...p, variant: e.target.value }))}
                    placeholder="e.g., SX (O)"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor={`${formId}-price`}>
                    Ex-showroom price (₹){' '}
                    <span className="text-[hsl(var(--color-error))]" aria-hidden="true">*</span>
                    <span className="sr-only"> (required)</span>
                  </label>
                  <input
                    id={`${formId}-price`}
                    type="number"
                    inputMode="numeric"
                    value={formData.exShowroomPrice}
                    onChange={(e) => setFormData((p) => ({ ...p, exShowroomPrice: e.target.value }))}
                    placeholder="1150000"
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor={`${formId}-onroad`}>On-road price (₹)</label>
                  <input
                    id={`${formId}-onroad`}
                    type="number"
                    inputMode="numeric"
                    value={formData.onRoadPrice}
                    onChange={(e) => setFormData((p) => ({ ...p, onRoadPrice: e.target.value }))}
                    placeholder="1350000"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor={`${formId}-fuel`}>Fuel type</label>
                  <select
                    id={`${formId}-fuel`}
                    value={formData.fuel}
                    onChange={(e) => setFormData((p) => ({ ...p, fuel: e.target.value }))}
                    className={inputCls}
                  >
                    {FUEL_TYPES.map((f) => (
                      <option key={f} value={f}>{f.toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor={`${formId}-transmission`}>Transmission</label>
                  <select
                    id={`${formId}-transmission`}
                    value={formData.transmission}
                    onChange={(e) => setFormData((p) => ({ ...p, transmission: e.target.value }))}
                    className={inputCls}
                  >
                    {TRANSMISSION_TYPES.map((t) => (
                      <option key={t} value={t}>{t.toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor={`${formId}-mileage`}>Mileage (kmpl)</label>
                  <input
                    id={`${formId}-mileage`}
                    type="number"
                    step="0.1"
                    value={formData.mileageKmpl}
                    onChange={(e) => setFormData((p) => ({ ...p, mileageKmpl: e.target.value }))}
                    placeholder="18.5"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor={`${formId}-body`}>Body type</label>
                  <select
                    id={`${formId}-body`}
                    value={formData.bodyType}
                    onChange={(e) => setFormData((p) => ({ ...p, bodyType: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Select body type</option>
                    {BODY_TYPES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>
            </FormGroup>

            <FormGroup title="Additional details">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelCls} htmlFor={`${formId}-engine`}>Engine</label>
                  <input
                    id={`${formId}-engine`}
                    type="text"
                    value={formData.engine}
                    onChange={(e) => setFormData((p) => ({ ...p, engine: e.target.value }))}
                    placeholder="999 cc, 3-cylinder"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor={`${formId}-image`}>Image URL</label>
                  <input
                    id={`${formId}-image`}
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData((p) => ({ ...p, imageUrl: e.target.value }))}
                    placeholder="https://example.com/car.jpg"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor={`${formId}-features`}>
                    Features
                  </label>
                  <input
                    id={`${formId}-features`}
                    type="text"
                    value={formData.features}
                    onChange={(e) => setFormData((p) => ({ ...p, features: e.target.value }))}
                    placeholder="Sunroof, Touchscreen"
                    className={inputCls}
                    aria-describedby={`${formId}-features-hint`}
                  />
                  <p id={`${formId}-features-hint`} className="form-hint">
                    Separate each feature with a comma.
                  </p>
                </div>
              </div>
            </FormGroup>

            <FormGroup title="Electric vehicle">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Toggle
                  label="Electric"
                  description="Show EV-specific specification fields."
                  checked={formData.isElectric}
                  onChange={(checked) => setFormData((p) => ({ ...p, isElectric: checked }))}
                />
                {formData.isElectric && (
                  <>
                    <div>
                      <label className={labelCls} htmlFor={`${formId}-battery`}>Battery (kWh)</label>
                      <input
                        id={`${formId}-battery`}
                        type="number"
                        step="0.1"
                        value={formData.batteryCapacityKwh}
                        onChange={(e) => setFormData((p) => ({ ...p, batteryCapacityKwh: e.target.value }))}
                        placeholder="40.5"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor={`${formId}-range`}>Range (km)</label>
                      <input
                        id={`${formId}-range`}
                        type="number"
                        value={formData.claimedRangeKm}
                        onChange={(e) => setFormData((p) => ({ ...p, claimedRangeKm: e.target.value }))}
                        placeholder="450"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor={`${formId}-charging-type`}>Charging type</label>
                      <input
                        id={`${formId}-charging-type`}
                        type="text"
                        value={formData.chargingType}
                        onChange={(e) => setFormData((p) => ({ ...p, chargingType: e.target.value }))}
                        placeholder="CCS2"
                        className={inputCls}
                      />
                    </div>
                    <Toggle
                      label="Fast charging"
                      description="Supports DC fast charging."
                      checked={formData.fastCharging}
                      onChange={(checked) => setFormData((p) => ({ ...p, fastCharging: checked }))}
                    />
                    <div>
                      <label className={labelCls} htmlFor={`${formId}-charging-time`}>
                        Charging time (hrs)
                      </label>
                      <input
                        id={`${formId}-charging-time`}
                        type="number"
                        step="0.1"
                        value={formData.chargingTimeHours}
                        onChange={(e) => setFormData((p) => ({ ...p, chargingTimeHours: e.target.value }))}
                        placeholder="0.5"
                        className={inputCls}
                      />
                    </div>
                  </>
                )}
              </div>
            </FormGroup>

            <div className="flex flex-col-reverse gap-2 border-t border-[hsl(var(--color-line))] pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="admin-btn admin-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && (
                  <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                )}
                {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Create new car'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loadError ? (
        <PanelError message={loadError} onRetry={() => void fetchCars()} />
      ) : cars.length === 0 ? (
        <PanelEmpty
          icon={Car}
          title="No new cars yet"
          description="Add a manufacturer model to populate the new-car discovery section."
          action={
            <button type="button" onClick={openAdd} className="admin-btn admin-btn-primary text-xs">
              <Plus size={15} aria-hidden="true" /> Add new car
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cars.map((car) => (
            <article key={car.id} className="admin-card admin-card-hover overflow-hidden">
              <div className="relative aspect-[4/3] bg-[hsl(var(--admin-surface-muted))]">
                {car.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={car.imageUrl}
                    alt={`${car.brandName} ${car.model}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.style.display = 'none';
                      const fallback = img.parentElement?.querySelector('.img-fallback');
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[hsl(var(--admin-surface-muted))] to-[hsl(var(--color-line))] img-fallback ${car.imageUrl ? 'hidden' : ''}`}>
                  <Car size={34} className="text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
                </div>
                {car.isElectric && (
                  <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    <Zap size={11} aria-hidden="true" /> Electric
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="truncate text-sm font-bold text-[hsl(var(--color-content))]">
                  {car.brandName} {car.model} {car.variant}
                </p>
                <p className="mt-1 text-xs text-[hsl(var(--color-content-muted))]">
                  {car.fuel.toLowerCase()} · {car.transmission.toLowerCase()}
                  {car.bodyType ? ` · ${car.bodyType}` : ''}
                </p>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-base font-bold tabular-nums text-[hsl(var(--color-content))]">
                    {formatINR(car.exShowroomPrice)}
                  </p>
                  {car.onRoadPrice != null && (
                    <p className="text-xs text-[hsl(var(--color-content-muted))]">
                      {formatINR(car.onRoadPrice)} on-road
                    </p>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(car)}
                    className="admin-btn admin-btn-secondary min-h-10 flex-1 px-3 text-xs"
                  >
                    <Pencil size={13} aria-hidden="true" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(car.id)}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
                  >
                    <Trash2 size={13} aria-hidden="true" /> Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-new-car-title"
          aria-describedby="delete-new-car-description"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="admin-card w-full max-w-md bg-[hsl(var(--admin-surface))] p-5 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
                <Trash2 size={19} aria-hidden="true" />
              </div>
              <div>
                <h3 id="delete-new-car-title" className="text-lg font-bold tracking-tight text-[hsl(var(--color-content))]">
                  Delete this new car?
                </h3>
                <p id="delete-new-car-description" className="mt-1 text-sm leading-6 text-[hsl(var(--color-content-muted))]">
                  This removes the model from the new-car catalogue. This action
                  cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(deleteConfirm)}
                className="admin-btn inline-flex bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--color-content-muted))]">
        {title}
      </h4>
      {children}
    </section>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
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
        <span className="block text-sm font-semibold text-[hsl(var(--color-content))]">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-5 text-[hsl(var(--color-content-muted))]">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
