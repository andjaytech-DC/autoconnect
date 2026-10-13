import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/server/prisma";
import { requireAdmin } from "@/app/server/authz";

const patchSchema = z.object({
  status: z.enum(["PENDING", "REVIEWING", "APPROVED", "REJECTED", "SOLD"]).optional(),
});

/** GET /api/sell-listings/[id] — admin: view a single listing. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(_request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const item = await prisma.sellerListing.findUnique({ where: { id: Number(id) } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: item });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

/** PATCH /api/sell-listings/[id] — admin: update listing status. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const item = await prisma.sellerListing.update({ where: { id: Number(id) }, data: parsed.data });
    return NextResponse.json({ data: item });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
