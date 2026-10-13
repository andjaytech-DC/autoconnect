import { NextResponse } from "next/server";
import { z } from "zod";

import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";
import {
  cancelBooking,
  createBooking,
  InvalidBookingError,
  listBookings,
} from "@/app/server/bookings";

export const runtime = "nodejs";

const createSchema = z.object({
  carId: z.number().int().positive(),
  date: z.string().min(10).max(10),
  slot: z.string().min(2).max(20),
});

interface BackendBooking {
  id: number;
  bookingDate: string;
  status: string;
  notes?: string | null;
  vehicleId: number;
  customerId: number;
  dealerId: number;
  createdAt: string;
  vehicle?: { title?: string } | null;
}

/** "10:30 AM" → "2025-01-15T10:30:00.000Z" for the backend bookingDate. */
function slotToIso(date: string, slot: string): string {
  const m = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  let hh = parseInt(m?.[1] ?? "10", 10);
  const mm = m?.[2] ?? "00";
  const ap = (m?.[3] ?? "AM").toUpperCase();
  if (ap === "PM" && hh < 12) hh += 12;
  if (ap === "AM" && hh === 12) hh = 0;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date}T${pad(hh)}:${mm}:00.000Z`;
}

/** ISO datetime → "10:30 AM" for the UI slot display. */
function isoToSlot(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  let hh = d.getHours();
  const mm = d.getMinutes();
  const ap = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${ap}`;
}

/** Map a backend booking row to the UI booking shape. */
function mapBooking(b: BackendBooking) {
  return {
    id: String(b.id),
    carId: b.vehicleId,
    date: (b.bookingDate ?? "").slice(0, 10),
    slot: isoToSlot(b.bookingDate),
    status: b.status,
    createdAt: b.createdAt,
    vehicleName: b.vehicle?.title ?? null,
  };
}

async function userId(request: Request): Promise<{
  id: string;
  token?: string;
} | null> {
  const session = await verifySession(readSessionCookie(request));
  if (!session) return null;
  return { id: session.id, token: session.token };
}

export async function GET(request: Request) {
  const user = await userId(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 1) NestJS backend (authoritative)
  if (user.token) {
    try {
      const bookings = await backendFetch<BackendBooking[]>(
        `/bookings/user/${user.id}`,
        { token: user.token },
      );
      return NextResponse.json({
        bookings: (bookings ?? []).map(mapBooking),
        source: "backend",
      });
    } catch (err) {
      if (!isBackendUnreachable(err) && err instanceof BackendError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
    }
  }

  // 2) Local fallback
  return NextResponse.json({
    bookings: await listBookings(user.id),
    source: "local",
  });
}

export async function POST(request: Request) {
  const user = await userId(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  // 1) NestJS backend (authoritative)
  if (user.token) {
    try {
      // The backend needs the vehicle's dealerId — look it up from the vehicle.
      const vehicle = await backendFetch<{ dealer?: { id: number } | null }>(
        `/vehicles/${parsed.data.carId}`,
        { token: user.token },
      );
      if (!vehicle?.dealer?.id) {
        return NextResponse.json(
          { error: "Unknown vehicle" },
          { status: 400 },
        );
      }

      const booking = await backendFetch<BackendBooking>("/bookings", {
        method: "POST",
        token: user.token,
        body: {
          vehicleId: parsed.data.carId,
          customerId: Number(user.id),
          dealerId: vehicle.dealer.id,
          bookingDate: slotToIso(parsed.data.date, parsed.data.slot),
          notes: `Time slot: ${parsed.data.slot}`,
        },
      });
      return NextResponse.json(
        { booking: mapBooking(booking), source: "backend" },
        { status: 201 },
      );
    } catch (err) {
      if (!isBackendUnreachable(err) && err instanceof BackendError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
    }
  }

  // 2) Local fallback
  try {
    const booking = await createBooking(user.id, parsed.data);
    return NextResponse.json(
      { booking, source: "local" },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof InvalidBookingError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[bookings/create]", err);
    return NextResponse.json({ error: "Could not create booking" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await userId(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { bookingId?: unknown };
  try {
    body = (await request.json()) as { bookingId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.bookingId !== "string" || !body.bookingId) {
    return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
  }

  // 1) NestJS backend — only numeric ids exist there. Customers cancel via the
  // bookings:update permission; if the backend rejects it, fall back to local.
  const numericId = /^\d+$/.test(body.bookingId) ? Number(body.bookingId) : null;
  if (user.token && numericId) {
    try {
      const booking = await backendFetch<BackendBooking>(
        `/bookings/${numericId}`,
        {
          method: "PATCH",
          token: user.token,
          body: { status: "CANCELLED" },
        },
      );
      return NextResponse.json({ booking: mapBooking(booking), source: "backend" });
    } catch (err) {
      if (!isBackendUnreachable(err) && err instanceof BackendError) {
        // 403 → the backend won't let this user cancel; surface it.
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      // Unreachable → local fallback below.
    }
  }

  // 2) Local fallback
  const booking = await cancelBooking(user.id, body.bookingId);
  if (!booking) {
    return NextResponse.json(
      { error: "Booking not found or already cancelled/completed" },
      { status: 404 },
    );
  }
  return NextResponse.json({ booking, source: "local" });
}