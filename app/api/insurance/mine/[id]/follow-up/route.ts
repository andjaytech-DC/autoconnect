import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { enforceRateLimit } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({ message: z.string().trim().min(1, "Tell us what you need").max(500) });

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/insurance/mine/[id]/follow-up — ask the team to get back to me. */
export async function POST(request: Request, { params }: Ctx) {
  const session = await verifySession(readSessionCookie(request));
  if (!session?.token) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const raw = (await params).id;
  if (!/^\d+$/.test(raw) || Number(raw) <= 0) {
    return NextResponse.json({ error: "Invalid enquiry id" }, { status: 400 });
  }
  if (!(await enforceRateLimit(request, { limit: 6, windowMs: 60_000, key: "insurance-followup" })).ok) {
    return NextResponse.json({ error: "Too many requests, try again shortly" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  try {
    await backendFetch(`/insurance-enquiries/mine/${Number(raw)}/follow-up`, {
      method: "POST",
      token: session.token,
      body: parsed.data,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
