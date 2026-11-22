import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { readSessionCookie, verifySession } from "@/app/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/insurance/mine/[id]/close — close (withdraw) MY enquiry. */
export async function POST(request: Request, { params }: Ctx) {
  const session = await verifySession(readSessionCookie(request));
  if (!session?.token) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const raw = (await params).id;
  if (!/^\d+$/.test(raw) || Number(raw) <= 0) {
    return NextResponse.json({ error: "Invalid enquiry id" }, { status: 400 });
  }
  try {
    const enquiry = await backendFetch(`/insurance-enquiries/mine/${Number(raw)}/close`, {
      method: "PATCH",
      token: session.token,
    });
    return NextResponse.json({ data: enquiry });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
