import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { readSessionCookie, verifySession } from "@/app/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/insurance/mine/[id] — one of MY enquiries, with history and partner details. */
export async function GET(request: Request, { params }: Ctx) {
  const session = await verifySession(readSessionCookie(request));
  if (!session?.token) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const raw = (await params).id;
  if (!/^\d+$/.test(raw) || Number(raw) <= 0) {
    return NextResponse.json({ error: "Invalid enquiry id" }, { status: 400 });
  }
  try {
    const enquiry = await backendFetch(`/insurance-enquiries/mine/${Number(raw)}`, { token: session.token });
    return NextResponse.json({ data: enquiry });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
