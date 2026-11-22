import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { requireAdminSession } from "@/app/server/authz";

export const runtime = "nodejs";

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

/** POST /api/inspections — public: request a car inspection. NestJS owns the record. */
export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 5, key: "inspection" })).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = inspectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  }
  try {
    const item = await backendFetch("/inspections", {
      method: "POST",
      body: { ...parsed.data, preferredDate: parsed.data.preferredDate.toISOString() },
    });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

/** GET /api/inspections — admin: list inspection requests. */
export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  const status = new URL(request.url).searchParams.get("status");
  try {
    const items = await backendFetch<unknown[]>(
      `/inspections${status ? `?status=${encodeURIComponent(status)}` : ""}`,
      { token: auth.session.token },
    );
    return NextResponse.json({ inspections: items ?? [] });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
