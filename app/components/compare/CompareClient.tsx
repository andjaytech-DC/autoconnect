'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Car, Loader2 } from 'lucide-react';
import { getVehicle, resolveImage, ApiError } from '@/app/lib/nest-public';
import { formatINR } from '@/app/lib/currency';

interface Vehicle { id: number; title: string; price: number; year: number; mileage: number; fuel: string; transmission: string; engine: string | null; seatingCapacity: number | null; ownership: string | null; features: string[] }

const inr = formatINR;

export default function CompareClient() {
  const [ids, setIds] = useState<number[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [picker, setPicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Reading localStorage is impossible during SSR, so the stored ids have to
    // be adopted after mount. A lazy useState initialiser would also run on the
    // server and cause a hydration mismatch, which is worse than one extra
    // render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem('pah_compare')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIds(JSON.parse(localStorage.getItem('pah_compare') as string));
    }
  }, []);

  useEffect(() => { localStorage.setItem('pah_compare', JSON.stringify(ids)); }, [ids]);

  useEffect(() => {
    let cancelled = false;
    // Pure fetch first: every setState below happens after the awaits, so
    // mounting does not cascade a synchronous re-render.
    (async () => {
      // Turning the spinner on when the selection changes is the intended
      // behaviour; the "avoid setState in an effect" rule is about cascading
      // renders, and a loading flag that flips on a dependency change is the
      // accepted exception.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      const rows = await Promise.all(
        ids.map((id) =>
          getVehicle(id)
            .then((v) => v)
            .catch((err) => {
              if (!(err instanceof ApiError && err.status === 404)) {
                if (!cancelled) {
                  setError('Some vehicles could not be loaded.');
                }
              }
              return null;
            }),
        ),
      );
      if (cancelled) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('');
      setVehicles(
        rows
          .filter((v): v is NonNullable<typeof v> => Boolean(v))
          .map((v) => ({
            id: v.id,
            title: v.title,
            price: v.price,
            year: v.year,
            mileage: v.mileage,
            fuel: v.fuel,
            transmission: v.transmission,
            engine: v.engine ?? null,
            seatingCapacity: (v as unknown as { seatingCapacity?: number | null }).seatingCapacity ?? null,
            ownership: (v as unknown as { ownership?: string | null }).ownership ?? null,
            features: (v as unknown as { features?: string[] }).features ?? [],
          })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const add = async () => {
    const id = Number(picker);
    if (!id || ids.includes(id) || ids.length >= 4) return;
    setIds([...ids, id]);
    setPicker('');
  };
  const remove = (id: number) => setIds(ids.filter((i) => i !== id));

  const rows: { label: string; get: (v: Vehicle) => string | number }[] = [
    { label: "Price", get: (v) => inr(v.price) },
    { label: "Year", get: (v) => v.year },
    { label: "Mileage", get: (v) => v.mileage.toLocaleString("en-IN") + " km" },
    { label: "Fuel", get: (v) => v.fuel },
    { label: "Transmission", get: (v) => v.transmission },
    { label: "Engine", get: (v) => v.engine || "—" },
    { label: "Seats", get: (v) => v.seatingCapacity ?? "—" },
    { label: "Ownership", get: (v) => v.ownership || "—" },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <input value={picker} onChange={(e) => setPicker(e.target.value)} placeholder="Enter vehicle ID to compare" className="flex-1 px-3 py-2.5 border border-border rounded-lg text-sm bg-card text-content" />
        <button onClick={add} disabled={ids.length >= 4} className="px-4 py-2.5 bg-[#FFC700] text-[#15130a] rounded-lg text-sm font-semibold hover:brightness-110 disabled:opacity-50 flex items-center gap-2"><Plus size={16} /> Add</button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-content-muted">
          <Loader2 size={20} className="animate-spin" aria-hidden="true" />
          <span className="ml-2">Loading vehicles…</span>
        </div>
      )}

      {error && !loading && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          {error}
        </div>
      )}

      {!loading && vehicles.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl"><Car size={32} className="mx-auto text-content-muted mb-2" /><p className="text-sm text-content-muted">Add vehicles to start comparing</p></div>
      )}

      {vehicles.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-line rounded-2xl overflow-hidden">
            <thead>
              <tr className="bg-surface">
                <th className="text-left p-3 text-content-muted font-medium">Spec</th>
                {vehicles.map((v) => (
                  <th key={v.id} className="text-left p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-content">{v.title}</span>
                      <button onClick={() => remove(v.id)} className="p-1 hover:bg-surface rounded"><X size={14} className="text-content-muted" /></button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-line">
                  <td className="p-3 text-content-muted">{r.label}</td>
                  {vehicles.map((v) => <td key={v.id} className="p-3 text-content">{r.get(v)}</td>)}
                </tr>
              ))}
              <tr className="border-t border-line">
                <td className="p-3 text-content-muted">Features</td>
                {vehicles.map((v) => <td key={v.id} className="p-3 text-content text-xs">{v.features.join(", ") || "—"}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
