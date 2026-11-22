import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { readSessionCookie, verifySession } from "@/app/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/service-bookings/[id]/cancel — cancel MY booking. NestJS checks
 * ownership (someone else's id is a 404) and that the vehicle has not yet been
 * received by the provider.
 */
export async function POST(request: Request, { params }: Ctx) {
  const session = await verifySession(readSessionCookie(request));
  if (!session?.token) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const raw = (await params).id;
  if (!/^\d+$/.test(raw) || Number(raw) <= 0) {
    return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });
  }
  try {
    const booking = await backendFetch(`/service-bookings/mine/${Number(raw)}/cancel`, {
      method: "PATCH",
      token: session.token,
    });
    return NextResponse.json({ data: booking });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
