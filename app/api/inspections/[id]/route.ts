import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/server/prisma";
import { audit, clientIp } from "@/app/server/audit";
import { requireAdmin } from "@/app/server/authz";

const patchSchema = z.object({
  status: z.enum(["REQUESTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().max(1000).optional(),
});

/** PATCH /api/inspections/[id] — admin: update inspection status/notes. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const item = await prisma.inspectionRequest.update({ where: { id: Number(id) }, data: parsed.data });
    await audit({ userId: auth.session.id, action: "INSPECTION_STATUS", entity: "InspectionRequest", entityId: item.id, metadata: parsed.data, ipAddress: clientIp(request) });
    return NextResponse.json({ data: item });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
