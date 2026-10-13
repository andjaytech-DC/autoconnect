"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Loader2, Plus } from "lucide-react";
import { getCarRef, loadCarRefs } from "@/app/lib/account";
import { cn } from "@/app/lib/utils";

interface Booking {
  id: string;
  carId: number;
  date: string;
  slot: string;
  status: "CONFIRMED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
}

/** A real, listed vehicle offered in the test-drive picker. */
interface VehicleOption {
  id: number;
  name: string;
  price: number;
  dealerCity?: string | null;
}

const SLOTS = ["10:30 AM", "12:00 PM", "02:00 PM", "04:00 PM", "06:00 PM"];

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  // Real, bookable inventory. Previously this listed a static fixture, so a
  // test drive could be booked against a car that does not exist.
  const [available, setAvailable] = useState<VehicleOption[]>([]);
  const [carId, setCarId] = useState<number>(0);
  const [date, setDate] = useState(tomorrowIso());
  const [slot, setSlot] = useState(SLOTS[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/vehicles?limit=50", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          vehicles?: {
            id: number;
            name: string;
            price: number;
            dealerCity?: string | null;
          }[];
        };
        if (!alive) return;
        const list = data.vehicles ?? [];
        setAvailable(list);
        if (list.length > 0) setCarId((cur) => cur || list[0].id);
      } catch {
        // Leave the picker empty; the form blocks submission without a car.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/bookings", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { bookings: Booking[] };
        setBookings(data.bookings);
        // Resolve real vehicle details rather than a static car fixture.
        await loadCarRefs(data.bookings.map((b) => b.carId));
        setBookings((cur) => [...cur]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createBooking(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!carId) {
      setError("Choose a car to book a test drive for.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId, date, slot }),
      });
      const data = (await res.json()) as { booking?: Booking; error?: string };
      if (!res.ok || !data.booking) {
        setError(data.error ?? "Could not create booking.");
        return;
      }
      setBookings((cur) => [data.booking!, ...cur]);
      setShowForm(false);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(bookingId: string) {
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { booking?: Booking };
        if (data.booking) {
          setBookings((cur) =>
            cur.map((b) => (b.id === bookingId ? data.booking! : b)),
          );
        }
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">
      <main className="flex-1">
    <div className="mx-auto max-w-5xl px-6 py-12 lg:px-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFC700] to-yellow-500 text-[#15130a]">
            <CalendarCheck size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-content">Test Drive Bookings</h1>
            <p className="text-sm text-content-muted">Book a test drive for a vehicle you&apos;re interested in.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFC700] to-yellow-500 px-5 py-2.5 text-sm font-bold text-[#15130a] shadow-lg shadow-amber-500/25 hover:shadow-xl transition-all"
        >
          <Plus size={16} aria-hidden="true" />
          New Booking
        </button>
      </div>
{showForm && (
        <form
          onSubmit={createBooking}
          className="mb-8 grid gap-4 rounded-2xl border border-line bg-card p-6 sm:grid-cols-4"
          aria-label="New test drive booking"
        >
          <div className="sm:col-span-2">
            <label htmlFor="b-car" className="mb-1 block text-xs font-bold uppercase tracking-wider text-content-muted">
              Vehicle
            </label>
            <select
              id="b-car"
              value={carId}
              onChange={(e) => setCarId(Number(e.target.value))}
              className="input-field"
            >
              {available.length === 0 ? (
                <option value={0} disabled>
                  No cars available
                </option>
              ) : (
                available.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — ₹{c.price.toLocaleString("en-IN")}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label htmlFor="b-date" className="mb-1 block text-xs font-bold uppercase tracking-wider text-content-muted">
              Date
            </label>
            <input
              id="b-date"
              type="date"
              value={date}
              min={tomorrowIso()}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="b-slot" className="mb-1 block text-xs font-bold uppercase tracking-wider text-content-muted">
              Slot
            </label>
            <select
              id="b-slot"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className="input-field"
            >
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FFC700] px-5 py-2.5 text-sm font-bold text-[#15130a] hover:brightness-110 disabled:opacity-60 transition-colors"
            >
              {busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
              Confirm Booking
            </button>
            {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-content-muted">
          <Loader2 size={22} className="animate-spin" aria-hidden="true" />
          <span className="ml-2">Loading bookings…</span>
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card py-20 text-center">
          <CalendarCheck size={40} className="mx-auto text-content-faint" aria-hidden="true" />
          <p className="mt-4 font-semibold text-content">No test drives booked</p>
          <p className="mt-1 text-sm text-content-muted">Book a test drive to get started.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => {
            const car = getCarRef(b.carId);
            const statusStyle =
              b.status === "CONFIRMED"
                ? "bg-emerald-500/10 text-emerald-400"
                : b.status === "COMPLETED"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-red-500/10 text-red-400";
            return (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-card p-5"
              >
                <div>
                  <p className="font-bold text-content">{car.name}</p>
                  <p className="mt-0.5 text-sm text-content-muted">
                    {car.brand} · {car.year > 0 ? car.year : "—"}
                  </p>
                  <p className="mt-1 text-xs text-content-muted">
                    {b.date} at {b.slot} · booked {new Date(b.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusStyle)}>
                    {b.status}
                  </span>
                  {b.status === "CONFIRMED" && (
                    <button
                      type="button"
                      onClick={() => cancel(b.id)}
                      className="text-sm font-bold text-red-400 hover:text-red-400"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-8 text-xs text-content-muted">
        Want to browse more cars first?{" "}
        <Link href="/cars" className="font-semibold text-[#FFC700]">
          Browse the showroom
        </Link>
        .
      </p>
      </div>
      </main>
    </div>
  );
}
