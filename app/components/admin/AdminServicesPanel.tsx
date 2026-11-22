'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Wrench,
} from 'lucide-react';

import StatusBadge from './ui/StatusBadge';
import { PanelEmpty, PanelError, PanelLoading, PanelMetric } from './ui/AdminPanelState';
import { formatIndianNumber } from '@/app/lib/currency';
import {
  STATUS_LABEL,
  formatDate,
  formatDateTime,
  type ServiceBookingDto,
} from '@/app/lib/service-booking';

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Record<string, number>;
}

interface AdminProvider {
  id: number;
  name: string;
  description?: string | null;
  phone: string;
  email?: string | null;
  city: string;
  address?: string | null;
  services: string[];
  status: 'ACTIVE' | 'INACTIVE';
  openBookings: number;
}

interface AdminCategory {
  id: number;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  providerCount: number;
}

type Tab = 'BOOKINGS' | 'PROVIDERS' | 'CATEGORIES';

const STATUS_FILTERS = [
  'REQUESTED', 'CONFIRMED', 'ASSIGNED', 'VEHICLE_RECEIVED',
  'IN_PROGRESS', 'AWAITING_APPROVAL', 'COMPLETED', 'CANCELLED',
] as const;

/** Wording for the next-step buttons. Which ones appear is decided by NestJS. */
const ACTION_LABEL: Record<string, string> = {
  CONFIRMED: 'Confirm booking',
  ASSIGNED: 'Mark assigned',
  VEHICLE_RECEIVED: 'Vehicle received',
  IN_PROGRESS: 'Start / resume work',
  AWAITING_APPROVAL: 'Awaiting customer approval',
  COMPLETED: 'Mark complete',
  CANCELLED: 'Cancel booking',
};

const inputCls = 'admin-input';

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export default function AdminServicesPanel() {
  const [tab, setTab] = useState<Tab>('BOOKINGS');
  // Shared reference data: the booking filters and the provider form both need it.
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [refError, setRefError] = useState('');

  const loadReference = useCallback(async () => {
    setRefError('');
    try {
      const [p, c] = await Promise.all([
        api<{ providers: AdminProvider[] }>('/api/admin/service-providers'),
        api<{ categories: AdminCategory[] }>('/api/admin/service-categories'),
      ]);
      setProviders(p.providers);
      setCategories(c.categories);
    } catch (err) {
      setRefError(err instanceof Error ? err.message : 'Could not load providers and categories.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    void loadReference();
  }, [loadReference]);

  const tabs: { key: Tab; label: string; icon: typeof Wrench }[] = [
    { key: 'BOOKINGS', label: 'Service bookings', icon: Wrench },
    { key: 'PROVIDERS', label: 'Providers', icon: Building2 },
    { key: 'CATEGORIES', label: 'Categories', icon: Layers },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Services sections">
        {tabs.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] ${
                active
                  ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]'
                  : 'border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] text-[hsl(var(--color-content-muted))] hover:border-[hsl(var(--color-line-hover))] hover:text-[hsl(var(--color-content))]'
              }`}
            >
              <Icon size={14} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      {refError && <PanelError message={refError} onRetry={() => void loadReference()} />}

      {tab === 'BOOKINGS' && <BookingsTab providers={providers} />}
      {tab === 'PROVIDERS' && (
        <ProvidersTab providers={providers} categories={categories} onChanged={loadReference} />
      )}
      {tab === 'CATEGORIES' && <CategoriesTab categories={categories} onChanged={loadReference} />}
    </div>
  );
}

/* ───────────────────────────── Bookings ───────────────────────────── */

function BookingsTab({ providers }: { providers: AdminProvider[] }) {
  const [bookings, setBookings] = useState<ServiceBookingDto[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [status, setStatus] = useState<string>('');
  const [providerId, setProviderId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ServiceBookingDto | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [assignTo, setAssignTo] = useState('');

  // Debounce the search box so we don't query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) qs.set('status', status);
      if (providerId) qs.set('providerId', providerId);
      if (q) qs.set('q', q);
      const data = await api<{ bookings: ServiceBookingDto[]; meta: Meta | null }>(`/api/services/bookings?${qs}`);
      setBookings(data.bookings);
      setMeta(data.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load service bookings.');
    } finally {
      setLoading(false);
    }
  }, [page, status, providerId, q]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data load driven by the filters
    void load();
  }, [load]);

  const openDetail = useCallback(async (id: number | null) => {
    setOpenId(id);
    setDetail(null);
    setActionError('');
    setAssignTo('');
    if (id === null) return;
    try {
      const d = await api<{ data: ServiceBookingDto }>(`/api/services/bookings/${id}`);
      setDetail(d.data);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not load this booking.');
    }
  }, []);

  async function act(id: number, body: { status?: string; providerId?: number }) {
    setActionBusy(true);
    setActionError('');
    try {
      await api(`/api/services/bookings/${id}`, jsonInit('PATCH', body));
      await Promise.all([load(), openDetail(id)]);
    } catch (err) {
      // The server's reason is the useful part ("can only move to: …").
      setActionError(err instanceof Error ? err.message : 'Could not update this booking.');
    } finally {
      setActionBusy(false);
    }
  }

  const counts = meta?.counts ?? {};
  const active = ['CONFIRMED', 'ASSIGNED', 'VEHICLE_RECEIVED', 'IN_PROGRESS', 'AWAITING_APPROVAL']
    .reduce((n, s) => n + (counts[s] ?? 0), 0);
  const all = Object.values(counts).reduce((n, c) => n + c, 0);

  // Providers that could take over this booking: active and offering its service.
  const reassignable = useMemo(
    () =>
      detail
        ? providers.filter(
            (p) => p.status === 'ACTIVE' && p.id !== detail.providerId && (!detail.categoryCode || p.services.includes(detail.categoryCode)),
          )
        : [],
    [providers, detail],
  );

  const chip = (key: string, label: string, count: number) => {
    const on = status === key;
    return (
      <button
        key={key || 'ALL'}
        type="button"
        onClick={() => { setStatus(key); setPage(1); setOpenId(null); }}
        aria-pressed={on}
        className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] ${
          on
            ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]'
            : 'border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] text-[hsl(var(--color-content-muted))] hover:border-[hsl(var(--color-line-hover))]'
        }`}
      >
        {label}
        <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${on ? 'bg-black/10' : 'bg-[hsl(var(--admin-surface-muted))]'}`}>
          {formatIndianNumber(count)}
        </span>
      </button>
    );
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <PanelMetric label="New requests" value={formatIndianNumber(counts.REQUESTED ?? 0)} hint="Waiting to be confirmed" />
        <PanelMetric label="In the pipeline" value={formatIndianNumber(active)} hint="Confirmed through approval" />
        <PanelMetric label="Completed" value={formatIndianNumber(counts.COMPLETED ?? 0)} hint="Service delivered" />
        <PanelMetric label="All bookings" value={formatIndianNumber(all)} hint="Matching your search" />
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[hsl(var(--color-line))] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold tracking-tight text-[hsl(var(--color-content))]">Service bookings</h2>
              <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
                Requests are never confirmed automatically. Move each one through the workflow once the provider can take it.
              </p>
            </div>
            <button type="button" onClick={() => void load()} className="admin-btn admin-btn-secondary shrink-0" title="Refresh service bookings">
              <RefreshCw size={16} aria-hidden="true" />
              <span className="sr-only">Refresh</span>
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
              <label htmlFor="bk-search" className="sr-only">Search bookings</label>
              <input id="bk-search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search name, phone, vehicle reg. or service" className={`${inputCls} pl-9`} />
            </div>
            <label htmlFor="bk-provider" className="sr-only">Provider</label>
            <select id="bk-provider" value={providerId} onChange={(e) => { setProviderId(e.target.value); setPage(1); }} className={`${inputCls} sm:max-w-56`}>
              <option value="">All providers</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {chip('', 'All', all)}
            {STATUS_FILTERS.map((s) => chip(s, STATUS_LABEL[s], counts[s] ?? 0))}
          </div>
        </div>

        {loading ? (
          <div className="p-4"><PanelLoading rows={4} label="Loading service bookings" /></div>
        ) : error ? (
          <div className="p-4"><PanelError message={error} onRetry={() => void load()} /></div>
        ) : bookings.length === 0 ? (
          <div className="p-4">
            <PanelEmpty icon={Wrench} title="No bookings match" description="Requests customers submit from the storefront appear here." />
          </div>
        ) : (
          <ul className="divide-y divide-[hsl(var(--color-line))]">
            {bookings.map((b) => {
              const expanded = openId === b.id;
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => void openDetail(expanded ? null : b.id)}
                    aria-expanded={expanded}
                    className="flex min-h-11 w-full flex-wrap items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-[hsl(var(--admin-surface-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--color-focus))] sm:px-5"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge status={b.status} label={STATUS_LABEL[b.status] ?? b.status} />
                      <span className="text-sm font-bold text-[hsl(var(--color-content))]">{b.customerName}</span>
                      <span className="text-xs text-[hsl(var(--color-content-muted))]">
                        {b.service} · {b.provider?.name ?? `Provider #${b.providerId}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[hsl(var(--color-content-muted))]">{formatDate(b.preferredDate)} · {b.preferredTime}</span>
                      <Eye size={14} className={`text-[hsl(var(--color-content-faint))] transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface-muted))] p-4 sm:px-5">
                      {!detail ? (
                        actionError ? <PanelError message={actionError} /> : <PanelLoading rows={2} label="Loading booking" />
                      ) : (
                        <>
                          <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                            <Detail label="Customer" value={detail.customerName} />
                            <Detail label="Phone" value={detail.customerPhone} />
                            <Detail label="Service" value={detail.service} />
                            <Detail label="Provider" value={detail.provider ? `${detail.provider.name} (${detail.provider.city})` : '—'} />
                            <Detail label="Preferred" value={`${formatDate(detail.preferredDate)} · ${detail.preferredTime}`} />
                            <Detail label="Account" value={detail.userId === null || detail.userId === undefined ? 'Guest / pre-account booking' : `Customer #${detail.userId}`} />
                            {detail.vehicleReg && <Detail label="Vehicle reg." value={detail.vehicleReg} />}
                            {detail.vehicleDetails && <Detail label="Vehicle (unverified)" value={detail.vehicleDetails} />}
                            {detail.notes && (
                              <div className="sm:col-span-2 lg:col-span-3">
                                <Detail label="Customer notes" value={detail.notes} />
                              </div>
                            )}
                          </div>

                          {detail.timeline && detail.timeline.length > 0 && (
                            <div className="mt-4 border-t border-[hsl(var(--color-line))] pt-4">
                              <p className="text-[11px] font-bold uppercase tracking-wide text-[hsl(var(--color-content-muted))]">History</p>
                              <ol className="mt-2 space-y-1.5 text-xs">
                                {detail.timeline.map((e, i) => (
                                  <li key={i} className="flex flex-wrap gap-x-3 text-[hsl(var(--color-content))]">
                                    <span className="w-28 shrink-0 tabular-nums text-[hsl(var(--color-content-muted))]">{formatDateTime(e.at)}</span>
                                    <span>{e.label}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {actionError && <div className="mt-4"><PanelError message={actionError} /></div>}

                          {(detail.nextStatuses.length > 0 || detail.canReassign) && (
                            <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-[hsl(var(--color-line))] pt-4">
                              {detail.nextStatuses.map((s) =>
                                s === 'CANCELLED' ? (
                                  <button key={s} type="button" disabled={actionBusy} onClick={() => void act(detail.id, { status: s })} className="inline-flex min-h-11 items-center rounded-xl border border-red-200 bg-white px-4 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]">
                                    {ACTION_LABEL[s]}
                                  </button>
                                ) : (
                                  <button key={s} type="button" disabled={actionBusy} onClick={() => void act(detail.id, { status: s })} className="admin-btn admin-btn-primary text-xs">
                                    {actionBusy ? 'Working…' : ACTION_LABEL[s] ?? s}
                                  </button>
                                ),
                              )}
                              {detail.canReassign && reassignable.length > 0 && (
                                <div className="flex items-end gap-2">
                                  <div>
                                    <label htmlFor="bk-assign" className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[hsl(var(--color-content-muted))]">Reassign provider</label>
                                    <select id="bk-assign" value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className={`${inputCls} min-w-48`}>
                                      <option value="">Choose…</option>
                                      {reassignable.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <button type="button" disabled={!assignTo || actionBusy} onClick={() => void act(detail.id, { providerId: Number(assignTo) })} className="admin-btn admin-btn-secondary text-xs">
                                    Reassign
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {meta && meta.totalPages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-[hsl(var(--color-line))] p-3 sm:px-5">
            <p className="text-xs text-[hsl(var(--color-content-muted))]">
              Page {meta.page} of {meta.totalPages} · {formatIndianNumber(meta.total)} bookings
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={meta.page <= 1} className="admin-btn admin-btn-secondary text-xs" aria-label="Previous page">
                <ChevronLeft size={15} aria-hidden="true" /> Prev
              </button>
              <button type="button" onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={meta.page >= meta.totalPages} className="admin-btn admin-btn-secondary text-xs" aria-label="Next page">
                Next <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
          </nav>
        )}
      </div>
    </>
  );
}

/* ───────────────────────────── Providers ───────────────────────────── */

const EMPTY_PROVIDER = { name: '', phone: '', email: '', city: '', address: '', description: '', services: [] as string[], status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' };

function ProvidersTab({
  providers,
  categories,
  onChanged,
}: {
  providers: AdminProvider[];
  categories: AdminCategory[];
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY_PROVIDER);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const nameByCode = useMemo(() => new Map(categories.map((c) => [c.code, c.name])), [categories]);

  const begin = (p: AdminProvider | null) => {
    setError('');
    if (p) {
      setEditing(p.id);
      setForm({ name: p.name, phone: p.phone, email: p.email ?? '', city: p.city, address: p.address ?? '', description: p.description ?? '', services: p.services, status: p.status });
    } else {
      setEditing('new');
      setForm(EMPTY_PROVIDER);
    }
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        city: form.city,
        address: form.address || undefined,
        description: form.description || undefined,
        services: form.services,
        status: form.status,
      };
      if (editing === 'new') await api('/api/admin/service-providers', jsonInit('POST', body));
      else await api(`/api/admin/service-providers/${editing}`, jsonInit('PATCH', body));
      setEditing(null);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this provider.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(p: AdminProvider) {
    const next = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (next === 'INACTIVE' && p.openBookings > 0 && !window.confirm(`${p.name} has ${p.openBookings} open booking(s). They stay in the queue, but customers can no longer book here. Deactivate anyway?`)) return;
    try {
      await api(`/api/admin/service-providers/${p.id}`, jsonInit('PATCH', { status: next }));
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this provider.');
    }
  }

  const toggleService = (code: string) =>
    setForm((f) => ({ ...f, services: f.services.includes(code) ? f.services.filter((s) => s !== code) : [...f.services, code] }));

  return (
    <div className="admin-card overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-[hsl(var(--color-line))] p-4 sm:p-5">
        <div>
          <h2 className="text-base font-bold tracking-tight text-[hsl(var(--color-content))]">Service providers</h2>
          <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
            A service is shown to customers only where an <strong>active</strong> provider lists it.
          </p>
        </div>
        <button type="button" onClick={() => begin(null)} className="admin-btn admin-btn-primary shrink-0 text-xs">
          <Plus size={15} aria-hidden="true" /> Add provider
        </button>
      </div>

      {error && editing === null && <div className="p-4"><PanelError message={error} /></div>}

      {editing !== null && (
        <form onSubmit={save} className="space-y-4 border-b border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface-muted))] p-4 sm:p-5">
          <h3 className="text-sm font-bold">{editing === 'new' ? 'New provider' : 'Edit provider'}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" id="pv-name"><input id="pv-name" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
            <Field label="City" id="pv-city"><input id="pv-city" required maxLength={80} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} /></Field>
            <Field label="Business phone" id="pv-phone"><input id="pv-phone" required inputMode="tel" maxLength={20} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} /></Field>
            <Field label="Email (optional)" id="pv-email"><input id="pv-email" type="email" maxLength={120} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} /></Field>
            <div className="sm:col-span-2"><Field label="Address (optional)" id="pv-address"><input id="pv-address" maxLength={300} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} /></Field></div>
            <div className="sm:col-span-2"><Field label="Description (optional)" id="pv-desc"><textarea id="pv-desc" rows={2} maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} /></Field></div>
          </div>

          <fieldset>
            <legend className="admin-label">Services this provider really offers</legend>
            <div className="mt-1 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => (
                <label key={c.code} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] px-3 text-xs">
                  <input type="checkbox" checked={form.services.includes(c.code)} onChange={() => toggleService(c.code)} className="h-4 w-4 accent-[hsl(var(--color-primary))]" />
                  {c.name}
                </label>
              ))}
            </div>
          </fieldset>

          <Field label="Status" id="pv-status">
            <select id="pv-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'ACTIVE' | 'INACTIVE' })} className={`${inputCls} max-w-48`}>
              <option value="ACTIVE">Active — customers can book</option>
              <option value="INACTIVE">Inactive — hidden</option>
            </select>
          </Field>

          {error && <PanelError message={error} />}
          <div className="flex gap-2">
            <button type="submit" disabled={saving || form.services.length === 0} className="admin-btn admin-btn-primary text-xs">{saving ? 'Saving…' : 'Save provider'}</button>
            <button type="button" onClick={() => setEditing(null)} className="admin-btn admin-btn-secondary text-xs">Cancel</button>
          </div>
          {form.services.length === 0 && <p className="text-xs text-[hsl(var(--color-content-muted))]">Choose at least one service.</p>}
        </form>
      )}

      {providers.length === 0 ? (
        <div className="p-4"><PanelEmpty icon={Building2} title="No service providers" description="Add a provider to make services bookable." /></div>
      ) : (
        <ul className="divide-y divide-[hsl(var(--color-line))]">
          {providers.map((p) => (
            <li key={p.id} className="p-4 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={p.status} />
                  <span className="text-sm font-bold text-[hsl(var(--color-content))]">{p.name}</span>
                  <span className="text-xs text-[hsl(var(--color-content-muted))]">{p.city}</span>
                  {p.openBookings > 0 && (
                    <span className="rounded-full bg-[hsl(var(--admin-surface-muted))] px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--color-content-muted))]">
                      {p.openBookings} open booking{p.openBookings === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => begin(p)} className="admin-btn admin-btn-secondary text-xs">Edit</button>
                  <button type="button" onClick={() => void toggle(p)} className="admin-btn admin-btn-secondary text-xs">{p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button>
                </div>
              </div>
              {p.description && <p className="mt-1.5 text-sm leading-6 text-[hsl(var(--color-content-muted))]">{p.description}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[hsl(var(--color-content-muted))]">
                <span className="inline-flex items-center gap-1.5"><Phone size={12} aria-hidden="true" /> {p.phone}</span>
                {p.email && <span>{p.email}</span>}
                {p.address && <span>{p.address}</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.services.map((code) => (
                  <span key={code} className="rounded-full border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface-muted))] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--color-content-muted))]">
                    {nameByCode.get(code) ?? code}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────────────────────── Categories ───────────────────────────── */

function CategoriesTab({ categories, onChanged }: { categories: AdminCategory[]; onChanged: () => Promise<void> }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function add(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/api/admin/service-categories', jsonInit('POST', { code: form.code, name: form.name, description: form.description || undefined }));
      setForm({ code: '', name: '', description: '' });
      setAdding(false);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add this category.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(c: AdminCategory) {
    setError('');
    try {
      await api(`/api/admin/service-categories/${c.id}`, jsonInit('PATCH', { isActive: !c.isActive }));
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this category.');
    }
  }

  return (
    <div className="admin-card overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-[hsl(var(--color-line))] p-4 sm:p-5">
        <div>
          <h2 className="text-base font-bold tracking-tight text-[hsl(var(--color-content))]">Service categories</h2>
          <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
            The kinds of work you offer. A category appears to customers only once an active provider lists it — hiding one here removes it everywhere.
          </p>
        </div>
        <button type="button" onClick={() => setAdding((v) => !v)} className="admin-btn admin-btn-primary shrink-0 text-xs">
          <Plus size={15} aria-hidden="true" /> Add category
        </button>
      </div>

      {adding && (
        <form onSubmit={add} className="space-y-3 border-b border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface-muted))] p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Code" id="ct-code"><input id="ct-code" required pattern="[A-Z][A-Z_]{1,30}" title="UPPER_SNAKE_CASE, e.g. GLASS_REPAIR" maxLength={31} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className={inputCls} placeholder="GLASS_REPAIR" /></Field>
            <Field label="Name" id="ct-name"><input id="ct-name" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
            <Field label="Description (optional)" id="ct-desc"><input id="ct-desc" maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} /></Field>
          </div>
          <p className="text-xs text-[hsl(var(--color-content-muted))]">The code can’t be changed later — providers reference it.</p>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="admin-btn admin-btn-primary text-xs">{saving ? 'Adding…' : 'Add category'}</button>
            <button type="button" onClick={() => setAdding(false)} className="admin-btn admin-btn-secondary text-xs">Cancel</button>
          </div>
        </form>
      )}

      {error && <div className="p-4"><PanelError message={error} /></div>}

      {categories.length === 0 ? (
        <div className="p-4"><PanelEmpty icon={Layers} title="No categories" description="Add the kinds of service you offer." /></div>
      ) : (
        <ul className="divide-y divide-[hsl(var(--color-line))]">
          {categories.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-[hsl(var(--color-content))]">{c.name}</span>
                  <code className="rounded bg-[hsl(var(--admin-surface-muted))] px-1.5 py-0.5 text-[11px] text-[hsl(var(--color-content-muted))]">{c.code}</code>
                  <StatusBadge status={c.isActive ? 'ACTIVE' : 'INACTIVE'} label={c.isActive ? 'Shown' : 'Hidden'} />
                </div>
                {c.description && <p className="mt-1 text-xs text-[hsl(var(--color-content-muted))]">{c.description}</p>}
                <p className="mt-1 text-xs text-[hsl(var(--color-content-muted))]">
                  {c.providerCount === 0
                    ? 'No active provider offers this — customers cannot book it yet.'
                    : `${c.providerCount} active provider${c.providerCount === 1 ? '' : 's'}`}
                </p>
              </div>
              <button type="button" onClick={() => void toggle(c)} className="admin-btn admin-btn-secondary text-xs">
                {c.isActive ? 'Hide' : 'Show'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────────────────────── shared bits ───────────────────────────── */

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="admin-label">{label}</label>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-[hsl(var(--color-content-muted))]">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-[hsl(var(--color-content))]">{value}</p>
    </div>
  );
}
