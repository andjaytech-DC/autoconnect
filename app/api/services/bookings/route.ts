import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/server/prisma";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { audit, clientIp } from "@/app/server/audit";
import { requireAdmin } from "@/app/server/authz";

const bookingSchema = z.object({
  providerId: z.coerce.number().int().positive(),
  customerName: z.string().min(1).max(120),
  customerPhone: z.string().min(7).max(20),
  service: z.string().min(1).max(60),
  vehicleReg: z.string().max(20).optional(),
  preferredDate: z.coerce.date(),
  preferredTime: z.string().min(1).max(20),
});

/** POST /api/services/bookings — public: book a service. */
export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 5, key: "service-booking" })).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  try {
    const parsed = bookingSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    const booking = await prisma.serviceBooking.create({ data: parsed.data });
    await audit({ action: "SERVICE_BOOKING", entity: "ServiceBooking", entityId: booking.id, ipAddress: clientIp(request) });
    return NextResponse.json({ data: booking }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create booking" }, { status: 500 });
  }
}

/** GET /api/services/bookings — admin: list service bookings. */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const items = await prisma.serviceBooking.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ bookings: items });
}
