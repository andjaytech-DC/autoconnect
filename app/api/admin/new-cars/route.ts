import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireAdminSession } from "@/app/server/authz";

export const runtime = "nodejs";

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
  imageUrl: z.string().url().max(500).optional().or(z.literal("")),
  isElectric: z.boolean().optional(),
  batteryCapacityKwh: z.number().nonnegative().optional(),
  claimedRangeKm: z.number().int().nonnegative().optional(),
  chargingType: z.string().max(50).optional(),
  fastCharging: z.boolean().optional(),
  chargingTimeHours: z.number().nonnegative().optional(),
});

/** GET /api/admin/new-cars — list new cars (admin). */
export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams();
  const brand = searchParams.get("brand");
  const electric = searchParams.get("electric");
  if (brand) query.set("brand", brand);
  if (electric === "true" || electric === "false") query.set("electric", electric);

  try {
    const data = await backendFetch<{ cars: unknown[] }>(
      `/new-cars${query.toString() ? `?${query}` : ""}`,
      { token: auth.session.token },
    );
    return NextResponse.json({ cars: data?.cars ?? [] });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

/** POST /api/admin/new-cars — create a new car (admin only). */
export async function POST(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }

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

  try {
    const created = await backendFetch("/new-cars", {
      method: "POST",
      token: auth.session.token,
      body: parsed.data,
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
