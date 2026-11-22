'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Building2, CalendarDays, Car, ChevronRight, ExternalLink, LogIn, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';

import {
  COVER_TYPE_LABEL,
  STATUS_HINT,
  formatDate,
  formatDateTime,
  inr,
  statusLabel,
  type InsuranceEnquiryDto,
} from '@/app/lib/insurance';

/** Colour is never the only signal: every badge also carries its text label. */
const TONE: Record<string, string> = {
  SUBMITTED: 'border-amber-300 bg-amber-50 text-amber-900',
  UNDER_REVIEW: 'border-amber-300 bg-amber-50 text-amber-900',
  PARTNER_ASSIGNED: 'border-sky-300 bg-sky-50 text-sky-900',
  QUOTE_RECEIVED: 'border-indigo-300 bg-indigo-50 text-indigo-900',
  CUSTOMER_CONTACTED: 'border-sky-300 bg-sky-50 text-sky-900',
  ACCEPTED: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  DECLINED: 'border-slate-300 bg-slate-100 text-slate-700',
  CLOSED: 'border-slate-300 bg-slate-100 text-slate-700',
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${TONE[status] ?? TONE.CLOSED}`}>
      {statusLabel(status)}
    </span>
  );
}

const vehicleLine = (e: InsuranceEnquiryDto) =>
  [[e.vehicleMake, e.vehicleModel].filter(Boolean).join(' '), e.registrationYear, e.registrationNo].filter(Boolean).join(' · ');

export default function MyInsuranceEnquiries() {
  const [state, setState] = useState<'loading' | 'anon' | 'error' | 'ready'>('loading');
  const [items, setItems] = useState<InsuranceEnquiryDto[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<InsuranceEnquiryDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [followUpText, setFollowUpText] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/insurance/mine');
      if (res.status === 401) return setState('anon');
      if (!res.ok) return setState('error');
      const d = await res.json();
      setItems(d.enquiries ?? []);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    void load();
  }, [load]);

  const open = useCallback(async (id: number, keepMessage = false) => {
    setOpenId(id);
    setConfirmClose(false);
    setFollowUpText('');
    if (!keepMessage) setMessage(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/insurance/mine/${id}`);
      const d = await res.json().catch(() => ({}));
      setDetail(res.ok ? d.data : null);
      if (!res.ok) setMessage({ tone: 'err', text: d.error ?? 'Could not load this enquiry.' });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  /** Run one action, then refresh both the list and the open enquiry. */
  async function act(path: string, body: unknown, okText: string) {
    if (!detail) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/insurance/mine/${detail.id}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? 'That did not work. Please try again.');
      await Promise.all([load(), open(detail.id, true)]);
      setMessage({ tone: 'ok', text: okText });
    } catch (err) {
      setMessage({ tone: 'err', text: err instanceof Error ? err.message : 'That did not work. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  function sendFollowUp(e: FormEvent) {
    e.preventDefault();
    if (followUpText.trim()) void act('follow-up', { message: followUpText }, 'Thanks — we’ve asked the team to follow up. You’ll see their reply here.');
  }

  if (state === 'loading') return <p role="status" className="text-sm text-[hsl(var(--color-content-muted))]">Loading your enquiries…</p>;
  if (state === 'anon') {
    return (
      <div className="rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-8 text-center">
        <LogIn size={30} className="mx-auto text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-bold">Sign in to see your enquiries</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[hsl(var(--color-content-muted))]">
          Enquiries sent while signed in appear here, with their progress.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="btn btn-primary">Sign in</Link>
          <Link href="/register" className="btn btn-secondary">Create an account</Link>
        </div>
      </div>
    );
  }
  if (state === 'error') {
    return (
      <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        We couldn’t load your enquiries right now.{' '}
        <button onClick={() => { setState('loading'); void load(); }} className="font-semibold underline">Try again</button>
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-10 text-center">
        <ShieldCheck size={30} className="mx-auto text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-bold">No insurance enquiries yet</h2>
        <p className="mt-1 text-sm text-[hsl(var(--color-content-muted))]">Send one and you’ll follow it here.</p>
        <Link href="/insurance" className="btn btn-primary mt-5">Send an enquiry</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:items-start">
      <ul className="space-y-3" aria-label="Your insurance enquiries">
        {items.map((e) => {
          const active = openId === e.id;
          return (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => void open(e.id)}
                aria-pressed={active}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border bg-[hsl(var(--color-card))] p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] ${
                  active ? 'border-[hsl(var(--color-primary))] shadow-[var(--shadow-elevated)]' : 'border-[hsl(var(--color-line))] hover:border-[hsl(var(--color-primary)/0.6)]'
                }`}
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-bold">{COVER_TYPE_LABEL[e.coverType] ?? e.coverType}</span>
                    <StatusPill status={e.status} />
                    {e.followUpRequested && <span className="text-[11px] font-semibold text-[hsl(var(--color-primary-strong))]">Follow-up requested</span>}
                  </span>
                  <span className="mt-1 block truncate text-xs text-[hsl(var(--color-content-muted))]">
                    {e.referenceNo} · {vehicleLine(e) || 'Vehicle not specified'} · {formatDate(e.createdAt)}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      <section aria-live="polite" aria-label="Enquiry details" className="rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-5 sm:p-6 lg:sticky lg:top-28">
        {message && (
          <p role={message.tone === 'err' ? 'alert' : 'status'} className={`mb-4 rounded-lg border p-3 text-sm ${message.tone === 'err' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            {message.text}
          </p>
        )}
        {detailLoading ? (
          <p role="status" className="text-sm text-[hsl(var(--color-content-muted))]">Loading…</p>
        ) : !detail ? (
          <p className="text-sm text-[hsl(var(--color-content-muted))]">Select an enquiry to see its details and progress.</p>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{COVER_TYPE_LABEL[detail.coverType] ?? detail.coverType}</h2>
              <StatusPill status={detail.status} />
            </div>
            <p className="mt-1 font-mono text-xs text-[hsl(var(--color-content-muted))]">{detail.referenceNo}</p>
            <p className="mt-3 text-sm leading-6 text-[hsl(var(--color-content-muted))]">{STATUS_HINT[detail.status]}</p>

            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              {vehicleLine(detail) && <Row icon={Car} label="Vehicle" value={vehicleLine(detail)} />}
              {detail.city && <Row icon={MapPin} label="City" value={detail.city} />}
              <Row icon={CalendarDays} label="Policy expiry (you told us)" value={detail.policyExpiry ? formatDate(detail.policyExpiry) : '—'} />
              <Row icon={Phone} label="Contact by" value={detail.contactPreference.charAt(0) + detail.contactPreference.slice(1).toLowerCase()} />
            </dl>
            {detail.message && (
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[hsl(var(--color-content-muted))]">Your note</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{detail.message}</p>
              </div>
            )}

            {detail.partner && (
              <div className="mt-5 rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface-strong))] p-4">
                <p className="flex items-center gap-2 text-sm font-bold"><Building2 size={15} aria-hidden="true" /> {detail.partner.name}</p>
                {detail.partner.licenceNote && <p className="mt-1 text-xs leading-5 text-[hsl(var(--color-content-muted))]">{detail.partner.licenceNote}</p>}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <a href={`tel:${detail.partner.phone}`} className="inline-flex min-h-8 items-center gap-1.5 font-semibold hover:underline"><Phone size={12} aria-hidden="true" /> {detail.partner.phone}</a>
                  {detail.partner.email && <a href={`mailto:${detail.partner.email}`} className="inline-flex min-h-8 items-center gap-1.5 font-semibold hover:underline"><Mail size={12} aria-hidden="true" /> {detail.partner.email}</a>}
                  {detail.partner.website && <a href={detail.partner.website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1.5 font-semibold hover:underline"><ExternalLink size={12} aria-hidden="true" /> Website</a>}
                </div>
              </div>
            )}

            {detail.quote && (
              <div className="mt-4 rounded-xl border border-[hsl(var(--color-primary)/0.5)] bg-[hsl(var(--color-card))] p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[hsl(var(--color-primary-strong))]">
                  Quote from {detail.partnerName ?? 'the partner'}
                </p>
                <p className="mt-1 font-display text-3xl font-bold">{inr(detail.quote.amount)}</p>
                {detail.quote.notes && <p className="mt-1 whitespace-pre-wrap text-sm">{detail.quote.notes}</p>}
                <p className="mt-2 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
                  This figure was supplied by the partner. It is not a policy and not an offer from Progressive AutoHub — the
                  partner confirms the final premium and issues any policy.
                </p>
              </div>
            )}

            <h3 className="mt-6 text-sm font-bold uppercase tracking-[0.14em] text-[hsl(var(--color-primary-strong))]">Progress</h3>
            <ol className="mt-3 space-y-3 border-l border-[hsl(var(--color-line))] pl-5">
              {(detail.timeline ?? []).map((ev, i, all) => (
                <li key={`${ev.at}-${i}`} className="relative">
                  <span className={`absolute -left-[1.62rem] top-1 h-3 w-3 rounded-full ring-4 ring-[hsl(var(--color-card))] ${i === all.length - 1 ? 'bg-[hsl(var(--color-primary))]' : 'bg-[hsl(var(--color-line-hover))]'}`} />
                  <p className={`text-sm ${i === all.length - 1 ? 'font-bold' : ''}`}>{ev.label}</p>
                  {ev.detail && <p className="text-xs text-[hsl(var(--color-content-muted))]">“{ev.detail}”</p>}
                  <p className="text-xs text-[hsl(var(--color-content-muted))]">{formatDateTime(ev.at)}</p>
                </li>
              ))}
            </ol>

            {detail.canRespond && (
              <div className="mt-6 border-t border-[hsl(var(--color-line))] pt-4">
                <p className="text-sm font-semibold">What would you like to do with this quote?</p>
                <p className="mt-1 text-xs leading-5 text-[hsl(var(--color-content-muted))]">Accepting tells the partner you want to go ahead. It does not buy a policy.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => void act('respond', { decision: 'ACCEPT' }, 'Thanks — we’ve told the partner you’d like to go ahead.')} className="btn btn-primary btn-sm">I’d like to go ahead</button>
                  <button type="button" disabled={busy} onClick={() => void act('respond', { decision: 'DECLINE' }, 'Recorded — you’ve declined this quote.')} className="btn btn-secondary btn-sm">No thanks</button>
                </div>
              </div>
            )}

            {detail.canFollowUp && (
              <div className="mt-6 border-t border-[hsl(var(--color-line))] pt-4">
                {detail.followUpRequested ? (
                  <p className="text-sm text-[hsl(var(--color-content-muted))]">You’ve asked for a follow-up. We’ll reply here as soon as we can.</p>
                ) : (
                  <form onSubmit={sendFollowUp}>
                    <label htmlFor="ins-followup" className="text-sm font-semibold">Haven’t heard back? Ask for a follow-up</label>
                    <textarea id="ins-followup" value={followUpText} onChange={(e) => setFollowUpText(e.target.value)} maxLength={500} rows={3} placeholder="Anything we should know, e.g. a better time to call." className="mt-2 w-full rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]" />
                    <button type="submit" disabled={busy || !followUpText.trim()} className="btn btn-outline btn-sm mt-2">{busy ? 'Sending…' : 'Ask for a follow-up'}</button>
                  </form>
                )}
              </div>
            )}

            {detail.canClose && (
              <div className="mt-6 border-t border-[hsl(var(--color-line))] pt-4">
                {!confirmClose ? (
                  <button type="button" onClick={() => setConfirmClose(true)} className="inline-flex min-h-11 items-center rounded-xl border border-[hsl(var(--color-line))] px-4 text-sm font-semibold text-[hsl(var(--color-content-muted))] hover:bg-[hsl(var(--color-surface-strong))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]">
                    Close this enquiry
                  </button>
                ) : (
                  <div role="alertdialog" aria-label="Confirm closing" className="rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface-strong))] p-4">
                    <p className="text-sm font-semibold">Close this enquiry?</p>
                    <p className="mt-1 text-xs leading-5 text-[hsl(var(--color-content-muted))]">It can’t be reopened, but you can send a new one any time.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" disabled={busy} onClick={() => void act('close', undefined, 'This enquiry is closed.')} className="btn btn-primary btn-sm">{busy ? 'Closing…' : 'Yes, close it'}</button>
                      <button type="button" disabled={busy} onClick={() => setConfirmClose(false)} className="btn btn-secondary btn-sm">Keep it open</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex gap-2.5">
      <Icon size={15} className="mt-0.5 shrink-0 text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-[11px] font-bold uppercase tracking-wide text-[hsl(var(--color-content-muted))]">{label}</dt>
        <dd className="mt-0.5 break-words">{value}</dd>
      </div>
    </div>
  );
}
