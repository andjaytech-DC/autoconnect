"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Loader2 } from "lucide-react";

interface Reservation {
  id: number;
  vehicleId: number;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED";
  expiresAt: string;
}

/**
 * Hold a vehicle for 48 hours. Reserving needs a signed-in account; the server
 * decides the owner, the deadline and whether the car is still available.
 */
export default function ReserveVehicle({
  vehicleId,
  available,
}: {
  vehicleId: number;
  available: boolean;
}) {
  const [mine, setMine] = useState<Reservation | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/reservations", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          if (alive) setSignedOut(true);
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as { reservations: Reservation[] };
        const active = data.reservations.find(
          (r) => r.vehicleId === vehicleId && r.status === "ACTIVE",
        );
        if (alive) setMine(active ?? null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [vehicleId]);

  async function reserve() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reservation?: Reservation;
        error?: string;
      };
      if (res.status === 401) setSignedOut(true);
      else if (!res.ok) setMessage(data.error ?? "Could not reserve this vehicle.");
      else setMine(data.reservation ?? null);
    } catch {
      setMessage("Could not reserve this vehicle.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!mine) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/reservations?id=${mine.id}`, { method: "DELETE" });
      if (res.ok) setMine(null);
      else setMessage("Could not cancel the reservation.");
    } catch {
      setMessage("Could not cancel the reservation.");
    } finally {
      setBusy(false);
    }
  }

  if (!mine && !available) return null;

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center gap-2 font-bold text-content">
        <CalendarClock size={18} aria-hidden="true" /> Reserve this car
      </div>
      {mine ? (
        <>
          <p className="mt-2 text-sm text-content-muted">
            Held for you until {new Date(mine.expiresAt).toLocaleString("en-IN")}.
          </p>
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="mt-3 rounded-full border border-line px-4 py-2 text-sm font-semibold text-content disabled:opacity-60"
          >
            {busy ? "Cancelling…" : "Cancel reservation"}
          </button>
        </>
      ) : signedOut ? (
        <p className="mt-2 text-sm text-content-muted">
          <Link href="/login" className="font-semibold text-primary-strong">
            Sign in
          </Link>{" "}
          to hold this car for 48 hours.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-content-muted">
            Hold this car for 48 hours while you arrange a visit or finance. No payment needed.
          </p>
          <button
            type="button"
            onClick={reserve}
            disabled={busy}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            Reserve for 48 hours
          </button>
        </>
      )}
      {message && (
        <p role="alert" className="mt-2 text-sm text-warning">
          {message}
        </p>
      )}
    </div>
  );
}
