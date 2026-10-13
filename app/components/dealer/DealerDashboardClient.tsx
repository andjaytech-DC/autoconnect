'use client';

import { useCallback, useEffect, useState } from 'react';
import { Car, Users, CalendarCheck, IndianRupee, TrendingUp, Package, Plus, X, Clock, CheckCircle, XCircle } from 'lucide-react';
import VehicleForm from '@/app/components/admin/VehicleForm';
import { reportClientError } from '@/app/lib/reportClientError';

interface Stats { inventory: number; active: number; sold: number; leads: number; testDrives: number; finance: number }
interface Vehicle { id: number; title: string; price: number; status: string; viewCount: number; _count?: { leads: number; testDrives: number } }
interface LeadItem { id: number; customerName: string; customerPhone: string; status: string; vehicle?: { title?: string } }
interface TDItem { id: number; customerName: string; preferredDate: string; status: string; vehicle?: { title?: string } }
interface FinItem { id: number; applicantName: string; loanAmount: number; status: string; vehicle?: { title?: string } }
interface DealerProfile { id: number; businessName?: string; status?: string; city?: string; state?: string; ownerName?: string; email?: string; phone?: string }

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

async function jsonGet<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      reportClientError({ message: `GET ${url} failed`, route: url, status: res.status });
      return fallback;
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      reportClientError({ message: `GET ${url} non-JSON content-type`, route: url, status: res.status });
      return fallback;
    }
    return (await res.json()) as T;
  } catch (err) {
    reportClientError({ message: err instanceof Error ? err.message : 'unknown', route: url, code: err instanceof TypeError ? 'NETWORK' : null });
    return fallback;
  }
}

function Stat({ icon: Icon, value, label }: { icon: React.ComponentType<{ size?: number; className?: string }>; value: number | string; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 sm:p-6">
      <Icon size={20} className="text-[#FFC700]" />
      <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-content">{value}</p>
      <p className="text-xs sm:text-sm text-content-muted">{label}</p>
    </div>
  );
}

export default function DealerDashboardClient({ role }: { role: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tab, setTab] = useState<'inventory' | 'leads' | 'testdrives' | 'finance'>('inventory');
  const [showAddForm, setShowAddForm] = useState(false);
  const [dealerId, setDealerId] = useState<number | null>(null);
  const [dealerLabel, setDealerLabel] = useState('');
  const [dealerProfile, setDealerProfile] = useState<DealerProfile | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [dealerError, setDealerError] = useState(false);

  const load = useCallback(async () => {
    const [s, v, me] = await Promise.all([
      jsonGet<{ stats?: Stats }>('/api/dealer/stats', {}),
      jsonGet<{ vehicles?: Vehicle[] }>('/api/dealer/vehicles', { vehicles: [] }),
      jsonGet<{ dealer?: DealerProfile }>('/api/dealer/me', {}),
    ]);
    return { stats: s.stats || null, vehicles: v.vehicles || [], dealer: me.dealer || null };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const data = await load();
      if (cancelled) return;
      setStats(data.stats);
      setVehicles(data.vehicles);
      const d = data.dealer;
      if (d && typeof d.id === 'number') {
        setDealerId(d.id);
        setDealerLabel(d.businessName || 'Your dealership');
        setDealerProfile(d);
        setDealerError(false);
      } else {
        setDealerError(true);
      }
      setLoading(false);
    };
    void run();
    return () => { cancelled = true; };
  }, [load]);

  const refreshAfterMutation = useCallback(async () => {
    const data = await load();
    setStats(data.stats);
    setVehicles(data.vehicles);
    const d = data.dealer;
    if (d && typeof d.id === 'number') {
      setDealerId(d.id);
      setDealerLabel(d.businessName || 'Your dealership');
      setDealerProfile(d);
    }
  }, [load]);

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/vehicles/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    void refreshAfterMutation();
  };

  const handleVehicleCreated = (vehicle?: Record<string, unknown>) => {
    setShowAddForm(false);
    setTab('inventory');
    const id = vehicle && typeof vehicle.id === 'number' ? vehicle.id : null;
    setHighlightId(id);
    void refreshAfterMutation().then(() => {
      if (id !== null) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            document.querySelector(`[data-vehicle-card="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 60);
        });
      } else {
        document.querySelector('[data-inventory-list]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const dealerStatus = dealerProfile?.status;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFC700] mx-auto mb-4" />
          <p className="text-sm text-content-muted">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  // Error state — no dealer profile
  if (dealerError || !dealerProfile) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 max-w-2xl">
        <div className="flex items-start gap-4">
          <XCircle size={24} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-400">Dealership profile unavailable</p>
            <p className="text-sm text-content-muted mt-1">
              We couldn&apos;t load your dealership profile. This may mean you haven&apos;t registered a dealership yet.
            </p>
            <a href="/dealer/register" className="inline-block mt-3 px-4 py-2 bg-[#FFC700] text-[#15130a] rounded-xl text-sm font-semibold hover:brightness-110">
              Register Dealership
            </a>
          </div>
        </div>
      </div>
    );
  }

  // PENDING status
  if (dealerStatus === 'PENDING') {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
          <div className="flex items-start gap-4">
            <Clock size={24} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-400">Dealership Application — Pending Approval</p>
              <p className="text-sm text-content-muted mt-1">
                Your application has been submitted and is waiting for admin review.
                Vehicle listing will become available after your dealership is approved.
              </p>
              <div className="mt-3 text-xs text-content-muted space-y-1">
                <p><span className="font-semibold">Business:</span> {dealerProfile.businessName}</p>
                <p><span className="font-semibold">Location:</span> {dealerProfile.city}, {dealerProfile.state}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-card p-6">
          <h3 className="text-sm font-bold text-content-muted uppercase tracking-wider mb-3">Inventory</h3>
          <p className="text-sm text-content-muted">Locked until approval. Vehicle listing will become available after your dealership is approved.</p>
        </div>
      </div>
    );
  }

  // REJECTED status
  if (dealerStatus === 'REJECTED') {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <div className="flex items-start gap-4">
            <XCircle size={24} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-400">Dealership Application — Not Approved</p>
              <p className="text-sm text-content-muted mt-1">
                Your dealership application was not approved. Please contact support or update your application.
              </p>
              <div className="mt-3 text-xs text-content-muted space-y-1">
                <p><span className="font-semibold">Business:</span> {dealerProfile.businessName}</p>
                <p><span className="font-semibold">Location:</span> {dealerProfile.city}, {dealerProfile.state}</p>
              </div>
              <a href="/dealer/register" className="inline-block mt-3 px-4 py-2 bg-[#FFC700] text-[#15130a] rounded-xl text-sm font-semibold hover:brightness-110">
                Update Application
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // APPROVED — full dashboard
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-content">Inventory</h2>
          <p className="text-sm text-content-muted">List and manage your vehicles.</p>
        </div>
        <button
          type="button"
          onClick={() => { setHighlightId(null); setShowAddForm((v) => !v); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FFC700] text-[#15130a] rounded-xl text-sm font-bold hover:brightness-110 transition-colors min-h-[44px]"
          aria-expanded={showAddForm}
        >
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
          {showAddForm ? 'Close Form' : 'Add Vehicle'}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-8">
          {dealerId ? (
            <VehicleForm
              dealerMode
              lockedDealerId={dealerId}
              lockedDealerLabel={dealerLabel}
              onSuccess={handleVehicleCreated}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <div className="rounded-2xl border border-line bg-card p-6 text-sm text-content-muted">
              Loading your dealership profile…
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat icon={Package} value={stats?.inventory ?? '—'} label="Total Inventory" />
        <Stat icon={Car} value={stats?.active ?? '—'} label="Active Listings" />
        <Stat icon={TrendingUp} value={stats?.sold ?? '—'} label="Sold" />
        <Stat icon={Users} value={stats?.leads ?? '—'} label="Leads" />
        <Stat icon={CalendarCheck} value={stats?.testDrives ?? '—'} label="Test Drives" />
        <Stat icon={IndianRupee} value={stats?.finance ?? '—'} label="Finance Applications" />
      </div>

      <div className="mt-8 flex gap-2 border-b border-line overflow-x-auto">
        {(['inventory', 'leads', 'testdrives', 'finance'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={'px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 min-h-[44px] ' + (tab === t ? 'border-[#FFC700] text-[#FFC700]' : 'border-transparent text-content-muted')}>
            {t === 'testdrives' ? 'Test Drives' : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        <div className="mt-4 space-y-3" data-inventory-list>
          {vehicles.length === 0 && <p className="text-sm text-content-muted py-8 text-center">No inventory yet.</p>}
          {highlightId !== null && (
            <p className="text-xs font-semibold text-[#FFC700]" role="status">Newly added vehicle highlighted below.</p>
          )}
          {vehicles.map((v) => (
            <div
              key={v.id}
              data-vehicle-card={v.id}
              className={'rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 transition-colors ' + (v.id === highlightId ? 'border-[#FFC700] bg-[#FFC700]/5' : 'border-line bg-card')}
            >
              <div>
                <p className="font-bold text-content text-sm">{v.title}</p>
                <p className="text-xs text-content-muted">{inr(v.price)} · {v.viewCount} views</p>
              </div>
              <select value={v.status} onChange={(e) => void updateStatus(v.id, e.target.value)} className="px-2 py-1.5 border border-border rounded-lg text-xs bg-card text-content min-h-[44px]">
                {['AVAILABLE', 'RESERVED', 'SOLD', 'INACTIVE'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {tab === 'leads' && <DealerLeads />}
      {tab === 'testdrives' && <DealerTDs />}
      {tab === 'finance' && <DealerFinance />}
    </div>
  );
}


function DealerLeads() {
  const [items, setItems] = useState<LeadItem[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    void jsonGet<{ leads?: LeadItem[] }>('/api/dealer/leads', { leads: [] })
      .then((d) => { setItems(d.leads || []); setFailed(false); })
      .catch(() => setFailed(true));
  }, []);
  const upd = (id: number, st: string) => fetch(`/api/leads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: st }) }).then(() => jsonGet<{ leads?: LeadItem[] }>('/api/dealer/leads', { leads: [] }).then((d) => setItems(d.leads || []))).catch(() => setFailed(true));
  const badge = (s: string) => 'ml-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ' + (s === 'NEW' ? 'bg-blue-50 text-blue-700' : s === 'CLOSED' || s === 'CONVERTED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-50 text-amber-700');
  return (
    <div className="mt-4 space-y-3">
      {failed && <p className="text-sm text-red-400 py-8 text-center">Couldn&apos;t load leads. Try again shortly.</p>}
      {!failed && items.length === 0 && <p className="text-sm text-content-muted py-8 text-center">No leads yet.</p>}
      {items.map((l) => (
        <div key={l.id} className="rounded-2xl border border-line bg-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold text-content text-sm">{l.customerName} <span className={badge(l.status)}>{l.status}</span></p>
            <p className="text-xs text-content-muted">{l.customerPhone}{l.vehicle?.title ? ` · ${l.vehicle.title}` : ''}</p>
          </div>
          <select value={l.status} onChange={(e) => void upd(l.id, e.target.value)} className="px-2 py-1.5 border border-border rounded-lg text-xs bg-card text-content min-h-[44px]">
            {['NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATING', 'CONVERTED', 'CLOSED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

function DealerTDs() {
  const [items, setItems] = useState<TDItem[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    void jsonGet<{ testDrives?: TDItem[] }>('/api/dealer/test-drives', { testDrives: [] })
      .then((d) => { setItems(d.testDrives || []); setFailed(false); })
      .catch(() => setFailed(true));
  }, []);
  return (
    <div className="mt-4 space-y-3">
      {failed && <p className="text-sm text-red-400 py-8 text-center">Couldn&apos;t load test drives. Try again shortly.</p>}
      {!failed && items.length === 0 && <p className="text-sm text-content-muted py-8 text-center">No test drives yet.</p>}
      {items.map((t) => (
        <div key={t.id} className="rounded-2xl border border-line bg-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold text-content text-sm">{t.customerName} <span className="ml-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-50 text-amber-700">{t.status}</span></p>
            <p className="text-xs text-content-muted">{new Date(t.preferredDate).toLocaleDateString('en-IN')}{t.vehicle?.title ? ` · ${t.vehicle.title}` : ''}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DealerFinance() {
  const [items, setItems] = useState<FinItem[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    void jsonGet<{ applications?: FinItem[] }>('/api/dealer/finance', { applications: [] })
      .then((d) => { setItems(d.applications || []); setFailed(false); })
      .catch(() => setFailed(true));
  }, []);
  return (
    <div className="mt-4 space-y-3">
      {failed && <p className="text-sm text-red-400 py-8 text-center">Couldn&apos;t load finance applications. Try again shortly.</p>}
      {!failed && items.length === 0 && <p className="text-sm text-content-muted py-8 text-center">No finance applications yet.</p>}
      {items.map((f) => (
        <div key={f.id} className="rounded-2xl border border-line bg-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold text-content text-sm">{f.applicantName} <span className="ml-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-purple-50 text-purple-700">{f.status}</span></p>
            <p className="text-xs text-content-muted">{inr(f.loanAmount)}{f.vehicle?.title ? ` · ${f.vehicle.title}` : ''}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
