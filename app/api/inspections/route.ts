import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/server/prisma";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { audit, clientIp } from "@/app/server/audit";
import { requireAdmin } from "@/app/server/authz";

const inspectionSchema = z.object({
  vehicleId: z.coerce.number().int().positive().optional(),
  customerName: z.string().min(1).max(120),
  customerPhone: z.string().min(7).max(20),
  inspectionType: z.enum(["FULL", "ACCIDENT", "ENGINE", "TRANSMISSION", "EXTERIOR", "INTERIOR", "TYRES", "ELECTRICAL", "DOCUMENTS"]),
  location: z.string().min(1).max(200),
  preferredDate: z.coerce.date(),
  preferredTime: z.string().min(1).max(20),
  notes: z.string().max(1000).optional(),
});

/** POST /api/inspections — public: request a car inspection. */
export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 5, key: "inspection" })).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  try {
    const parsed = inspectionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    const { vehicleId, ...rest } = parsed.data;
    const item = await prisma.inspectionRequest.create({
      data: { ...rest, vehicleId: vehicleId ?? null },
    });
    await audit({ action: "INSPECTION_CREATE", entity: "InspectionRequest", entityId: item.id, ipAddress: clientIp(request) });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create inspection request" }, { status: 500 });
  }
}

/** GET /api/inspections — admin: list inspection requests. */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const status = new URL(request.url).searchParams.get("status");
  const items = await prisma.inspectionRequest.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ inspections: items });
}
