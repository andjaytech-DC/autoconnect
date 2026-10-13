import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/server/prisma";
import { requireAdmin } from "@/app/server/authz";

const patchSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
});

/** GET /api/services/bookings/[id] — admin: view a single booking. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(_request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
// ServiceBooking has only a `providerId` scalar — there is no Prisma relation
      // to ServiceProvider on this table, so the provider is fetched separately.
      const item = await prisma.serviceBooking.findUnique({
        where: { id: Number(id) },
      });
if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const provider = item.providerId
        ? await prisma.serviceProvider.findUnique({
            where: { id: item.providerId },
            select: { id: true, name: true, phone: true },
          })
        : null;
      return NextResponse.json({ data: { ...item, provider } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

/** PATCH /api/services/bookings/[id] — admin: update booking status. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const item = await prisma.serviceBooking.update({ where: { id: Number(id) }, data: parsed.data });
    return NextResponse.json({ data: item });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
