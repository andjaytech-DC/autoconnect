import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { readSessionCookie, verifySession } from "@/app/lib/auth";

export const runtime = "nodejs";

/** GET /api/insurance/mine — the signed-in customer's own enquiries. */
export async function GET(request: Request) {
  const session = await verifySession(readSessionCookie(request));
  if (!session?.token) {
    return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  }
  try {
    const enquiries = await backendFetch<unknown[]>("/insurance-enquiries/mine", { token: session.token });
    return NextResponse.json({ enquiries: enquiries ?? [] });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
