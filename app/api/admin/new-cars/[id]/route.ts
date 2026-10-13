import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/server/prisma";
import { audit, clientIp } from "@/app/server/audit";
import { requireAdmin } from "@/app/server/authz";

const updateSchema = z.object({
  brandName: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(100).optional(),
  variant: z.string().max(100).optional(),
  slug: z.string().max(200).optional(),
  exShowroomPrice: z.number().int().nonnegative().optional(),
  onRoadPrice: z.number().int().nonnegative().optional(),
  fuel: z.string().min(1).max(20).optional(),
  transmission: z.string().min(1).max(20).optional(),
  mileageKmpl: z.number().nonnegative().optional(),
  engine: z.string().max(200).optional(),
  bodyType: z.string().max(50).optional(),
  features: z.array(z.string()).optional(),
  imageUrl: z.string().url().max(500).optional().or(z.literal('')),
  isElectric: z.boolean().optional(),
  batteryCapacityKwh: z.number().nonnegative().optional(),
  claimedRangeKm: z.number().int().nonnegative().optional(),
  chargingType: z.string().max(50).optional(),
  fastCharging: z.boolean().optional(),
  chargingTimeHours: z.number().nonnegative().optional(),
});

/** GET /api/admin/new-cars/[id] — get new car by ID (admin). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(_request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const newCarId = Number(id);
  if (!Number.isInteger(newCarId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const newCar = await prisma.newCar.findUnique({ where: { id: newCarId } });
    if (!newCar) {
      return NextResponse.json({ error: "New car not found" }, { status: 404 });
    }
    return NextResponse.json({ data: newCar });
  } catch (error) {
    console.error("New car fetch error:", error);
    return NextResponse.json({ error: "Unable to fetch new car" }, { status: 500 });
  }
}

/** PATCH /api/admin/new-cars/[id] — update new car (admin only). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const newCarId = Number(id);
  if (!Number.isInteger(newCarId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  }

  const data = parsed.data;

  // Check if slug is being changed and if it conflicts
  if (data.slug) {
    const existing = await prisma.newCar.findUnique({ where: { slug: data.slug } });
    if (existing && existing.id !== newCarId) {
      return NextResponse.json({ error: "A new car with this slug already exists." }, { status: 409 });
    }
  }

  try {
    const before = await prisma.newCar.findUnique({ where: { id: newCarId } });
    if (!before) {
      return NextResponse.json({ error: "New car not found" }, { status: 404 });
    }

    const newCar = await prisma.newCar.update({
      where: { id: newCarId },
      data: {
        ...data,
        features: data.features ?? before.features,
        imageUrl: data.imageUrl ?? before.imageUrl,
        fuel: data.fuel as never,
        transmission: data.transmission as never,
      },
    });

    await audit({
      userId: auth.session.id,
      action: "NEW_CAR_UPDATE",
      entity: "NewCar",
      entityId: newCarId,
      metadata: { changedFields: Object.keys(data) },
      ipAddress: clientIp(request),
    });

    return NextResponse.json({ data: newCar });
  } catch (error) {
    console.error("New car update error:", error);
    return NextResponse.json({ error: "Unable to update new car" }, { status: 500 });
  }
}

/** DELETE /api/admin/new-cars/[id] — delete new car (admin only). */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const newCarId = Number(id);
  if (!Number.isInteger(newCarId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const newCar = await prisma.newCar.findUnique({ where: { id: newCarId } });
    if (!newCar) {
      return NextResponse.json({ error: "New car not found" }, { status: 404 });
    }

    await prisma.newCar.delete({ where: { id: newCarId } });

    await audit({
      userId: auth.session.id,
      action: "NEW_CAR_DELETE",
      entity: "NewCar",
      entityId: newCarId,
      ipAddress: clientIp(request),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("New car delete error:", error);
    return NextResponse.json({ error: "Unable to delete new car" }, { status: 500 });
  }
}