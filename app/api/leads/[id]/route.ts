import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireAdminSession } from "@/app/server/authz";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "CLOSED"]).optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * The id is interpolated into the backend URL and Next.js URL-decodes route
 * params, so a raw `../something` would target a different backend endpoint.
 * Only a bare positive integer is accepted.
 */
function parseId(id: string): number | null {
  if (!/^\d+$/.test(id) || Number.parseInt(id, 10) <= 0) return null;
  return Number.parseInt(id, 10);
}

function notFoundAware(err: unknown): NextResponse {
  const res = backendErrorResponse(err);
  return res.status === 404 ? NextResponse.json({ error: "Lead not found" }, { status: 404 }) : res;
}

/** PATCH /api/leads/[id] — admin: update lead status / notes. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  const leadId = parseId((await params).id);
  if (leadId === null) {
    return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const lead = await backendFetch(`/leads/${leadId}`, {
      method: "PATCH",
      token: auth.session.token,
      body: parsed.data,
    });
    return NextResponse.json({ data: lead, source: "backend" });
  } catch (err) {
    return notFoundAware(err);
  }
}

/** DELETE /api/leads/[id] — admin: remove a lead. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  const leadId = parseId((await params).id);
  if (leadId === null) {
    return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
  }

  try {
    await backendFetch(`/leads/${leadId}`, { method: "DELETE", token: auth.session.token });
    return NextResponse.json({ ok: true, source: "backend" });
  } catch (err) {
    return notFoundAware(err);
  }
}
