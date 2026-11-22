'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import { unreachableMessage } from './unreachableMessage';
import StatusBadge from './ui/StatusBadge';

interface Dealer {
  id: number;
  businessName: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  status: string;
  createdAt: string;
}

type TabFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

export default function AdminDealerPanel() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<TabFilter>('PENDING');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  /** Pure fetch — no state, so the mount effect can await it first. */
  const fetchDealers = useCallback(async () => {
    const url = filter === 'ALL' ? '/api/dealer/register' : `/api/dealer/register?status=${filter}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.dealers || []) as Dealer[];
  }, [filter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDealers(await fetchDealers());
      setError('');
    } catch (err) {
      // try/finally alone let the rejection escape, so a backend outage became
      // an unhandledRejection in the console (and a blank panel with no message).
      setError(unreachableMessage(err));
    } finally {
      setLoading(false);
    }
  }, [fetchDealers]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await fetchDealers();
        if (active) {
          setDealers(rows);
          setError('');
        }
      } catch (err) {
        if (active) setError(unreachableMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [fetchDealers]);

  const handleAction = async (dealerId: number, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(dealerId);
    try {
      const res = await fetch('/api/dealer/register', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dealerId, status }),
      });
      if (res.ok) {
        setDealers((prev) => prev.filter((d) => d.id !== dealerId));
        setExpandedId(null);
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((t) => (
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
              {t === 'PENDING' && dealers.length > 0 && filter === 'PENDING' && (
                <span className="rounded-full bg-[hsl(var(--color-primary-foreground)/0.22)] px-1.5 py-0.5 text-[11px]">{dealers.length}</span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => void load().catch(() => {})}
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] text-[hsl(var(--color-content-muted))] hover:text-[hsl(var(--color-content))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
          title="Refresh dealer applications"
        >
          <RefreshCw size={16} aria-hidden="true" />
          <span className="sr-only">Refresh</span>
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="admin-card flex items-center justify-center py-12" role="status" aria-label="Loading dealers">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--color-primary-strong))] border-t-transparent motion-reduce:animate-none" />
        </div>
      )}

      {/* Empty, or failed to load */}
      {error ? (
        <div className="admin-card p-5" role="alert">
          <p className="text-sm font-semibold text-[hsl(var(--color-content))]">
            Dealer applications could not load
          </p>
          <p className="mt-1 text-sm leading-6 text-[hsl(var(--color-content-muted))]">{error}</p>
          <button type="button" onClick={() => void load()} className="admin-btn admin-btn-secondary mt-3 text-xs">
            <RefreshCw size={14} aria-hidden="true" /> Retry
          </button>
        </div>
      ) : !loading && dealers.length === 0 && (
        <div className="admin-card px-5 py-12 text-center">
          <p className="text-sm font-semibold text-[hsl(var(--color-content))]">
            {filter === 'PENDING' ? 'No pending applications' : `No ${filter.toLowerCase()} dealers`}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[hsl(var(--color-content-muted))]">
            {filter === 'PENDING'
              ? 'New dealer applications will appear here for review.'
              : 'Try another status filter to see existing dealer records.'}
          </p>
        </div>
      )}

      {/* Dealer list */}
      {!loading && dealers.map((d) => (
        <div key={d.id} className="admin-card overflow-hidden">
          {/* Summary row */}
          <button
            type="button"
            className="flex min-h-11 w-full flex-wrap items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-[hsl(var(--admin-surface-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--color-focus))]"
            onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
            aria-expanded={expandedId === d.id}
          >
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={d.status} />
              <span className="text-sm font-bold text-[hsl(var(--color-content))]">{d.businessName}</span>
              <span className="text-xs text-[hsl(var(--color-content-muted))]">
                {d.city}{d.state ? `, ${d.state}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[hsl(var(--color-content-muted))]">
                {new Date(d.createdAt).toLocaleDateString('en-IN')}
              </span>
              <Eye size={14} className="text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
            </div>
          </button>

          {/* Expanded detail */}
          {expandedId === d.id && (
            <div className="border-t border-line p-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs font-semibold text-content-muted">Business Name</p>
                  <p className="text-content">{d.businessName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-content-muted">Owner Name</p>
                  <p className="text-content">{d.ownerName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-content-muted">Phone</p>
                  <p className="text-content">{d.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-content-muted">Email</p>
                  <p className="text-content">{d.email || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-content-muted">State</p>
                  <p className="text-content">{d.state || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-content-muted">City</p>
                  <p className="text-content">{d.city || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-content-muted">Submitted</p>
                  <p className="text-content">{new Date(d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              {/* Actions */}
              {d.status === 'PENDING' && (
                <div className="flex flex-wrap gap-3 pt-2 border-t border-line">
                  <button
                    onClick={() => void handleAction(d.id, 'APPROVED')}
                    disabled={actionLoading === d.id}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:brightness-110 disabled:opacity-50 min-h-[44px]"
                  >
                    <CheckCircle size={16} />
                    {actionLoading === d.id ? 'Processing…' : 'Approve Dealer'}
                  </button>
                  <button
                    onClick={() => void handleAction(d.id, 'REJECTED')}
                    disabled={actionLoading === d.id}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    {actionLoading === d.id ? 'Processing…' : 'Reject Application'}
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
