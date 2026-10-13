'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import { unreachableMessage } from './unreachableMessage';

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

const statusBadge = (s: string) => {
  const cls = s === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400'
    : s === 'REJECTED' ? 'bg-red-500/10 text-red-400'
    : 'bg-amber-500/10 text-amber-400';
  return `px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${cls}`;
};

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
        if (active) setListings(rows);
      } catch (err) {
        if (active) setError(unreachableMessage(err));
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
      <div className="flex flex-wrap gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((t) => (
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
      ) : !loading && listings.length === 0 && (
        <div className="text-center py-12 text-sm text-content-muted">
          {filter === 'PENDING' ? 'No pending listings.' : `No ${filter.toLowerCase()} listings.`}
        </div>
      )}

      {!loading && listings.map((l) => {
        const vd = l.vehicleData as Record<string, unknown>;
        return (
          <div key={l.id} className="rounded-2xl border border-line bg-card overflow-hidden">
            <div
              className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-card/80 min-h-[44px]"
              onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className={statusBadge(l.status)}>{l.status}</span>
                <span className="font-bold text-content text-sm">{String(vd.make || '')} {String(vd.model || '')}</span>
                <span className="text-xs text-content-muted">{String(vd.year || '')} · {String(vd.city || '')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-content-muted">{new Date(l.createdAt).toLocaleDateString('en-IN')}</span>
                <Eye size={14} className="text-content-muted" />
              </div>
            </div>

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
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-xl text-sm font-semibold hover:bg-red-500/25 disabled:opacity-50 min-h-[44px]"
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
