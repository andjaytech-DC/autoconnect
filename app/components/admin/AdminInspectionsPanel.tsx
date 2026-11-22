'use client';

import { useCallback, useEffect, useState } from 'react';
import { Calendar, CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import { unreachableMessage } from './unreachableMessage';
import StatusBadge from './ui/StatusBadge';

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
      setError('');
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
        if (active) {
          setItems(rows);
          setError('');
        }
      } catch (err) {
        if (active) setError(unreachableMessage(err));
      } finally {
        if (active) setLoading(false);
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
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {(['REQUESTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'ALL'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setLoading(true); setFilter(t); setExpandedId(null); }}
              aria-pressed={filter === t}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] ${
                filter === t
                  ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]'
                  : 'border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] text-[hsl(var(--color-content-muted))] hover:border-[hsl(var(--color-line-hover))] hover:text-[hsl(var(--color-content))]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => void load().catch(() => {})}
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] text-[hsl(var(--color-content-muted))] hover:text-[hsl(var(--color-content))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
          title="Refresh inspections"
        >
          <RefreshCw size={16} aria-hidden="true" />
          <span className="sr-only">Refresh</span>
        </button>
      </div>

      {loading && (
        <div className="admin-card flex items-center justify-center py-12" role="status" aria-label="Loading inspections">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--color-primary-strong))] border-t-transparent motion-reduce:animate-none" />
        </div>
      )}

      {error ? (
        <div className="admin-card p-5" role="alert">
          <p className="text-sm font-semibold text-[hsl(var(--color-content))]">
            Inspection requests could not load
          </p>
          <p className="mt-1 text-sm leading-6 text-[hsl(var(--color-content-muted))]">{error}</p>
          <button type="button" onClick={() => void load()} className="admin-btn admin-btn-secondary mt-3 text-xs">
            <RefreshCw size={14} aria-hidden="true" /> Retry
          </button>
        </div>
      ) : !loading && items.length === 0 && (
        <div className="admin-card px-5 py-12 text-center">
          <p className="text-sm font-semibold text-[hsl(var(--color-content))]">
            {filter === 'REQUESTED' ? 'No pending inspection requests' : `No ${filter.toLowerCase()} inspections`}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[hsl(var(--color-content-muted))]">
            Requests submitted from vehicle pages will appear here for scheduling.
          </p>
        </div>
      )}

      {!loading && items.map((insp) => (
        <div key={insp.id} className="admin-card overflow-hidden">
          <button
            type="button"
            className="flex min-h-11 w-full flex-wrap items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-[hsl(var(--admin-surface-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--color-focus))]"
            onClick={() => setExpandedId(expandedId === insp.id ? null : insp.id)}
            aria-expanded={expandedId === insp.id}
          >
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={insp.status} />
              <span className="text-sm font-bold text-[hsl(var(--color-content))]">{insp.customerName}</span>
              <span className="text-xs text-[hsl(var(--color-content-muted))]">{insp.inspectionType} · {insp.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[hsl(var(--color-content-muted))]">
                {new Date(insp.preferredDate).toLocaleDateString('en-IN')}
              </span>
              <Eye size={14} className="text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
            </div>
          </button>

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
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
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
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
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
