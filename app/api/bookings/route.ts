import { NextResponse } from "next/server";
import { z } from "zod";

import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { backendFetch, BackendError } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { mapBooking, type BackendBooking } from "@/app/lib/account-mappers";

export const runtime = "nodejs";

const createSchema = z.object({
  carId: z.number().int().positive(),
  date: z.string().min(10).max(10),
  slot: z.string().min(2).max(20),
});

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

async function authenticate(
  request: Request,
): Promise<{ id: string; token: string } | NextResponse> {
  const session = await verifySession(readSessionCookie(request));
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  return { id: session.id, token: session.token };
}

export async function GET(request: Request) {
  const user = await authenticate(request);
  if (user instanceof NextResponse) return user;

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
    return backendErrorResponse(err);
  }
}

export async function POST(request: Request) {
  const user = await authenticate(request);
  if (user instanceof NextResponse) return user;

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

  try {
    // The backend needs the vehicle's dealerId — look it up from the vehicle.
    let vehicle: { dealer?: { id: number } | null } | null;
    try {
      vehicle = await backendFetch<{ dealer?: { id: number } | null }>(
        `/vehicles/${parsed.data.carId}`,
        { token: user.token },
      );
    } catch (err) {
      if (err instanceof BackendError && err.status === 404) {
        return NextResponse.json({ error: "Unknown vehicle" }, { status: 400 });
      }
      throw err;
    }
    if (!vehicle?.dealer?.id) {
      return NextResponse.json({ error: "Unknown vehicle" }, { status: 400 });
    }

    const booking = await backendFetch<BackendBooking>("/bookings", {
      method: "POST",
      token: user.token,
      body: {
        vehicleId: parsed.data.carId,
        // For a customer the backend ignores this and uses the token's user.
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
    return backendErrorResponse(err);
  }
}

export async function PATCH(request: Request) {
  const user = await authenticate(request);
  if (user instanceof NextResponse) return user;

  let body: { bookingId?: unknown };
  try {
    body = (await request.json()) as { bookingId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.bookingId !== "string" || !body.bookingId) {
    return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
  }
  if (!/^\d+$/.test(body.bookingId)) {
    return NextResponse.json({ error: "Invalid bookingId" }, { status: 400 });
  }

  try {
    const booking = await backendFetch<BackendBooking>(
      `/bookings/${Number(body.bookingId)}/cancel`,
      { method: "PATCH", token: user.token },
    );
    return NextResponse.json({ booking: mapBooking(booking), source: "backend" });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
