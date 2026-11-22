'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Flag,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';

import StatusBadge from './ui/StatusBadge';
import { PanelEmpty, PanelError, PanelLoading, PanelMetric } from './ui/AdminPanelState';
import { formatIndianNumber } from '@/app/lib/currency';
import {
  COVER_TYPES,
  COVER_TYPE_LABEL,
  STATUS_LABEL,
  formatDate,
  formatDateTime,
  inr,
  type InsuranceEnquiryDto,
} from '@/app/lib/insurance';

/* This is a REFERRAL workflow. Nothing in this panel issues, approves or prices a
   policy: it routes enquiries to partner insurers/brokers and records what they say. */

interface StaffEnquiry extends Omit<InsuranceEnquiryDto, 'partner' | 'quote' | 'followUpRequested'> {
  userId: number | null;
  phone: string;
  email: string | null;
  fuelType: string | null;
  hadClaim: boolean | null;
  consentAt: string | null;
  partnerId: number | null;
  quoteAmount: number | null;
  quoteNotes: string | null;
  followUpRequestedAt: string | null;
  partner?: { id: number; name: string; phone: string; email: string | null } | null;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Record<string, number>;
  followUps: number;
}

interface AdminPartner {
  id: number;
  name: string;
  description: string | null;
  contactName: string | null;
  phone: string;
  email: string | null;
  website: string | null;
  products: string[];
  cities: string[];
  licenceNote: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  openEnquiries: number;
}

interface Report {
  total: number;
  open: number;
  awaitingFollowUp: number;
  byStatus: Record<string, number>;
  byCoverType: Record<string, number>;
  byPartner: { partnerId: number | null; name: string; count: number }[];
  weekly: { weekStarting: string; count: number }[];
}

type Tab = 'ENQUIRIES' | 'PARTNERS' | 'REPORT';

const STATUS_ORDER = [
  'SUBMITTED', 'UNDER_REVIEW', 'PARTNER_ASSIGNED', 'QUOTE_RECEIVED',
  'CUSTOMER_CONTACTED', 'ACCEPTED', 'DECLINED', 'CLOSED',
] as const;

/** Wording for the next-step buttons. WHICH ones appear is decided by NestJS. */
const ACTION_LABEL: Record<string, string> = {
  UNDER_REVIEW: 'Start review',
  CUSTOMER_CONTACTED: 'Mark customer contacted',
  ACCEPTED: 'Customer accepted',
  DECLINED: 'Customer declined',
  CLOSED: 'Close enquiry',
};

// A file download, not page navigation (so a plain anchor is correct here).
const EXPORT_URL = '/api/insurance/export';
// Staff-voiced wording (the shared labels speak to the customer: "You accepted a quote").
const ADMIN_LABEL: Record<string, string> = {
  ...STATUS_LABEL,
  CUSTOMER_CONTACTED: 'Customer contacted',
  ACCEPTED: 'Customer accepted',
  DECLINED: 'Customer declined',
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

export default function AdminInsurancePanel() {
  const [tab, setTab] = useState<Tab>('ENQUIRIES');
  const [partners, setPartners] = useState<AdminPartner[]>([]);
  const [refError, setRefError] = useState('');

  const loadPartners = useCallback(async () => {
    setRefError('');
    try {
      const d = await api<{ partners: AdminPartner[] }>('/api/admin/insurance-partners');
      setPartners(d.partners);
    } catch (err) {
      setRefError(err instanceof Error ? err.message : 'Could not load insurance partners.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    void loadPartners();
  }, [loadPartners]);

  const tabs: { key: Tab; label: string; icon: typeof ShieldCheck }[] = [
    { key: 'ENQUIRIES', label: 'Enquiries', icon: ShieldCheck },
    { key: 'PARTNERS', label: 'Partners', icon: Building2 },
    { key: 'REPORT', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Insurance sections">
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

      {refError && <PanelError message={refError} onRetry={() => void loadPartners()} />}

      {tab === 'ENQUIRIES' && <EnquiriesTab partners={partners} />}
      {tab === 'PARTNERS' && <PartnersTab partners={partners} onChanged={loadPartners} />}
      {tab === 'REPORT' && <ReportTab />}
    </div>
  );
}

/* ───────────────────────────── Enquiries ───────────────────────────── */

function EnquiriesTab({ partners }: { partners: AdminPartner[] }) {
  const [items, setItems] = useState<StaffEnquiry[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [status, setStatus] = useState('');
  const [coverType, setCoverType] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('');
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<(StaffEnquiry & { timeline?: { at: string; kind: string; label: string; detail?: string }[] }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filterQuery = useMemo(() => {
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (coverType) qs.set('coverType', coverType);
    if (partnerFilter) qs.set('partnerId', partnerFilter);
    if (followUpOnly) qs.set('followUp', 'true');
    if (q) qs.set('q', q);
    return qs;
  }, [status, coverType, partnerFilter, followUpOnly, q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams(filterQuery);
      qs.set('page', String(page));
      qs.set('limit', '20');
      const d = await api<{ enquiries: StaffEnquiry[]; meta: Meta | null }>(`/api/insurance?${qs}`);
      setItems(d.enquiries);
      setMeta(d.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load enquiries.');
    } finally {
      setLoading(false);
    }
  }, [filterQuery, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data load driven by the filters
    void load();
  }, [load]);

  const openDetail = useCallback(async (id: number | null) => {
    setOpenId(id);
    setDetail(null);
    setActionError('');
    setAssignTo('');
    setQuoteAmount('');
    setQuoteNotes('');
    setNote('');
    if (id === null) return;
    try {
      const d = await api<{ data: NonNullable<typeof detail> }>(`/api/insurance/${id}`);
      setDetail(d.data);
      if (d.data.quoteAmount !== null) setQuoteAmount(String(d.data.quoteAmount));
      if (d.data.quoteNotes) setQuoteNotes(d.data.quoteNotes);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not load this enquiry.');
    }
  }, []);

  /** One staff action, then refresh the list and the open enquiry. The server's reason is shown on refusal. */
  async function act(run: () => Promise<unknown>) {
    if (!detail) return;
    setBusy(true);
    setActionError('');
    try {
      await run();
      await Promise.all([load(), openDetail(detail.id)]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update this enquiry.');
    } finally {
      setBusy(false);
    }
  }

  const patch = (body: object) => api(`/api/insurance/${detail?.id}`, jsonInit('PATCH', body));

  const counts = meta?.counts ?? {};
  const inProgress = ['UNDER_REVIEW', 'PARTNER_ASSIGNED', 'CUSTOMER_CONTACTED'].reduce((n, s) => n + (counts[s] ?? 0), 0);
  const all = Object.values(counts).reduce((n, c) => n + c, 0);

  const eligiblePartners = useMemo(
    () => (detail ? partners.filter((p) => p.status === 'ACTIVE' && p.products.includes(detail.coverType)) : []),
    [partners, detail],
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
        <PanelMetric label="New" value={formatIndianNumber(counts.SUBMITTED ?? 0)} hint="Not yet reviewed" />
        <PanelMetric label="In progress" value={formatIndianNumber(inProgress)} hint="Review, partner, contact" />
        <PanelMetric label="Quotes in" value={formatIndianNumber(counts.QUOTE_RECEIVED ?? 0)} hint="Waiting on the customer" />
        <PanelMetric label="Follow-ups asked" value={formatIndianNumber(meta?.followUps ?? 0)} hint="Customer is waiting for a reply" />
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[hsl(var(--color-line))] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold tracking-tight text-[hsl(var(--color-content))]">Insurance enquiries</h2>
              <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
                Referrals only: assign a partner, record the quote they send, and keep the customer informed. Nothing here issues or prices a policy.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <a
                href={`/api/insurance/export?${filterQuery}`}
                className="admin-btn admin-btn-secondary text-xs"
                title="Download the filtered enquiries as CSV (contains personal data)"
              >
                <Download size={15} aria-hidden="true" /> Export CSV
              </a>
              <button type="button" onClick={() => void load()} className="admin-btn admin-btn-secondary" title="Refresh">
                <RefreshCw size={16} aria-hidden="true" />
                <span className="sr-only">Refresh</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
              <label htmlFor="ins-search" className="sr-only">Search enquiries</label>
              <input id="ins-search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search name, phone, email, reg. no. or reference (INQ…)" className={`${inputCls} pl-9`} />
            </div>
            <label htmlFor="ins-cover" className="sr-only">Cover type</label>
            <select id="ins-cover" value={coverType} onChange={(e) => { setCoverType(e.target.value); setPage(1); }} className={`${inputCls} lg:max-w-48`}>
              <option value="">All cover types</option>
              {COVER_TYPES.map((c) => <option key={c} value={c}>{COVER_TYPE_LABEL[c]}</option>)}
            </select>
            <label htmlFor="ins-partner" className="sr-only">Partner</label>
            <select id="ins-partner" value={partnerFilter} onChange={(e) => { setPartnerFilter(e.target.value); setPage(1); }} className={`${inputCls} lg:max-w-52`}>
              <option value="">All partners</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] px-3 text-xs font-semibold">
              <input type="checkbox" checked={followUpOnly} onChange={(e) => { setFollowUpOnly(e.target.checked); setPage(1); }} className="h-4 w-4 accent-[hsl(var(--color-primary))]" />
              Follow-up asked
            </label>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {chip('', 'All', all)}
            {STATUS_ORDER.map((s) => chip(s, ADMIN_LABEL[s], counts[s] ?? 0))}
          </div>
        </div>

        {loading ? (
          <div className="p-4"><PanelLoading rows={4} label="Loading enquiries" /></div>
        ) : error ? (
          <div className="p-4"><PanelError message={error} onRetry={() => void load()} /></div>
        ) : items.length === 0 ? (
          <div className="p-4"><PanelEmpty icon={ShieldCheck} title="No enquiries match" description="Enquiries customers send from the insurance page appear here." /></div>
        ) : (
          <ul className="divide-y divide-[hsl(var(--color-line))]">
            {items.map((e) => {
              const expanded = openId === e.id;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => void openDetail(expanded ? null : e.id)}
                    aria-expanded={expanded}
                    className="flex min-h-11 w-full flex-wrap items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-[hsl(var(--admin-surface-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--color-focus))] sm:px-5"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge status={e.status} label={ADMIN_LABEL[e.status] ?? e.status} />
                      <span className="text-sm font-bold text-[hsl(var(--color-content))]">{e.customerName}</span>
                      <span className="text-xs text-[hsl(var(--color-content-muted))]">
                        {COVER_TYPE_LABEL[e.coverType] ?? e.coverType} · {e.referenceNo}
                        {e.partner ? ` · ${e.partner.name}` : ''}
                      </span>
                      {e.followUpRequestedAt && e.status !== 'CLOSED' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                          <Flag size={11} aria-hidden="true" /> Follow-up asked
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[hsl(var(--color-content-muted))]">{formatDate(e.createdAt)}</span>
                      <Eye size={14} className={`text-[hsl(var(--color-content-faint))] transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface-muted))] p-4 sm:px-5">
                      {!detail ? (
                        actionError ? <PanelError message={actionError} /> : <PanelLoading rows={2} label="Loading enquiry" />
                      ) : (
                        <>
                          <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                            <Detail label="Customer" value={detail.customerName} />
                            <Detail label="Phone" value={detail.phone} />
                            <Detail label="Email" value={detail.email ?? '—'} />
                            <Detail label="City" value={detail.city ?? '—'} />
                            <Detail label="Contact by" value={detail.contactPreference} />
                            <Detail label="Account" value={detail.userId ? `Customer #${detail.userId}` : 'Guest (no account to track with)'} />
                            <Detail label="Vehicle (unverified)" value={[detail.vehicleMake, detail.vehicleModel, detail.registrationYear, detail.fuelType].filter(Boolean).join(' ') || '—'} />
                            <Detail label="Registration no." value={detail.registrationNo ?? '—'} />
                            <Detail label="Existing insurance (self-reported)" value={`${detail.existingInsurance}${detail.policyExpiry ? ` · expires ${formatDate(detail.policyExpiry)}` : ''}${detail.hadClaim ? ' · had a claim' : ''}`} />
                            <Detail label="Consent to share with a partner" value={detail.consentAt ? `Given ${formatDateTime(detail.consentAt)}` : 'Not recorded (enquiry predates consent capture)'} />
                            {detail.message && <div className="sm:col-span-2 lg:col-span-3"><Detail label="Customer note" value={detail.message} /></div>}
                          </div>

                          {detail.followUpRequestedAt && (
                            <p className="mt-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                              <Flag size={13} aria-hidden="true" /> The customer asked for a follow-up on {formatDateTime(detail.followUpRequestedAt)}. Any update or note below counts as a reply.
                            </p>
                          )}

                          {detail.timeline && detail.timeline.length > 0 && (
                            <div className="mt-4 border-t border-[hsl(var(--color-line))] pt-4">
                              <p className="text-[11px] font-bold uppercase tracking-wide text-[hsl(var(--color-content-muted))]">Activity</p>
                              <ol className="mt-2 space-y-1.5 text-xs">
                                {detail.timeline.map((ev, i) => (
                                  <li key={i} className="flex flex-wrap gap-x-3 text-[hsl(var(--color-content))]">
                                    <span className="w-28 shrink-0 tabular-nums text-[hsl(var(--color-content-muted))]">{formatDateTime(ev.at)}</span>
                                    <span className={ev.kind === 'NOTE' ? 'font-semibold text-[hsl(var(--color-primary-strong))]' : ''}>
                                      {ev.label}
                                      {ev.detail ? <span className="font-normal text-[hsl(var(--color-content-muted))]"> — “{ev.detail}”</span> : null}
                                      {ev.kind === 'NOTE' ? ' (internal)' : ''}
                                    </span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {actionError && <div className="mt-4"><PanelError message={actionError} /></div>}

                          {detail.status !== 'CLOSED' && (
                            <div className="mt-4 space-y-4 border-t border-[hsl(var(--color-line))] pt-4">
                              {/* Partner assignment */}
                              <div>
                                <label htmlFor="ins-assign" className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[hsl(var(--color-content-muted))]">
                                  Partner{detail.partner ? `: ${detail.partner.name}` : ' (none yet)'}
                                </label>
                                <div className="flex flex-wrap items-center gap-2">
                                  <select id="ins-assign" value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className={`${inputCls} max-w-64`}>
                                    <option value="">{eligiblePartners.length === 0 ? 'No active partner handles this cover' : 'Choose a partner…'}</option>
                                    {eligiblePartners.filter((p) => p.id !== detail.partnerId).map((p) => (
                                      <option key={p.id} value={p.id}>{p.name}{p.cities.length ? ` — ${p.cities.slice(0, 3).join(', ')}` : ''}</option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    disabled={!assignTo || busy}
                                    onClick={() => void act(() => patch({ partnerId: Number(assignTo), ...(detail.nextStatuses.includes('PARTNER_ASSIGNED') ? { status: 'PARTNER_ASSIGNED' } : {}) }))}
                                    className="admin-btn admin-btn-secondary text-xs"
                                  >
                                    {detail.nextStatuses.includes('PARTNER_ASSIGNED') ? 'Assign & mark assigned' : detail.partnerId ? 'Reassign' : 'Assign'}
                                  </button>
                                </div>
                              </div>

                              {/* Quote supplied by the partner */}
                              {detail.partnerId !== null && (
                                <form
                                  onSubmit={(ev: FormEvent) => {
                                    ev.preventDefault();
                                    const amount = Number(quoteAmount);
                                    void act(() => patch({ quoteAmount: amount, quoteNotes, ...(detail.nextStatuses.includes('QUOTE_RECEIVED') ? { status: 'QUOTE_RECEIVED' } : {}) }));
                                  }}
                                  className="rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] p-3"
                                >
                                  <p className="text-xs font-bold">Quote from {detail.partner?.name ?? 'the partner'}</p>
                                  <p className="mt-0.5 text-[11px] text-[hsl(var(--color-content-muted))]">Record exactly what the partner sent. The customer sees it labelled as the partner’s figure, not an offer from us.</p>
                                  <div className="mt-2 grid gap-2 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
                                    <div>
                                      <label htmlFor="ins-quote-amt" className="admin-label">Amount (₹)</label>
                                      <input id="ins-quote-amt" type="number" min={1} max={10000000} step="0.01" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} className={inputCls} required />
                                    </div>
                                    <div>
                                      <label htmlFor="ins-quote-notes" className="admin-label">Details (optional)</label>
                                      <input id="ins-quote-notes" maxLength={1000} value={quoteNotes} onChange={(e) => setQuoteNotes(e.target.value)} className={inputCls} placeholder="e.g. 1 year, zero depreciation included" />
                                    </div>
                                    <button type="submit" disabled={busy || !(Number(quoteAmount) > 0)} className="admin-btn admin-btn-primary text-xs">
                                      {detail.nextStatuses.includes('QUOTE_RECEIVED') ? 'Record & mark received' : 'Update quote'}
                                    </button>
                                  </div>
                                  {detail.quoteAmount !== null && <p className="mt-2 text-xs text-[hsl(var(--color-content-muted))]">Currently recorded: {inr(detail.quoteAmount)}</p>}
                                </form>
                              )}

                              {/* Status moves that need no extra input */}
                              <div className="flex flex-wrap gap-2">
                                {detail.nextStatuses
                                  .filter((s) => s !== 'PARTNER_ASSIGNED' && s !== 'QUOTE_RECEIVED')
                                  .map((s) =>
                                    s === 'CLOSED' || s === 'DECLINED' ? (
                                      <button key={s} type="button" disabled={busy} onClick={() => void act(() => patch({ status: s }))} className="inline-flex min-h-11 items-center rounded-xl border border-[hsl(var(--color-line))] bg-white px-4 text-xs font-semibold text-[hsl(var(--color-content-muted))] transition-colors hover:bg-[hsl(var(--admin-surface-muted))] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]">
                                        {ACTION_LABEL[s] ?? s}
                                      </button>
                                    ) : (
                                      <button key={s} type="button" disabled={busy} onClick={() => void act(() => patch({ status: s }))} className="admin-btn admin-btn-primary text-xs">
                                        {busy ? 'Working…' : ACTION_LABEL[s] ?? s}
                                      </button>
                                    ),
                                  )}
                              </div>
                            </div>
                          )}

                          {/* Internal note — never shown to the customer */}
                          <form
                            onSubmit={(ev: FormEvent) => {
                              ev.preventDefault();
                              if (note.trim()) void act(async () => { await api(`/api/insurance/${detail.id}/notes`, jsonInit('POST', { note })); setNote(''); });
                            }}
                            className="mt-4 border-t border-[hsl(var(--color-line))] pt-4"
                          >
                            <label htmlFor="ins-note" className="admin-label">Internal note <span className="font-normal text-[hsl(var(--color-content-muted))]">(staff only — the customer never sees this)</span></label>
                            <div className="flex gap-2">
                              <input id="ins-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className={inputCls} placeholder="e.g. Called twice, asked to ring after 6pm" />
                              <button type="submit" disabled={busy || !note.trim()} className="admin-btn admin-btn-secondary shrink-0 text-xs">Add note</button>
                            </div>
                          </form>
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
              Page {meta.page} of {meta.totalPages} · {formatIndianNumber(meta.total)} enquiries
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

/* ───────────────────────────── Partners ───────────────────────────── */

const EMPTY_PARTNER = {
  name: '', contactName: '', phone: '', email: '', website: '', description: '',
  products: [] as string[], cities: '', licenceNote: '', status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
};

function PartnersTab({ partners, onChanged }: { partners: AdminPartner[]; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY_PARTNER);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const begin = (p: AdminPartner | null) => {
    setError('');
    if (p) {
      setEditing(p.id);
      setForm({
        name: p.name, contactName: p.contactName ?? '', phone: p.phone, email: p.email ?? '', website: p.website ?? '',
        description: p.description ?? '', products: p.products, cities: p.cities.join(', '),
        licenceNote: p.licenceNote ?? '', status: p.status,
      });
    } else {
      setEditing('new');
      setForm(EMPTY_PARTNER);
    }
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name,
        contactName: form.contactName,
        phone: form.phone,
        email: form.email,
        website: form.website,
        description: form.description,
        products: form.products,
        cities: form.cities.split(',').map((c) => c.trim()).filter(Boolean),
        licenceNote: form.licenceNote,
        status: form.status,
      };
      if (editing === 'new') await api('/api/admin/insurance-partners', jsonInit('POST', body));
      else await api(`/api/admin/insurance-partners/${editing}`, jsonInit('PATCH', body));
      setEditing(null);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this partner.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(p: AdminPartner) {
    const next = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (next === 'INACTIVE' && p.openEnquiries > 0 && !window.confirm(`${p.name} has ${p.openEnquiries} open enquiry(ies). They stay with this partner, but no new ones can be assigned. Deactivate anyway?`)) return;
    try {
      await api(`/api/admin/insurance-partners/${p.id}`, jsonInit('PATCH', { status: next }));
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this partner.');
    }
  };

  const toggleProduct = (code: string) =>
    setForm((f) => ({ ...f, products: f.products.includes(code) ? f.products.filter((c) => c !== code) : [...f.products, code] }));

  return (
    <div className="admin-card overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-[hsl(var(--color-line))] p-4 sm:p-5">
        <div>
          <h2 className="text-base font-bold tracking-tight text-[hsl(var(--color-content))]">Insurance partners</h2>
          <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
            Insurers and brokers that enquiries are referred to. Only <strong>active</strong> partners can be assigned, and only for cover types they handle.
          </p>
        </div>
        <button type="button" onClick={() => begin(null)} className="admin-btn admin-btn-primary shrink-0 text-xs">
          <Plus size={15} aria-hidden="true" /> Add partner
        </button>
      </div>

      {error && editing === null && <div className="p-4"><PanelError message={error} /></div>}

      {editing !== null && (
        <form onSubmit={save} className="space-y-4 border-b border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface-muted))] p-4 sm:p-5">
          <h3 className="text-sm font-bold">{editing === 'new' ? 'New partner' : 'Edit partner'}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" id="ip-name"><input id="ip-name" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
            <Field label="Contact person (optional)" id="ip-contact"><input id="ip-contact" maxLength={120} value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className={inputCls} /></Field>
            <Field label="Phone" id="ip-phone"><input id="ip-phone" required inputMode="tel" maxLength={20} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} /></Field>
            <Field label="Email (optional)" id="ip-email"><input id="ip-email" type="email" maxLength={120} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} /></Field>
            <div className="sm:col-span-2"><Field label="Website (optional, full address)" id="ip-web"><input id="ip-web" type="url" maxLength={200} placeholder="https://" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className={inputCls} /></Field></div>
            <div className="sm:col-span-2"><Field label="Cities served (comma-separated; blank = no restriction recorded)" id="ip-cities"><input id="ip-cities" value={form.cities} onChange={(e) => setForm({ ...form, cities: e.target.value })} className={inputCls} placeholder="Pune, Mumbai, Delhi" /></Field></div>
            <div className="sm:col-span-2">
              <Field label="Licence / regulatory note — shown to customers exactly as written" id="ip-licence">
                <input id="ip-licence" maxLength={300} value={form.licenceNote} onChange={(e) => setForm({ ...form, licenceNote: e.target.value })} className={inputCls} placeholder="e.g. IRDAI-registered direct broker, reg. no. …" />
              </Field>
              <p className="mt-1 text-[11px] text-[hsl(var(--color-content-muted))]">Leave blank unless you can state it accurately. The site never claims a licence on its own.</p>
            </div>
            <div className="sm:col-span-2"><Field label="Description (optional)" id="ip-desc"><textarea id="ip-desc" rows={2} maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} /></Field></div>
          </div>

          <fieldset>
            <legend className="admin-label">Cover types this partner handles</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {COVER_TYPES.map((c) => (
                <label key={c} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] px-3 text-xs">
                  <input type="checkbox" checked={form.products.includes(c)} onChange={() => toggleProduct(c)} className="h-4 w-4 accent-[hsl(var(--color-primary))]" />
                  {COVER_TYPE_LABEL[c]}
                </label>
              ))}
            </div>
          </fieldset>

          <Field label="Status" id="ip-status">
            <select id="ip-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'ACTIVE' | 'INACTIVE' })} className={`${inputCls} max-w-56`}>
              <option value="ACTIVE">Active — can be assigned</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>

          {error && <PanelError message={error} />}
          <div className="flex gap-2">
            <button type="submit" disabled={saving || form.products.length === 0} className="admin-btn admin-btn-primary text-xs">{saving ? 'Saving…' : 'Save partner'}</button>
            <button type="button" onClick={() => setEditing(null)} className="admin-btn admin-btn-secondary text-xs">Cancel</button>
          </div>
          {form.products.length === 0 && <p className="text-xs text-[hsl(var(--color-content-muted))]">Choose at least one cover type.</p>}
        </form>
      )}

      {partners.length === 0 ? (
        <div className="p-4"><PanelEmpty icon={Building2} title="No insurance partners" description="Until you add and activate a partner, enquiries can be received and reviewed but not assigned." /></div>
      ) : (
        <ul className="divide-y divide-[hsl(var(--color-line))]">
          {partners.map((p) => (
            <li key={p.id} className="p-4 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={p.status} />
                  <span className="text-sm font-bold text-[hsl(var(--color-content))]">{p.name}</span>
                  {p.openEnquiries > 0 && (
                    <span className="rounded-full bg-[hsl(var(--admin-surface-muted))] px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--color-content-muted))]">
                      {p.openEnquiries} open enquir{p.openEnquiries === 1 ? 'y' : 'ies'}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => begin(p)} className="admin-btn admin-btn-secondary text-xs">Edit</button>
                  <button type="button" onClick={() => void toggle(p)} className="admin-btn admin-btn-secondary text-xs">{p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button>
                </div>
              </div>
              {p.licenceNote && <p className="mt-1.5 text-xs text-[hsl(var(--color-content-muted))]">{p.licenceNote}</p>}
              <p className="mt-2 text-xs text-[hsl(var(--color-content-muted))]">
                {p.phone}{p.email ? ` · ${p.email}` : ''}{p.contactName ? ` · ${p.contactName}` : ''}{p.cities.length ? ` · ${p.cities.join(', ')}` : ' · no city restriction recorded'}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.products.map((c) => (
                  <span key={c} className="rounded-full border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface-muted))] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--color-content-muted))]">
                    {COVER_TYPE_LABEL[c] ?? c}
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

/* ───────────────────────────── Reports ───────────────────────────── */

function ReportTab() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api<{ report: Report }>('/api/insurance/report');
      setReport(d.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the report.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    void load();
  }, [load]);

  if (loading) return <div className="admin-card p-4"><PanelLoading rows={4} label="Loading report" /></div>;
  if (error) return <PanelError message={error} onRetry={() => void load()} />;
  if (!report) return null;

  const maxWeek = Math.max(1, ...report.weekly.map((w) => w.count));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <PanelMetric label="Total enquiries" value={formatIndianNumber(report.total)} />
        <PanelMetric label="Open" value={formatIndianNumber(report.open)} hint="Not yet decided or closed" />
        <PanelMetric label="Awaiting follow-up" value={formatIndianNumber(report.awaitingFollowUp)} hint="Customer asked, no reply yet" />
        <PanelMetric label="Quotes accepted" value={formatIndianNumber(report.byStatus.ACCEPTED ?? 0)} hint="Customer wants to proceed" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown title="By status" rows={STATUS_ORDER.map((s) => ({ label: ADMIN_LABEL[s], count: report.byStatus[s] ?? 0 }))} total={report.total} />
        <Breakdown title="By cover type" rows={COVER_TYPES.map((c) => ({ label: COVER_TYPE_LABEL[c], count: report.byCoverType[c] ?? 0 }))} total={report.total} />
        <Breakdown title="By partner" rows={report.byPartner.map((p) => ({ label: p.name, count: p.count }))} total={Math.max(1, report.byPartner.reduce((n, p) => n + p.count, 0))} empty="No enquiry has been assigned to a partner yet." />
        <div className="admin-card p-4 sm:p-5">
          <h3 className="text-sm font-bold">Enquiries per week (last 8 weeks)</h3>
          <ul className="mt-4 space-y-2" aria-label="Weekly enquiries">
            {report.weekly.map((w) => (
              <li key={w.weekStarting} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-xs">
                <span className="text-[hsl(var(--color-content-muted))]">w/c {formatDate(w.weekStarting)}</span>
                <span className="h-2.5 rounded-full bg-[hsl(var(--admin-surface-muted))]">
                  <span className="block h-2.5 rounded-full bg-[hsl(var(--color-primary))]" style={{ width: `${(w.count / maxWeek) * 100}%` }} />
                </span>
                <span className="text-right font-bold tabular-nums">{w.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="admin-card flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <p className="text-sm text-[hsl(var(--color-content-muted))]">Download every enquiry as a spreadsheet. The file contains customers’ personal data — handle it accordingly.</p>
        <a href={EXPORT_URL} className="admin-btn admin-btn-primary text-xs"><Download size={15} aria-hidden="true" /> Export all as CSV</a>
      </div>
    </div>
  );
}

function Breakdown({ title, rows, total, empty }: { title: string; rows: { label: string; count: number }[]; total: number; empty?: string }) {
  const visible = rows.filter((r) => r.count > 0);
  return (
    <div className="admin-card p-4 sm:p-5">
      <h3 className="text-sm font-bold">{title}</h3>
      {visible.length === 0 ? (
        <p className="mt-3 text-xs text-[hsl(var(--color-content-muted))]">{empty ?? 'Nothing to show yet.'}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {visible.map((r) => (
            <li key={r.label} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-xs">
              <span className="truncate text-[hsl(var(--color-content-muted))]" title={r.label}>{r.label}</span>
              <span className="h-2.5 rounded-full bg-[hsl(var(--admin-surface-muted))]">
                <span className="block h-2.5 rounded-full bg-[hsl(var(--color-primary))]" style={{ width: `${Math.max(3, (r.count / Math.max(1, total)) * 100)}%` }} />
              </span>
              <span className="text-right font-bold tabular-nums">{r.count}</span>
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
