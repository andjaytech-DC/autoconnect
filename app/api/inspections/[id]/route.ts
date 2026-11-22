import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireAdminSession } from "@/app/server/authz";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["REQUESTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().max(1000).optional(),
});

/** PATCH /api/inspections/[id] — admin: update inspection status/notes. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  // The id reaches a backend URL, so only a bare positive integer is accepted.
  const { id } = await params;
  if (!/^\d+$/.test(id) || Number.parseInt(id, 10) <= 0) {
    return NextResponse.json({ error: "Invalid inspection id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const item = await backendFetch(`/inspections/${Number.parseInt(id, 10)}`, {
      method: "PATCH",
      token: auth.session.token,
      body: parsed.data,
    });
    return NextResponse.json({ data: item });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
