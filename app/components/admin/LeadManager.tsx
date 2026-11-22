'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, MessageSquare, Phone, RefreshCw, Search, Tag } from 'lucide-react';

import StatusBadge from './ui/StatusBadge';
import { PanelEmpty, PanelError, PanelLoading, PanelMetric } from './ui/AdminPanelState';
import { formatIndianNumber } from '@/app/lib/currency';

interface Lead {
  id: number;
  vehicleId: number;
  vehicle?: { title?: string };
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  message?: string | null;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CLOSED';
  notes?: string | null;
  createdAt: string;
}

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATING', 'CONVERTED', 'CLOSED'] as const;
const FILTERS = ['ALL', ...STATUSES] as const;

/** Admin Lead Manager — view, filter, update status and notes. */
export default function LeadManager() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /** Pure fetch — no state, so the mount effect can await it first. */
  const fetchLeads = useCallback(async () => {
    const res = await fetch('/api/leads', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const data = await res.json();
    return (data.leads || []) as Lead[];
  }, []);

  const applyLeads = useCallback((rows: Lead[]) => {
    setLeads(rows);
    setError('');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      applyLeads(await fetchLeads());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [applyLeads, fetchLeads]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await fetchLeads();
        if (active) applyLeads(rows);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load leads');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [applyLeads, fetchLeads]);

  const update = async (id: number, patch: { status?: string; notes?: string }) => {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setError('Could not update this lead. Please try again.');
      return;
    }
    void load();
  };

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const lead of leads) map[lead.status] = (map[lead.status] ?? 0) + 1;
    return map;
  }, [leads]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (filter !== 'ALL' && lead.status !== filter) return false;
      if (!needle) return true;
      return [
        lead.customerName,
        lead.customerEmail,
        lead.customerPhone,
        lead.vehicle?.title,
        lead.message,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [filter, leads, query]);

  const newCount = counts.NEW ?? 0;
  const qualifiedCount = (counts.QUALIFIED ?? 0) + (counts.NEGOTIATING ?? 0);
  const convertedCount = counts.CONVERTED ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <PanelMetric label="New leads" value={formatIndianNumber(newCount)} hint="Not yet contacted" />
        <PanelMetric
          label="Qualified / negotiating"
          value={formatIndianNumber(qualifiedCount)}
          hint="Active sales conversations"
        />
        <PanelMetric
          label="Converted"
          value={formatIndianNumber(convertedCount)}
          hint="Closed as a sale"
        />
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[hsl(var(--color-line))] p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-[hsl(var(--color-content))]">
                Sales leads
              </h2>
              <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
                {formatIndianNumber(visible.length)} of {formatIndianNumber(leads.length)} leads.
                Update the status as the conversation progresses.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative block w-full lg:max-w-xs">
                <span className="sr-only">Search leads</span>
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--color-content-faint))]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, phone or vehicle…"
                  className="admin-input pl-9"
                />
              </label>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] px-3 text-sm text-[hsl(var(--color-content-muted))] transition-colors hover:text-[hsl(var(--color-content))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
                title="Refresh leads"
              >
                <RefreshCw size={16} aria-hidden="true" />
                <span className="sr-only">Refresh</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter leads by status">
            {FILTERS.map((status) => {
              const active = filter === status;
              const count = status === 'ALL' ? leads.length : counts[status] ?? 0;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilter(status)}
                  aria-pressed={active}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] ${
                    active
                      ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]'
                      : 'border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] text-[hsl(var(--color-content-muted))] hover:border-[hsl(var(--color-line-hover))] hover:text-[hsl(var(--color-content))]'
                  }`}
                >
                  {status === 'ALL' ? 'All' : status.toLowerCase()}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                      active ? 'bg-black/10' : 'bg-[hsl(var(--admin-surface-muted))]'
                    }`}
                  >
                    {formatIndianNumber(count)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="p-4">
            <PanelLoading rows={4} label="Loading leads" />
          </div>
        ) : error ? (
          <div className="p-4">
            <PanelError message={error} onRetry={() => void load()} />
          </div>
        ) : visible.length === 0 ? (
          <div className="p-4">
            <PanelEmpty
              icon={MessageSquare}
              title={query ? `No leads match “${query}”` : 'No leads in this view'}
              description={
                query
                  ? 'Try a different name, phone number or vehicle.'
                  : 'Leads submitted from vehicle pages appear here for follow-up.'
              }
              action={
                query || filter !== 'ALL' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setFilter('ALL');
                    }}
                    className="admin-btn admin-btn-secondary text-xs"
                  >
                    Show all leads
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-[hsl(var(--color-line))]">
            {visible.map((lead) => (
              <li key={lead.id} className="p-4 sm:px-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-[hsl(var(--color-content))]">
                        {lead.customerName}
                      </p>
                      <StatusBadge status={lead.status} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[hsl(var(--color-content-muted))]">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone size={12} aria-hidden="true" /> {lead.customerPhone}
                      </span>
                      {lead.customerEmail && (
                        <span className="inline-flex items-center gap-1.5">
                          <Mail size={12} aria-hidden="true" /> {lead.customerEmail}
                        </span>
                      )}
                      {lead.vehicle?.title && (
                        <span className="inline-flex items-center gap-1.5">
                          <Tag size={12} aria-hidden="true" /> {lead.vehicle.title}
                        </span>
                      )}
                    </div>
                    {lead.message && (
                      <p className="mt-2 max-w-2xl rounded-lg bg-[hsl(var(--admin-surface-muted))] px-3 py-2 text-sm leading-6 text-[hsl(var(--color-content-muted))]">
                        “{lead.message}”
                      </p>
                    )}
                    {lead.notes && (
                      <p className="mt-2 text-xs leading-5 text-[hsl(var(--color-content-faint))]">
                        <span className="font-semibold text-[hsl(var(--color-content-muted))]">
                          Notes:
                        </span>{' '}
                        {lead.notes}
                      </p>
                    )}
                    <p className="mt-1.5 text-[11px] text-[hsl(var(--color-content-faint))]">
                      Received {formatDate(lead.createdAt)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 text-xs text-[hsl(var(--color-content-muted))]">
                      <span className="sr-only">Status for {lead.customerName}</span>
                      <select
                        value={lead.status}
                        onChange={(event) => void update(lead.id, { status: event.target.value })}
                        className="admin-input min-h-10 w-auto py-0 text-xs"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status.toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const notes = window.prompt('Notes for this lead:', lead.notes || '');
                        if (notes !== null) void update(lead.id, { notes });
                      }}
                      className="admin-btn admin-btn-secondary min-h-10 px-3 text-xs"
                    >
                      <MessageSquare size={14} aria-hidden="true" /> Notes
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
