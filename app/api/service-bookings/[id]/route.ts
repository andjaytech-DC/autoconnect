import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { readSessionCookie, verifySession } from "@/app/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Only a bare positive integer may reach the backend URL. */
const parseId = (id: string) => (/^\d+$/.test(id) && Number(id) > 0 ? Number(id) : null);

/** GET /api/service-bookings/[id] — one of MY bookings, with its status history. */
export async function GET(request: Request, { params }: Ctx) {
  const session = await verifySession(readSessionCookie(request));
  if (!session?.token) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });
  try {
    const booking = await backendFetch(`/service-bookings/mine/${id}`, { token: session.token });
    return NextResponse.json({ data: booking });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
