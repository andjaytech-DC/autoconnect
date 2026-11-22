import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireAdminSession } from "@/app/server/authz";

export const runtime = "nodejs";

// Workflow moves are validated against the lifecycle by NestJS (the one source of
// truth); this only keeps junk and unknown values off the wire.
const patchSchema = z
  .object({
    status: z
      .enum([
        "SUBMITTED", "UNDER_REVIEW", "PARTNER_ASSIGNED", "QUOTE_RECEIVED",
        "CUSTOMER_CONTACTED", "ACCEPTED", "DECLINED", "CLOSED",
      ])
      .optional(),
    partnerId: z.coerce.number().int().positive().optional(),
    quoteAmount: z.coerce.number().positive().max(10_000_000).optional(),
    quoteNotes: z.string().trim().max(1000).optional(),
  })
  .refine(
    (v) => v.status !== undefined || v.partnerId !== undefined || v.quoteAmount !== undefined || v.quoteNotes !== undefined,
    { message: "Provide a status, a partner or quote details" },
  );

/** Only a bare positive integer may reach the backend URL. */
function parseId(id: string): number | null {
  return /^\d+$/.test(id) && Number.parseInt(id, 10) > 0 ? Number.parseInt(id, 10) : null;
}

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/insurance/[id] — admin: one enquiry with partner, history and internal notes. */
export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid enquiry id" }, { status: 400 });
  try {
    const item = await backendFetch(`/insurance-enquiries/${id}`, { token: auth.session.token });
    return NextResponse.json({ data: item });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

/** PATCH /api/insurance/[id] — admin: advance the workflow, assign a partner, record a partner quote. */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid enquiry id" }, { status: 400 });

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
    const item = await backendFetch(`/insurance-enquiries/${id}`, {
      method: "PATCH",
      token: auth.session.token,
      body: parsed.data,
    });
    return NextResponse.json({ data: item });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
