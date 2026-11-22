import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { readSessionCookie, verifySession } from "@/app/lib/auth";

export const runtime = "nodejs";

const schema = z.object({ decision: z.enum(["ACCEPT", "DECLINE"]) });

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/insurance/mine/[id]/respond — accept or decline a partner's quote.
 * This records the customer's wish only. It does not issue a policy: the partner
 * does that, outside this app.
 */
export async function POST(request: Request, { params }: Ctx) {
  const session = await verifySession(readSessionCookie(request));
  if (!session?.token) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose accept or decline" }, { status: 400 });
  try {
    const enquiry = await backendFetch(`/insurance-enquiries/mine/${Number(raw)}/respond`, {
      method: "PATCH",
      token: session.token,
      body: parsed.data,
    });
    return NextResponse.json({ data: enquiry });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
