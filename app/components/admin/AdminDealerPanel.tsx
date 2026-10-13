'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Eye, RefreshCw } from 'lucide-react';
import { unreachableMessage } from './unreachableMessage';

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
    return data.dealers || [];
  }, [filter]);

  const applyDealers = useCallback((rows: Dealer[]) => {
    setDealers(rows);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      applyDealers(await fetchDealers());
    } catch (err) {
      // try/finally alone let the rejection escape, so a backend outage became
      // an unhandledRejection in the console (and a blank panel with no message).
      setError(unreachableMessage(err));
    } finally {
      setLoading(false);
    }
  }, [applyDealers, fetchDealers]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await fetchDealers();
        if (active) applyDealers(rows);
      } catch (err) {
        if (active) setError(unreachableMessage(err));
      }
    })();
    return () => { active = false; };
  }, [applyDealers, fetchDealers]);

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

  const statusBadge = (s: string) => {
    const cls = s === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400'
      : s === 'REJECTED' ? 'bg-red-500/10 text-red-400'
      : 'bg-amber-500/10 text-amber-400';
    return `px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${cls}`;
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
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
            {t === 'PENDING' && dealers.length > 0 && filter === 'PENDING' && (
              <span className="ml-1.5 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{dealers.length}</span>
            )}
          </button>
        ))}
        <button onClick={() => void load().catch(() => {})} className="px-3 py-2 text-sm text-content-muted hover:text-content min-h-[44px]" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FFC700]" />
        </div>
      )}

      {/* Empty, or failed to load */}
      {error ? (
        <p className="text-sm text-red-400 py-8 text-center">{error}</p>
      ) : !loading && dealers.length === 0 && (
        <div className="text-center py-12 text-sm text-content-muted">
          {filter === 'PENDING' ? 'No pending applications.' : `No ${filter.toLowerCase()} dealers.`}
        </div>
      )}

      {/* Dealer list */}
      {!loading && dealers.map((d) => (
        <div key={d.id} className="rounded-2xl border border-line bg-card overflow-hidden">
          {/* Summary row */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-card/80 min-h-[44px]"
            onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className={statusBadge(d.status)}>{d.status}</span>
              <span className="font-bold text-content text-sm">{d.businessName}</span>
              <span className="text-xs text-content-muted">{d.city}{d.state ? `, ${d.state}` : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-content-muted">{new Date(d.createdAt).toLocaleDateString('en-IN')}</span>
              <Eye size={14} className="text-content-muted" />
            </div>
          </div>

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
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-xl text-sm font-semibold hover:bg-red-500/25 disabled:opacity-50 min-h-[44px]"
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
