import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireAdminSession } from "@/app/server/authz";

export const runtime = "nodejs";

const noteSchema = z.object({ note: z.string().trim().min(1, "Write a note").max(1000) });

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/insurance/[id]/notes — admin: add an INTERNAL note (never shown to the customer). */
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  const raw = (await params).id;
  if (!/^\d+$/.test(raw) || Number(raw) <= 0) {
    return NextResponse.json({ error: "Invalid enquiry id" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  try {
    const res = await backendFetch(`/insurance-enquiries/${Number(raw)}/notes`, {
      method: "POST",
      token: auth.session.token,
      body: parsed.data,
    });
    return NextResponse.json({ data: res }, { status: 201 });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
