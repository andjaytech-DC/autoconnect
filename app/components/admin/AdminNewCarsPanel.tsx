'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Car, X, Check, AlertCircle, Loader2 } from 'lucide-react';

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

  const fetchCars = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/new-cars');
      const data = await res.json();
      setCars(data.cars || []);
    } catch {
      setCars([]);
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

    const brandName = isNewBrand ? newBrandName.trim() : (brands.find((b) => b.id === selectedBrandId)?.name || '');
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

      setSuccess(editingId ? 'New car updated successfully!' : 'New car created successfully!');
      setTimeout(() => {
        setShowForm(false);
        fetchCars();
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
      setSuccess('New car deleted successfully!');
      fetchCars();
      setTimeout(() => setSuccess(''), 2500);
    } catch {
      setError('Failed to delete new car');
    }
  };

  const inputCls = 'w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC700]/40 bg-card text-content';
  const labelCls = 'block text-sm font-medium text-content mb-1.5';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-[#FFC700]" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
          <Check size={20} className="text-[#FFC700] flex-shrink-0" />
          <p className="text-sm text-emerald-400">{success}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-extrabold text-content">New Cars</h2>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FFC700] text-[#15130a] rounded-xl text-sm font-bold hover:brightness-110 transition-colors"
        >
          <Plus size={16} /> Add New Car
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl border border-line p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-content">{editingId ? 'Edit New Car' : 'Add New Car'}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="p-2 hover:bg-surface rounded-lg" aria-label="Close">
              <X size={20} className="text-content-muted" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <section>
              <h4 className="text-sm font-bold uppercase tracking-wider text-content-muted mb-4">Basic Information</h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelCls}>Brand</label>
                  <div className="flex gap-2">
                    <select
                      value={isNewBrand ? 'new' : String(selectedBrandId)}
                      onChange={(e) => {
                        if (e.target.value === 'new') {
                          setIsNewBrand(true);
                          setNewBrandName('');
                        } else {
                          setIsNewBrand(false);
                          setSelectedBrandId(Number(e.target.value));
                        }
                      }}
                      className={inputCls}
                    >
                      <option value="">Select Brand</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                      <option value="__new">+ Add New Brand</option>
                    </select>
                  </div>
                  {isNewBrand && (
                    <input
                      type="text"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      placeholder="Enter new brand name"
                      className={inputCls + ' mt-2'}
                    />
                  )}
                </div>
                <div>
                  <label className={labelCls}>Model <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.model} onChange={(e) => setFormData((p) => ({ ...p, model: e.target.value }))} placeholder="e.g., Creta" className={inputCls} required />
                </div>
                <div>
                  <label className={labelCls}>Variant</label>
                  <input type="text" value={formData.variant} onChange={(e) => setFormData((p) => ({ ...p, variant: e.target.value }))} placeholder="e.g., SX (O)" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Ex-Showroom Price (Rs) <span className="text-red-500">*</span></label>
                  <input type="number" value={formData.exShowroomPrice} onChange={(e) => setFormData((p) => ({ ...p, exShowroomPrice: e.target.value }))} placeholder="1150000" className={inputCls} required />
                </div>
                <div>
                  <label className={labelCls}>On-Road Price (Rs)</label>
                  <input type="number" value={formData.onRoadPrice} onChange={(e) => setFormData((p) => ({ ...p, onRoadPrice: e.target.value }))} placeholder="1350000" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Fuel Type</label>
                  <select value={formData.fuel} onChange={(e) => setFormData((p) => ({ ...p, fuel: e.target.value }))} className={inputCls}>
                    {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Transmission</label>
                  <select value={formData.transmission} onChange={(e) => setFormData((p) => ({ ...p, transmission: e.target.value }))} className={inputCls}>
                    {TRANSMISSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Mileage (kmpl)</label>
                  <input type="number" step="0.1" value={formData.mileageKmpl} onChange={(e) => setFormData((p) => ({ ...p, mileageKmpl: e.target.value }))} placeholder="18.5" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Body Type</label>
                  <select value={formData.bodyType} onChange={(e) => setFormData((p) => ({ ...p, bodyType: e.target.value }))} className={inputCls}>
                    <option value="">Select Body Type</option>
                    {BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section>
              <h4 className="text-sm font-bold uppercase tracking-wider text-content-muted mb-4">Additional Details</h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelCls}>Engine</label>
                  <input type="text" value={formData.engine} onChange={(e) => setFormData((p) => ({ ...p, engine: e.target.value }))} placeholder="999 cc, 3-cylinder" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Image URL</label>
                  <input type="url" value={formData.imageUrl} onChange={(e) => setFormData((p) => ({ ...p, imageUrl: e.target.value }))} placeholder="https://example.com/car.jpg" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Features (comma-separated)</label>
                  <input type="text" value={formData.features} onChange={(e) => setFormData((p) => ({ ...p, features: e.target.value }))} placeholder="Sunroof, Touchscreen" className={inputCls} />
                </div>
              </div>
            </section>

            <section>
              <h4 className="text-sm font-bold uppercase tracking-wider text-content-muted mb-4">Electric Vehicle</h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-3 pt-6">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={formData.isElectric} onChange={(e) => setFormData((p) => ({ ...p, isElectric: e.target.checked }))} className="sr-only peer" />
                    <div className="w-11 h-6 bg-surface border border-border rounded-full peer peer-checked:bg-[#FFC700] peer peer-checked:border-[#FFC700] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#161b21] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
                  <span className="text-sm font-medium text-content">Electric</span>
                </div>
                {formData.isElectric && (
                  <>
                    <div>
                      <label className={labelCls}>Battery (kWh)</label>
                      <input type="number" step="0.1" value={formData.batteryCapacityKwh} onChange={(e) => setFormData((p) => ({ ...p, batteryCapacityKwh: e.target.value }))} placeholder="40.5" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Range (km)</label>
                      <input type="number" value={formData.claimedRangeKm} onChange={(e) => setFormData((p) => ({ ...p, claimedRangeKm: e.target.value }))} placeholder="450" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Charging Type</label>
                      <input type="text" value={formData.chargingType} onChange={(e) => setFormData((p) => ({ ...p, chargingType: e.target.value }))} placeholder="CCS2" className={inputCls} />
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={formData.fastCharging} onChange={(e) => setFormData((p) => ({ ...p, fastCharging: e.target.checked }))} className="sr-only peer" />
                        <div className="w-11 h-6 bg-surface border border-border rounded-full peer peer-checked:bg-[#FFC700] peer peer-checked:border-[#FFC700] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#161b21] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                      </label>
                      <span className="text-sm font-medium text-content">Fast Charging</span>
                    </div>
                    <div>
                      <label className={labelCls}>Charging Time (hrs)</label>
                      <input type="number" step="0.1" value={formData.chargingTimeHours} onChange={(e) => setFormData((p) => ({ ...p, chargingTimeHours: e.target.value }))} placeholder="0.5" className={inputCls} />
                    </div>
                  </>
                )}
              </div>
            </section>

            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 border border-border rounded-xl text-sm font-semibold text-content hover:bg-surface transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-[#FFC700] text-[#15130a] rounded-xl text-sm font-semibold hover:brightness-110 disabled:opacity-50 flex items-center gap-2">
                {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create New Car'}
              </button>
            </div>
          </form>
        </div>
      )}

      {cars.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
          <Car size={32} className="mx-auto text-content-muted mb-2" />
          <p className="text-content-muted text-sm">No new cars yet. Click &quot;Add New Car&quot; to create one.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((car) => (
            <div key={car.id} className="rounded-2xl border border-line bg-card overflow-hidden">
              <div className="aspect-[4/3] bg-surface">
                {car.imageUrl ? (
                  <img src={car.imageUrl} alt={`${car.brandName} ${car.model}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-content-muted">
                    <Car size={32} />
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="font-bold text-content text-sm truncate">{car.brandName} {car.model} {car.variant}</p>
                <p className="text-xs text-content-muted mt-1">{car.fuel} · {car.transmission}</p>
                <p className="text-sm font-bold text-[#FFC700] mt-2">₹{car.exShowroomPrice.toLocaleString('en-IN')}</p>
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => openEdit(car)} className="flex-1 px-3 py-1.5 bg-surface rounded-lg text-xs font-bold text-content hover:bg-border transition-colors flex items-center justify-center gap-1">
                    <Pencil size={12} /> Edit
                  </button>
                  <button type="button" onClick={() => setDeleteConfirm(car.id)} className="flex-1 px-3 py-1.5 bg-red-500/10 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-card rounded-2xl border border-line p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 bg-red-500/10 rounded-full"><Trash2 size={20} className="text-red-400" /></div>
              <div>
                <h3 className="text-lg font-bold text-content">Delete this new car?</h3>
                <p className="text-sm text-content-muted mt-1">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-content hover:bg-surface">Cancel</button>
              <button type="button" onClick={() => void handleDelete(deleteConfirm)} className="px-5 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
