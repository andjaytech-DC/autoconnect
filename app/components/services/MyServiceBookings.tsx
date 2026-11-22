'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Car, Check, ChevronRight, LogIn, MapPin, Wrench } from 'lucide-react';

import {
  STATUS_HINT,
  formatDate,
  formatDateTime,
  statusLabel,
  type ServiceBookingDto,
} from '@/app/lib/service-booking';

/** Colour is never the only signal: every badge also carries its text label. */
const TONE: Record<string, string> = {
  REQUESTED: 'border-amber-300 bg-amber-50 text-amber-900',
  CONFIRMED: 'border-sky-300 bg-sky-50 text-sky-900',
  ASSIGNED: 'border-sky-300 bg-sky-50 text-sky-900',
  VEHICLE_RECEIVED: 'border-indigo-300 bg-indigo-50 text-indigo-900',
  IN_PROGRESS: 'border-indigo-300 bg-indigo-50 text-indigo-900',
  AWAITING_APPROVAL: 'border-orange-300 bg-orange-50 text-orange-900',
  COMPLETED: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  CANCELLED: 'border-slate-300 bg-slate-100 text-slate-700',
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${TONE[status] ?? TONE.CANCELLED}`}>
      {statusLabel(status)}
    </span>
  );
}

export default function MyServiceBookings() {
  const [state, setState] = useState<'loading' | 'anon' | 'error' | 'ready'>('loading');
  const [bookings, setBookings] = useState<ServiceBookingDto[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ServiceBookingDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/service-bookings');
      if (res.status === 401) return setState('anon');
      if (!res.ok) return setState('error');
      const d = await res.json();
      setBookings(d.bookings ?? []);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    void load();
  }, [load]);

  const open = useCallback(async (id: number) => {
    setOpenId(id);
    setConfirmCancel(false);
    setMessage(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/service-bookings/${id}`);
      const d = await res.json().catch(() => ({}));
      setDetail(res.ok ? d.data : null);
      if (!res.ok) setMessage({ tone: 'err', text: d.error ?? 'Could not load this booking.' });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  async function cancel() {
    if (!detail) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/service-bookings/${detail.id}/cancel`, { method: 'POST' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? 'Could not cancel this booking.');
      setMessage({ tone: 'ok', text: 'Your booking has been cancelled.' });
      setConfirmCancel(false);
      await Promise.all([load(), open(detail.id)]);
      setMessage({ tone: 'ok', text: 'Your booking has been cancelled.' });
    } catch (err) {
      setMessage({ tone: 'err', text: err instanceof Error ? err.message : 'Could not cancel this booking.' });
    } finally {
      setBusy(false);
    }
  }

  if (state === 'loading') {
    return <p role="status" className="text-sm text-[hsl(var(--color-content-muted))]">Loading your bookings…</p>;
  }
  if (state === 'anon') {
    return (
      <div className="rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-8 text-center">
        <LogIn size={30} className="mx-auto text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-bold">Sign in to see your bookings</h2>
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
        We couldn’t load your bookings right now.{' '}
        <button onClick={() => { setState('loading'); void load(); }} className="font-semibold underline">Try again</button>
      </p>
    );
  }
  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-10 text-center">
        <Wrench size={30} className="mx-auto text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-bold">No service bookings yet</h2>
        <p className="mt-1 text-sm text-[hsl(var(--color-content-muted))]">When you request a service, you’ll follow it here.</p>
        <Link href="/services" className="btn btn-primary mt-5">Browse services</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-start">
      <ul className="space-y-3" aria-label="Your service bookings">
        {bookings.map((b) => {
          const active = openId === b.id;
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => void open(b.id)}
                aria-pressed={active}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border bg-[hsl(var(--color-card))] p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] ${
                  active ? 'border-[hsl(var(--color-primary))] shadow-[var(--shadow-elevated)]' : 'border-[hsl(var(--color-line))] hover:border-[hsl(var(--color-primary)/0.6)]'
                }`}
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-bold">{b.service}</span>
                    <StatusPill status={b.status} />
                  </span>
                  <span className="mt-1 block truncate text-xs text-[hsl(var(--color-content-muted))]">
                    {b.provider?.name ?? 'Provider'} · {formatDate(b.preferredDate)} · {b.preferredTime}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      <section aria-live="polite" aria-label="Booking details" className="rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-5 sm:p-6 lg:sticky lg:top-28">
        {message && (
          <p role={message.tone === 'err' ? 'alert' : 'status'} className={`mb-4 rounded-lg border p-3 text-sm ${message.tone === 'err' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            {message.text}
          </p>
        )}
        {detailLoading ? (
          <p role="status" className="text-sm text-[hsl(var(--color-content-muted))]">Loading…</p>
        ) : !detail ? (
          <p className="text-sm text-[hsl(var(--color-content-muted))]">Select a booking to see its details and progress.</p>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{detail.service}</h2>
              <StatusPill status={detail.status} />
            </div>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--color-content-muted))]">{STATUS_HINT[detail.status]}</p>

            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <Row icon={MapPin} label="Provider" value={detail.provider ? `${detail.provider.name}, ${detail.provider.city}` : '—'} />
              <Row icon={CalendarDays} label="Preferred" value={`${formatDate(detail.preferredDate)} · ${detail.preferredTime}`} />
              {(detail.vehicleReg || detail.vehicleDetails) && (
                <Row icon={Car} label="Vehicle" value={[detail.vehicleDetails, detail.vehicleReg].filter(Boolean).join(' · ')} />
              )}
              {detail.provider?.phone && <Row icon={Wrench} label="Provider phone" value={detail.provider.phone} />}
            </dl>
            {detail.notes && (
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[hsl(var(--color-content-muted))]">Your notes</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{detail.notes}</p>
              </div>
            )}

            <h3 className="mt-6 text-sm font-bold uppercase tracking-[0.14em] text-[hsl(var(--color-primary-strong))]">Progress</h3>
            <ol className="mt-3 space-y-3 border-l border-[hsl(var(--color-line))] pl-5">
              {(detail.timeline ?? []).map((e, i, all) => (
                <li key={`${e.at}-${i}`} className="relative">
                  <span className={`absolute -left-[1.62rem] top-1 flex h-3 w-3 items-center justify-center rounded-full ring-4 ring-[hsl(var(--color-card))] ${i === all.length - 1 ? 'bg-[hsl(var(--color-primary))]' : 'bg-[hsl(var(--color-line-hover))]'}`}>
                    {i === all.length - 1 && <Check size={8} className="text-[hsl(var(--color-primary-foreground))]" aria-hidden="true" />}
                  </span>
                  <p className={`text-sm ${i === all.length - 1 ? 'font-bold' : ''}`}>{e.label}</p>
                  <p className="text-xs text-[hsl(var(--color-content-muted))]">{formatDateTime(e.at)}</p>
                </li>
              ))}
            </ol>

            {detail.canCancel && (
              <div className="mt-6 border-t border-[hsl(var(--color-line))] pt-4">
                {!confirmCancel ? (
                  <button type="button" onClick={() => setConfirmCancel(true)} className="inline-flex min-h-11 items-center rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]">
                    Cancel this booking
                  </button>
                ) : (
                  <div role="alertdialog" aria-label="Confirm cancellation" className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-900">Cancel this booking?</p>
                    <p className="mt-1 text-xs leading-5 text-red-800">You can make a new request any time.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void cancel()} disabled={busy} className="inline-flex min-h-11 items-center rounded-xl bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]">
                        {busy ? 'Cancelling…' : 'Yes, cancel it'}
                      </button>
                      <button type="button" onClick={() => setConfirmCancel(false)} disabled={busy} className="btn btn-secondary">Keep it</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {!detail.canCancel && detail.status !== 'COMPLETED' && detail.status !== 'CANCELLED' && (
              <p className="mt-6 border-t border-[hsl(var(--color-line))] pt-4 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
                The provider has your vehicle, so this can no longer be cancelled online. Please contact them directly.
              </p>
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
