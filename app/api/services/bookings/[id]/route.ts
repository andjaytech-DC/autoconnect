import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireAdminSession } from "@/app/server/authz";

export const runtime = "nodejs";

// Status moves are validated against the workflow by NestJS (it is the one source
// of truth); this only keeps junk and unknown values off the wire.
const patchSchema = z
  .object({
    status: z
      .enum([
        "REQUESTED", "CONFIRMED", "ASSIGNED", "VEHICLE_RECEIVED",
        "IN_PROGRESS", "AWAITING_APPROVAL", "COMPLETED", "CANCELLED",
      ])
      .optional(),
    providerId: z.coerce.number().int().positive().optional(),
  })
  .refine((v) => v.status !== undefined || v.providerId !== undefined, {
    message: "Provide a status or a provider",
  });

/** Only a bare positive integer may reach the backend URL. */
function parseId(id: string): number | null {
  return /^\d+$/.test(id) && Number.parseInt(id, 10) > 0 ? Number.parseInt(id, 10) : null;
}

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/services/bookings/[id] — admin: view a single booking with its provider. */
export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });
  try {
    const item = await backendFetch(`/service-bookings/${id}`, { token: auth.session.token });
    return NextResponse.json({ data: item });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

/** PATCH /api/services/bookings/[id] — admin: advance the workflow and/or assign the provider. */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const item = await backendFetch(`/service-bookings/${id}`, {
      method: "PATCH",
      token: auth.session.token,
      body: parsed.data,
    });
    return NextResponse.json({ data: item });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
