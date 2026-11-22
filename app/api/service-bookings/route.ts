import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { enforceRateLimit } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

const TIME_SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"] as const;

const bookingSchema = z.object({
  providerId: z.coerce.number().int().positive(),
  categoryCode: z.string().regex(/^[A-Z][A-Z_]{1,30}$/, "Choose a service"),
  customerName: z.string().trim().min(1, "Enter your name").max(120),
  customerPhone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  vehicleReg: z.string().trim().max(20).optional(),
  vehicleDetails: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
  preferredDate: z.string().min(4).max(40),
  preferredTime: z.enum(TIME_SLOTS),
});

/**
 * POST /api/service-bookings — request a service. Signing in is required so the
 * booking belongs to an account (and can be tracked and cancelled). NestJS sets
 * the owner from the token; nothing in this body can name one.
 */
export async function POST(request: Request) {
  const session = await verifySession(readSessionCookie(request));
  if (!session?.token) {
    return NextResponse.json({ error: "Please sign in to book a service" }, { status: 401 });
  }
  if (!(await enforceRateLimit(request, { limit: 8, windowMs: 60_000, key: "service-booking" })).ok) {
    return NextResponse.json({ error: "Too many requests, try again shortly" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const booking = await backendFetch("/service-bookings", {
      method: "POST",
      token: session.token,
      body: parsed.data,
    });
    return NextResponse.json({ data: booking }, { status: 201 });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

/** GET /api/service-bookings — the signed-in customer's own bookings. */
export async function GET(request: Request) {
  const session = await verifySession(readSessionCookie(request));
  if (!session?.token) {
    return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  }
  try {
    const bookings = await backendFetch<unknown[]>("/service-bookings/mine", { token: session.token });
    return NextResponse.json({ bookings: bookings ?? [] });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
