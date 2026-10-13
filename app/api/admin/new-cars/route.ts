import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/server/prisma";
import { audit, clientIp } from "@/app/server/audit";
import { requireAdmin } from "@/app/server/authz";

const createSchema = z.object({
  brandName: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  variant: z.string().max(100).optional(),
  slug: z.string().max(200).optional(),
  exShowroomPrice: z.number().int().nonnegative(),
  onRoadPrice: z.number().int().nonnegative().optional(),
  fuel: z.string().min(1).max(20),
  transmission: z.string().min(1).max(20),
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

/** GET /api/admin/new-cars — list new cars (admin). */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const brand = searchParams.get('brand');
  const electric = searchParams.get('electric');

  // Structural type rather than Prisma.NewCarWhereInput: this app's local
  // Prisma client predates that namespace export, and the shape is all we need.
  const where: {
    brandName?: { contains: string; mode: "insensitive" };
    isElectric?: boolean;
  } = {};
  if (brand) where.brandName = { contains: brand, mode: 'insensitive' };
  if (electric !== null) where.isElectric = electric === 'true';

  try {
    const cars = await prisma.newCar.findMany({
      where,
      orderBy: [{ brandName: 'asc' }, { model: 'asc' }],
    });
    return NextResponse.json({ cars });
  } catch (error) {
    console.error("New cars list error:", error);
    return NextResponse.json({ error: "Unable to fetch new cars" }, { status: 500 });
  }
}

/** POST /api/admin/new-cars — create a new car (admin only). */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  }

  const data = parsed.data;
  const baseSlug = `${data.brandName} ${data.model} ${data.variant || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const slug = data.slug || baseSlug;

  const existing = await prisma.newCar.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "A new car with this slug already exists." }, { status: 409 });
  }

  try {
    const newCar = await prisma.newCar.create({
      data: {
        ...data,
        variant: data.variant || '',
        slug,
        features: data.features || [],
        imageUrl: data.imageUrl || null,
        fuel: data.fuel as never,
        transmission: data.transmission as never,
      },
    });

    await audit({
      userId: auth.session.id,
      action: "NEW_CAR_CREATE",
      entity: "NewCar",
      entityId: newCar.id,
      ipAddress: clientIp(request),
    });

    return NextResponse.json({ data: newCar }, { status: 201 });
  } catch (error) {
    console.error("New car create error:", error);
    return NextResponse.json({ error: "Unable to create new car" }, { status: 500 });
  }
}