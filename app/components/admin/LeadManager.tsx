'use client';

import { useCallback, useEffect, useState } from 'react';

interface Lead {
  id: number;
  vehicleId: number;
  vehicle?: { title?: string };
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  message?: string | null;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CLOSED';
  notes?: string | null;
  createdAt: string;
}

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATING', 'CONVERTED', 'CLOSED'] as const;

const statusCls: Record<string, string> = {
  NEW: 'bg-blue-50 text-blue-700',
  CONTACTED: 'bg-amber-50 text-amber-700',
  QUALIFIED: 'bg-purple-50 text-purple-700',
  NEGOTIATING: 'bg-cyan-50 text-cyan-700',
  CONVERTED: 'bg-emerald-500/10 text-emerald-400',
  CLOSED: 'bg-[#161b21] text-slate-400',
};

/** Admin Lead Manager — view, filter, update status and notes. */
export default function LeadManager() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /** Pure fetch — no state, so the mount effect can await it first. */
  const fetchLeads = useCallback(async () => {
    const res = await fetch('/api/leads');
    if (!res.ok) throw new Error('Failed to load leads');
    const data = await res.json();
    return data.leads || [];
  }, []);

  const applyLeads = useCallback((rows: Lead[]) => {
    setLeads(rows);
    setError('');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      applyLeads(await fetchLeads());
    } catch {
      setError('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [applyLeads, fetchLeads]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await fetchLeads();
        if (active) applyLeads(rows);
      } catch {
        if (active) setError('Failed to load leads');
      }
    })();
    return () => { active = false; };
  }, [applyLeads, fetchLeads]);

  const update = async (id: number, patch: { status?: string; notes?: string }) => {
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    void load();
  };

  const visible = filter === 'ALL' ? leads : leads.filter((l) => l.status === filter);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        {['ALL', ...STATUSES].map((s) => (
          <button key={s} type="button" onClick={() => setFilter(s)}
            className={'px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ' + (filter === s ? 'bg-[#FFC700] text-[#15130a]' : 'bg-card text-content border border-line')}>
            {s} {s !== 'ALL' && `(${leads.filter((l) => l.status === s).length})`}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-content-muted">Loading leads…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!loading && !error && visible.length === 0 && (
        <p className="text-sm text-content-muted py-8 text-center border-2 border-dashed border-border rounded-2xl">No leads in this view yet</p>
      )}

      <div className="space-y-3">
        {visible.map((l) => (
          <div key={l.id} className="rounded-2xl border border-line bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-content text-sm">{l.customerName} <span className={'ml-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ' + statusCls[l.status]}>{l.status}</span></p>
                <p className="text-xs text-content-muted mt-1">
                  {l.customerPhone}{l.customerEmail ? ` · ${l.customerEmail}` : ''}
                  {l.vehicle?.title ? ` · Interested in: ${l.vehicle.title}` : ''}
                </p>
                {l.message && <p className="text-sm text-content-muted mt-2 italic">&ldquo;{l.message}&rdquo;</p>}
              </div>
              <div className="flex items-center gap-2">
                <select value={l.status} onChange={(e) => void update(l.id, { status: e.target.value })}
                  className="px-2 py-1.5 border border-border rounded-lg text-xs bg-card text-content">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button type="button" onClick={() => {
                  const notes = window.prompt('Notes for this lead:', l.notes || '');
                  if (notes !== null) void update(l.id, { notes });
                }}
                  className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-content hover:bg-surface">
                  Notes
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
