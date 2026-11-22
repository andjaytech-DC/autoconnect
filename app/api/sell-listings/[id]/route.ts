import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireAdminSession } from "@/app/server/authz";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["PENDING", "REVIEWING", "APPROVED", "REJECTED", "SOLD"]),
});

type Ctx = { params: Promise<{ id: string }> };

async function parseId(ctx: Ctx): Promise<number | null> {
  const { id } = await ctx.params;
  return /^\d+$/.test(id) ? Number(id) : null;
}

/** GET /api/sell-listings/[id] — admin: view a single listing. */
export async function GET(request: Request, ctx: Ctx) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  const id = await parseId(ctx);
  if (id === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const item = await backendFetch(`/seller-listings/${id}`, { token: auth.session.token });
    return NextResponse.json({ data: item });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

/** PATCH /api/sell-listings/[id] — admin: update listing status. */
export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  const id = await parseId(ctx);
  if (id === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const item = await backendFetch(`/seller-listings/${id}/status`, {
      method: "PATCH",
      token: auth.session.token,
      body: parsed.data,
    });
    return NextResponse.json({ data: item });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
