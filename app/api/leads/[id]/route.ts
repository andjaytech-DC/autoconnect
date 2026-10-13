import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/server/prisma";
import { requireAdminSession } from "@/app/server/authz";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "CLOSED"]).optional(),
  notes: z.string().max(2000).optional(),
});

/** PATCH /api/leads/[id] — admin: update lead status / notes (backend first). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  const session = auth.session;
  const { id } = await params;
  // The id is interpolated into the backend URL, and Next.js URL-decodes route
  // params, so a raw `../something` would target an entirely different backend
  // endpoint. Only a bare positive integer is accepted.
  if (!/^\d+$/.test(id) || Number.parseInt(id, 10) <= 0) {
    return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
  }
  const leadId = Number.parseInt(id, 10);

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

  // 1) NestJS backend (authoritative)
  if (session.token) {
    try {
      const lead = await backendFetch(`/leads/${leadId}`, {
        method: "PATCH",
        token: session.token,
        body: parsed.data,
      });
      return NextResponse.json({ data: lead, source: "backend" });
    } catch (err) {
      if (!isBackendUnreachable(err) && err instanceof BackendError) {
        return NextResponse.json(
          { error: err.status === 404 ? "Lead not found" : err.message },
          { status: err.status },
        );
      }
    }
  }

  // 2) Local fallback
  try {
    const lead = await prisma.lead.update({
      where: { id: Number(id) },
      data: parsed.data,
    });
    return NextResponse.json({ data: lead, source: "local" });
  } catch {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
}

/** DELETE /api/leads/[id] — admin: remove a lead (backend first). */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  const session = auth.session;
  const { id } = await params;
  // See the PATCH handler: the id reaches a backend URL, so it must be a bare
  // positive integer.
  if (!/^\d+$/.test(id) || Number.parseInt(id, 10) <= 0) {
    return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
  }
  const leadId = Number.parseInt(id, 10);

  // 1) NestJS backend (authoritative)
  if (session.token) {
    try {
      await backendFetch(`/leads/${leadId}`, {
        method: "DELETE",
        token: session.token,
      });
      return NextResponse.json({ ok: true, source: "backend" });
    } catch (err) {
      if (!isBackendUnreachable(err) && err instanceof BackendError) {
        return NextResponse.json(
          { error: err.status === 404 ? "Lead not found" : err.message },
          { status: err.status },
        );
      }
    }
  }

  // 2) Local fallback
  try {
    await prisma.lead.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true, source: "local" });
  } catch {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
}