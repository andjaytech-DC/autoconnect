import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireAdminSession } from "@/app/server/authz";

export const runtime = "nodejs";

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
  imageUrl: z.string().url().max(500).optional().or(z.literal("")),
  isElectric: z.boolean().optional(),
  batteryCapacityKwh: z.number().nonnegative().optional(),
  claimedRangeKm: z.number().int().nonnegative().optional(),
  chargingType: z.string().max(50).optional(),
  fastCharging: z.boolean().optional(),
  chargingTimeHours: z.number().nonnegative().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

/** Only a bare positive integer may reach the backend URL. */
function parseId(id: string): number | null {
  return /^\d+$/.test(id) && Number.parseInt(id, 10) > 0 ? Number.parseInt(id, 10) : null;
}

/** Gate + id parse shared by all three handlers. */
type Gate = { response: Response } | { id: number; token: string };

async function gate(request: Request, params: Ctx["params"]): Promise<Gate> {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return { response: auth.response };
  if (!auth.session.token) {
    return { response: NextResponse.json({ error: "Please sign in again" }, { status: 401 }) };
  }
  const id = parseId((await params).id);
  if (id === null) {
    return { response: NextResponse.json({ error: "Invalid id" }, { status: 400 }) };
  }
  return { id, token: auth.session.token };
}

/** GET /api/admin/new-cars/[id] — get new car by ID (admin). */
export async function GET(request: Request, { params }: Ctx) {
  const g = await gate(request, params);
  if ("response" in g) return g.response;
  try {
    const car = await backendFetch(`/new-cars/${g.id}`, { token: g.token });
    return NextResponse.json({ data: car });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

/** PATCH /api/admin/new-cars/[id] — update new car (admin only). */
export async function PATCH(request: Request, { params }: Ctx) {
  const g = await gate(request, params);
  if ("response" in g) return g.response;

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
  try {
    const car = await backendFetch(`/new-cars/${g.id}`, { method: "PATCH", token: g.token, body: parsed.data });
    return NextResponse.json({ data: car });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

/** DELETE /api/admin/new-cars/[id] — delete new car (admin only). */
export async function DELETE(request: Request, { params }: Ctx) {
  const g = await gate(request, params);
  if ("response" in g) return g.response;
  try {
    await backendFetch(`/new-cars/${g.id}`, { method: "DELETE", token: g.token });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
