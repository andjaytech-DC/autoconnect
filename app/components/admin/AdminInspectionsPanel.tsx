'use client';

import { useCallback, useEffect, useState } from 'react';
import { Calendar, CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import { unreachableMessage } from './unreachableMessage';

interface Inspection {
  id: number;
  vehicleId?: number;
  customerName: string;
  customerPhone: string;
  inspectionType: string;
  location: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
  status: string;
  createdAt: string;
}

type TabFilter = 'REQUESTED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'ALL';

const statusBadge = (s: string) => {
  const cls = s === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400'
    : s === 'CANCELLED' ? 'bg-red-500/10 text-red-400'
    : s === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-400'
    : 'bg-amber-500/10 text-amber-400';
  return `px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${cls}`;
};

export default function AdminInspectionsPanel() {
  const [items, setItems] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<TabFilter>('REQUESTED');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  /** Pure fetch — no state, so the mount effect can await it first. */
  const fetchInspections = useCallback(async () => {
    const url = filter === 'ALL' ? '/api/inspections' : `/api/inspections?status=${filter}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.inspections || [];
  }, [filter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchInspections());
    } catch (err) {
      // try/finally alone let the rejection escape as an unhandledRejection
      // whenever the backend is unreachable or throttled.
      setError(unreachableMessage(err));
    } finally {
      setLoading(false);
    }
  }, [fetchInspections]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await fetchInspections();
        if (active) setItems(rows);
      } catch (err) {
        if (active) setError(unreachableMessage(err));
      }
    })();
    return () => { active = false; };
  }, [fetchInspections]);

  const handleAction = async (id: number, status: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/inspections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setExpandedId(null);
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['REQUESTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'ALL'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setFilter(t); setExpandedId(null); }}
            className={`px-4 py-2 text-sm font-semibold rounded-xl min-h-[44px] transition-colors ${
              filter === t
                ? 'bg-[#FFC700] text-[#15130a]'
                : 'bg-card border border-line text-content-muted hover:border-[#FFC700]/40'
            }`}
          >
            {t}
          </button>
        ))}
        <button onClick={() => void load().catch(() => {})} className="px-3 py-2 text-sm text-content-muted hover:text-content min-h-[44px]" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FFC700]" />
        </div>
      )}

      {error ? (
        <p className="text-sm text-red-400 py-8 text-center">{error}</p>
      ) : !loading && items.length === 0 && (
        <div className="text-center py-12 text-sm text-content-muted">
          {filter === 'REQUESTED' ? 'No pending inspection requests.' : `No ${filter.toLowerCase()} inspections.`}
        </div>
      )}

      {!loading && items.map((insp) => (
        <div key={insp.id} className="rounded-2xl border border-line bg-card overflow-hidden">
          <div
            className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-card/80 min-h-[44px]"
            onClick={() => setExpandedId(expandedId === insp.id ? null : insp.id)}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className={statusBadge(insp.status)}>{insp.status}</span>
              <span className="font-bold text-content text-sm">{insp.customerName}</span>
              <span className="text-xs text-content-muted">{insp.inspectionType} · {insp.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-content-muted">{new Date(insp.preferredDate).toLocaleDateString('en-IN')}</span>
              <Eye size={14} className="text-content-muted" />
            </div>
          </div>

          {expandedId === insp.id && (
            <div className="border-t border-line p-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs font-semibold text-content-muted">Customer</p>
                  <p className="text-content">{insp.customerName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-content-muted">Phone</p>
                  <p className="text-content">{insp.customerPhone}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-content-muted">Type</p>
                  <p className="text-content">{insp.inspectionType}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-content-muted">Location</p>
                  <p className="text-content">{insp.location}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-content-muted">Preferred Date</p>
                  <p className="text-content">{new Date(insp.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-content-muted">Preferred Time</p>
                  <p className="text-content">{insp.preferredTime}</p>
                </div>
                {insp.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold text-content-muted">Notes</p>
                    <p className="text-content">{insp.notes}</p>
                  </div>
                )}
              </div>

              {insp.status === 'REQUESTED' && (
                <div className="flex flex-wrap gap-3 pt-2 border-t border-line">
                  <button
                    onClick={() => void handleAction(insp.id, 'SCHEDULED')}
                    disabled={actionLoading === insp.id}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:brightness-110 disabled:opacity-50 min-h-[44px]"
                  >
                    <Calendar size={16} />
                    {actionLoading === insp.id ? 'Processing…' : 'Schedule'}
                  </button>
                  <button
                    onClick={() => void handleAction(insp.id, 'CANCELLED')}
                    disabled={actionLoading === insp.id}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-xl text-sm font-semibold hover:bg-red-500/25 disabled:opacity-50 min-h-[44px]"
                  >
                    <XCircle size={16} />
                    {actionLoading === insp.id ? 'Processing…' : 'Cancel'}
                  </button>
                </div>
              )}

              {insp.status === 'SCHEDULED' && (
                <div className="flex flex-wrap gap-3 pt-2 border-t border-line">
                  <button
                    onClick={() => void handleAction(insp.id, 'COMPLETED')}
                    disabled={actionLoading === insp.id}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:brightness-110 disabled:opacity-50 min-h-[44px]"
                  >
                    <CheckCircle size={16} />
                    {actionLoading === insp.id ? 'Processing…' : 'Mark Complete'}
                  </button>
                  <button
                    onClick={() => void handleAction(insp.id, 'CANCELLED')}
                    disabled={actionLoading === insp.id}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-xl text-sm font-semibold hover:bg-red-500/25 disabled:opacity-50 min-h-[44px]"
                  >
                    <XCircle size={16} />
                    {actionLoading === insp.id ? 'Processing…' : 'Cancel'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
