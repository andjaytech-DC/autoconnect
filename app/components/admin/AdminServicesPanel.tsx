'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle, Eye, RefreshCw, Wrench, Building2 } from 'lucide-react';

interface ServiceBooking {
  id: number;
  providerId: number;
  customerName: string;
  customerPhone: string;
  service: string;
  vehicleReg?: string;
  preferredDate: string;
  preferredTime: string;
  status: string;
  createdAt: string;
  provider?: { id: number; name: string; phone: string };
}

interface ServiceProvider {
  id: number;
  name: string;
  description?: string;
  // Null for anonymous callers — /api/services/providers only releases contact
  // details to a signed-in session. This panel runs as an admin, so it gets them.
  phone?: string | null;
  email?: string | null;
  city?: string;
  address?: string | null;
  services?: string[];
}

type SubTab = 'BOOKINGS' | 'PROVIDERS';
type BookingFilter = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'ALL';

const statusBadge = (s: string) => {
  const cls = s === 'CONFIRMED' ? 'bg-blue-500/10 text-blue-400'
    : s === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400'
    : s === 'CANCELLED' ? 'bg-red-500/10 text-red-400'
    : 'bg-amber-500/10 text-amber-400';
  return `px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${cls}`;
};

export default function AdminServicesPanel() {
  const [subTab, setSubTab] = useState<SubTab>('BOOKINGS');
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>('PENDING');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/services/bookings');
      if (res.ok) {
        const data = await res.json();
        const all = data.bookings || [];
        setBookings(bookingFilter === 'ALL' ? all : all.filter((b: ServiceBooking) => b.status === bookingFilter));
      }
    } finally {
      setLoading(false);
    }
  }, [bookingFilter]);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/services/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      if (subTab === 'BOOKINGS') await loadBookings();
      else await loadProviders();
    })();
  }, [subTab, loadBookings, loadProviders]);

  const handleBookingAction = async (id: number, status: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/services/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
        setExpandedId(null);
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {(['BOOKINGS', 'PROVIDERS'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setSubTab(t); setExpandedId(null); }}
            className={`px-4 py-2 text-sm font-semibold rounded-xl min-h-[44px] transition-colors flex items-center gap-2 ${
              subTab === t
                ? 'bg-[#FFC700] text-[#15130a]'
                : 'bg-card border border-line text-content-muted hover:border-[#FFC700]/40'
            }`}
          >
            {t === 'BOOKINGS' ? <Wrench size={14} /> : <Building2 size={14} />}
            {t}
          </button>
        ))}
      </div>

      {subTab === 'BOOKINGS' && (
        <>
          <div className="flex flex-wrap gap-2">
            {(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'ALL'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setBookingFilter(t); setExpandedId(null); }}
                className={`px-4 py-2 text-sm font-semibold rounded-xl min-h-[44px] transition-colors ${
                  bookingFilter === t
                    ? 'bg-[#FFC700] text-[#15130a]'
                    : 'bg-card border border-line text-content-muted hover:border-[#FFC700]/40'
                }`}
              >
                {t}
              </button>
            ))}
            <button onClick={() => void loadBookings()} className="px-3 py-2 text-sm text-content-muted hover:text-content min-h-[44px]" title="Refresh">
              <RefreshCw size={16} />
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FFC700]" />
            </div>
          )}

          {!loading && bookings.length === 0 && (
            <div className="text-center py-12 text-sm text-content-muted">
              {bookingFilter === 'PENDING' ? 'No pending bookings.' : `No ${bookingFilter.toLowerCase()} bookings.`}
            </div>
          )}

          {!loading && bookings.map((b) => (
            <div key={b.id} className="rounded-2xl border border-line bg-card overflow-hidden">
              <div
                className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-card/80 min-h-[44px]"
                onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className={statusBadge(b.status)}>{b.status}</span>
                  <span className="font-bold text-content text-sm">{b.customerName}</span>
                  <span className="text-xs text-content-muted">{b.service} · {b.provider?.name || `Provider #${b.providerId}`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-content-muted">{new Date(b.preferredDate).toLocaleDateString('en-IN')}</span>
                  <Eye size={14} className="text-content-muted" />
                </div>
              </div>

              {expandedId === b.id && (
                <div className="border-t border-line p-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-content-muted">Customer</p>
                      <p className="text-content">{b.customerName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-content-muted">Phone</p>
                      <p className="text-content">{b.customerPhone}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-content-muted">Service</p>
                      <p className="text-content">{b.service}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-content-muted">Provider</p>
                      <p className="text-content">{b.provider?.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-content-muted">Preferred Date</p>
                      <p className="text-content">{new Date(b.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-content-muted">Preferred Time</p>
                      <p className="text-content">{b.preferredTime}</p>
                    </div>
                    {b.vehicleReg && (
                      <div>
                        <p className="text-xs font-semibold text-content-muted">Vehicle Reg</p>
                        <p className="text-content">{b.vehicleReg}</p>
                      </div>
                    )}
                  </div>

                  {b.status === 'PENDING' && (
                    <div className="flex flex-wrap gap-3 pt-2 border-t border-line">
                      <button
                        onClick={() => void handleBookingAction(b.id, 'CONFIRMED')}
                        disabled={actionLoading === b.id}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:brightness-110 disabled:opacity-50 min-h-[44px]"
                      >
                        <CheckCircle size={16} />
                        {actionLoading === b.id ? 'Processing…' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => void handleBookingAction(b.id, 'CANCELLED')}
                        disabled={actionLoading === b.id}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-xl text-sm font-semibold hover:bg-red-500/25 disabled:opacity-50 min-h-[44px]"
                      >
                        <XCircle size={16} />
                        {actionLoading === b.id ? 'Processing…' : 'Cancel'}
                      </button>
                    </div>
                  )}

                  {b.status === 'CONFIRMED' && (
                    <div className="flex flex-wrap gap-3 pt-2 border-t border-line">
                      <button
                        onClick={() => void handleBookingAction(b.id, 'COMPLETED')}
                        disabled={actionLoading === b.id}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:brightness-110 disabled:opacity-50 min-h-[44px]"
                      >
                        <CheckCircle size={16} />
                        {actionLoading === b.id ? 'Processing…' : 'Mark Complete'}
                      </button>
                      <button
                        onClick={() => void handleBookingAction(b.id, 'CANCELLED')}
                        disabled={actionLoading === b.id}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-xl text-sm font-semibold hover:bg-red-500/25 disabled:opacity-50 min-h-[44px]"
                      >
                        <XCircle size={16} />
                        {actionLoading === b.id ? 'Processing…' : 'Cancel'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {subTab === 'PROVIDERS' && (
        <>
          <button onClick={() => void loadProviders()} className="px-3 py-2 text-sm text-content-muted hover:text-content min-h-[44px]" title="Refresh">
            <RefreshCw size={16} />
          </button>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FFC700]" />
            </div>
          )}

          {!loading && providers.length === 0 && (
            <div className="text-center py-12 text-sm text-content-muted">No service providers.</div>
          )}

          {!loading && providers.map((p) => (
            <div key={p.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full">ACTIVE</span>
                  <span className="font-bold text-content text-sm">{p.name}</span>
                  <span className="text-xs text-content-muted">{p.city || ''}</span>
                </div>
              </div>
              {p.services && p.services.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.services.map((s) => (
                    <span key={s} className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-card border border-line text-content-muted">{s}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
