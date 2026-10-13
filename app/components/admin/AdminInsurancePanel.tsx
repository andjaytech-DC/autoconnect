'use client';

import { useCallback, useEffect, useState } from 'react';
import { Phone, XCircle, Eye, RefreshCw } from 'lucide-react';
import { unreachableMessage } from './unreachableMessage';

interface Enquiry {
  id: number;
  customerName: string;
  phone: string;
  email?: string;
  registrationNo?: string;
  coverType: string;
  message?: string;
  status: string;
  createdAt: string;
}

type TabFilter = 'NEW' | 'CONTACTED' | 'CLOSED' | 'ALL';

const statusBadge = (s: string) => {
  const cls = s === 'CONTACTED' ? 'bg-blue-500/10 text-blue-400'
    : s === 'CLOSED' ? 'bg-slate-500/10 text-slate-400'
    : 'bg-amber-500/10 text-amber-400';
  return `px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${cls}`;
};

export default function AdminInsurancePanel() {
  const [items, setItems] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<TabFilter>('NEW');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  /** Pure fetch — no state, so the mount effect can await it first. */
  const fetchEnquiries = useCallback(async () => {
    const url = filter === 'ALL' ? '/api/insurance' : `/api/insurance?status=${filter}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.enquiries || [];
  }, [filter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchEnquiries());
    } catch (err) {
      // try/finally alone let the rejection escape as an unhandledRejection
      // whenever the backend is unreachable or throttled.
      setError(unreachableMessage(err));
    } finally {
      setLoading(false);
    }
  }, [fetchEnquiries]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await fetchEnquiries();
        if (active) setItems(rows);
      } catch (err) {
        if (active) setError(unreachableMessage(err));
      }
    })();
    return () => { active = false; };
  }, [fetchEnquiries]);

  const handleAction = async (id: number, status: 'CONTACTED' | 'CLOSED') => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/insurance/${id}`, {
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
        {(['NEW', 'CONTACTED', 'CLOSED', 'ALL'] as const).map((t) => (
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
          {filter === 'NEW' ? 'No new enquiries.' : `No ${filter.toLowerCase()} enquiries.`}
        </div>
      )}

      {!loading && items.map((e) => (
        <div key={e.id} className="rounded-2xl border border-line bg-card overflow-hidden">
          <div
            className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-card/80 min-h-[44px]"
            onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className={statusBadge(e.status)}>{e.status}</span>
              <span className="font-bold text-content text-sm">{e.customerName}</span>
              <span className="text-xs text-content-muted">{e.coverType}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-content-muted">{new Date(e.createdAt).toLocaleDateString('en-IN')}</span>
              <Eye size={14} className="text-content-muted" />
            </div>
          </div>

          {expandedId === e.id && (
            <div className="border-t border-line p-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs font-semibold text-content-muted">Customer</p>
                  <p className="text-content">{e.customerName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-content-muted">Phone</p>
                  <p className="text-content">{e.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-content-muted">Email</p>
                  <p className="text-content">{e.email || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-content-muted">Cover Type</p>
                  <p className="text-content">{e.coverType}</p>
                </div>
                {e.registrationNo && (
                  <div>
                    <p className="text-xs font-semibold text-content-muted">Registration No.</p>
                    <p className="text-content">{e.registrationNo}</p>
                  </div>
                )}
                {e.message && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold text-content-muted">Message</p>
                    <p className="text-content">{e.message}</p>
                  </div>
                )}
              </div>

              {e.status === 'NEW' && (
                <div className="flex flex-wrap gap-3 pt-2 border-t border-line">
                  <button
                    onClick={() => void handleAction(e.id, 'CONTACTED')}
                    disabled={actionLoading === e.id}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:brightness-110 disabled:opacity-50 min-h-[44px]"
                  >
                    <Phone size={16} />
                    {actionLoading === e.id ? 'Processing…' : 'Mark Contacted'}
                  </button>
                  <button
                    onClick={() => void handleAction(e.id, 'CLOSED')}
                    disabled={actionLoading === e.id}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-xl text-sm font-semibold hover:bg-red-500/25 disabled:opacity-50 min-h-[44px]"
                  >
                    <XCircle size={16} />
                    {actionLoading === e.id ? 'Processing…' : 'Close'}
                  </button>
                </div>
              )}

              {e.status === 'CONTACTED' && (
                <div className="flex flex-wrap gap-3 pt-2 border-t border-line">
                  <button
                    onClick={() => void handleAction(e.id, 'CLOSED')}
                    disabled={actionLoading === e.id}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-500/15 text-slate-400 border border-slate-500/30 rounded-xl text-sm font-semibold hover:bg-slate-500/25 disabled:opacity-50 min-h-[44px]"
                  >
                    <XCircle size={16} />
                    {actionLoading === e.id ? 'Processing…' : 'Close Enquiry'}
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
