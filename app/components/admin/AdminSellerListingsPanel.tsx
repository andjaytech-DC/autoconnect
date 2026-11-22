'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import { unreachableMessage } from './unreachableMessage';
import StatusBadge from './ui/StatusBadge';

interface SellerListing {
  id: number;
  ownerName: string;
  phone: string;
  email?: string;
  vehicleData: Record<string, unknown>;
  images?: string[];
  status: string;
  createdAt: string;
}

type TabFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

export default function AdminSellerListingsPanel() {
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<TabFilter>('PENDING');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  /** Pure fetch — no state, so the mount effect can await it first. */
  const fetchListings = useCallback(async () => {
    const res = await fetch('/api/sell-listings');
    if (!res.ok) return [];
    const data = await res.json();
    const all = data.listings || [];
    return filter === 'ALL'
      ? all
      : all.filter((l: SellerListing) => l.status === filter);
  }, [filter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setListings(await fetchListings());
      setError('');
    } catch (err) {
      // try/finally alone let the rejection escape as an unhandledRejection
      // whenever the backend is unreachable or throttled.
      setError(unreachableMessage(err));
    } finally {
      setLoading(false);
    }
  }, [fetchListings]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await fetchListings();
        if (active) {
          setListings(rows);
          setError('');
        }
      } catch (err) {
        if (active) setError(unreachableMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [fetchListings]);

  const handleAction = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/sell-listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setListings((prev) => prev.filter((l) => l.id !== id));
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
            </button>
          ))}
        </div>
        <button
          onClick={() => void load().catch(() => {})}
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] text-[hsl(var(--color-content-muted))] hover:text-[hsl(var(--color-content))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
          title="Refresh seller listings"
        >
          <RefreshCw size={16} aria-hidden="true" />
          <span className="sr-only">Refresh</span>
        </button>
      </div>

      {loading && (
        <div className="admin-card flex items-center justify-center py-12" role="status" aria-label="Loading seller listings">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--color-primary-strong))] border-t-transparent motion-reduce:animate-none" />
        </div>
      )}

      {error ? (
        <div className="admin-card p-5" role="alert">
          <p className="text-sm font-semibold text-[hsl(var(--color-content))]">
            Seller listings could not load
          </p>
          <p className="mt-1 text-sm leading-6 text-[hsl(var(--color-content-muted))]">{error}</p>
          <button type="button" onClick={() => void load()} className="admin-btn admin-btn-secondary mt-3 text-xs">
            <RefreshCw size={14} aria-hidden="true" /> Retry
          </button>
        </div>
      ) : !loading && listings.length === 0 && (
        <div className="admin-card px-5 py-12 text-center">
          <p className="text-sm font-semibold text-[hsl(var(--color-content))]">
            {filter === 'PENDING' ? 'No pending listings' : `No ${filter.toLowerCase()} listings`}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[hsl(var(--color-content-muted))]">
            Seller submissions appear here with the vehicle details and expected price.
          </p>
        </div>
      )}

      {!loading && listings.map((l) => {
        const vd = l.vehicleData as Record<string, unknown>;
        return (
          <div key={l.id} className="admin-card overflow-hidden">
            <button
              type="button"
              className="flex min-h-11 w-full flex-wrap items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-[hsl(var(--admin-surface-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--color-focus))]"
              onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
              aria-expanded={expandedId === l.id}
            >
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={l.status} />
                <span className="text-sm font-bold text-[hsl(var(--color-content))]">
                  {String(vd.make || '')} {String(vd.model || '')}
                </span>
                <span className="text-xs text-[hsl(var(--color-content-muted))]">
                  {String(vd.year || '')} · {String(vd.city || '')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[hsl(var(--color-content-muted))]">
                  {new Date(l.createdAt).toLocaleDateString('en-IN')}
                </span>
                <Eye size={14} className="text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
              </div>
            </button>

            {expandedId === l.id && (
              <div className="border-t border-line p-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-content-muted">Owner</p>
                    <p className="text-content">{l.ownerName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-content-muted">Phone</p>
                    <p className="text-content">{l.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-content-muted">Email</p>
                    <p className="text-content">{l.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-content-muted">Expected Price</p>
                    <p className="text-content">₹{Number(vd.expectedPrice || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-content-muted">Mileage</p>
                    <p className="text-content">{String(vd.mileage || '—')} km</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-content-muted">Fuel</p>
                    <p className="text-content">{String(vd.fuel || '—')}</p>
                  </div>
                </div>
                {l.status === 'PENDING' && (
                  <div className="flex flex-wrap gap-3 pt-2 border-t border-line">
                    <button
                      onClick={() => void handleAction(l.id, 'APPROVED')}
                      disabled={actionLoading === l.id}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:brightness-110 disabled:opacity-50 min-h-[44px]"
                    >
                      <CheckCircle size={16} />
                      {actionLoading === l.id ? 'Processing…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => void handleAction(l.id, 'REJECTED')}
                      disabled={actionLoading === l.id}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      {actionLoading === l.id ? 'Processing…' : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
