/**
 * GET /api/dealers/[id] — one approved dealer.
 *
 * The id is validated as a positive integer before use: `backendFetch`
 * interpolates it into the backend URL and Next.js URL-decodes route params, so
 * `../admin` would otherwise target a different backend endpoint.
 *
 * NestJS answers 404 for dealers that are not approved and withholds the phone
 * from anonymous callers; this route forwards the visitor's token.
 */

import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { mapDealer } from "@/app/lib/nest-mappers";
import type { NestDealer } from "@/app/lib/nest-types";

export const runtime = "nodejs";

interface DealerRouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: DealerRouteParams) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || Number.parseInt(id, 10) <= 0) {
    return NextResponse.json({ error: "Invalid dealer id", code: "INVALID_ID" }, { status: 400 });
  }
  const dealerId = Number.parseInt(id, 10);
  const session = await verifySession(readSessionCookie(request));

  try {
    const dealer = await backendFetch<NestDealer>(`/dealers/${dealerId}`, { token: session?.token ?? null });
    const canSeeContact = Boolean(dealer?.phone);
    return NextResponse.json({
      dealer: mapDealer(dealer, { canSeeContact }),
      contactAvailable: canSeeContact || Boolean(session?.token),
      source: "backend",
    });
  } catch (err) {
    const res = backendErrorResponse(err);
    return res.status === 404
      ? NextResponse.json({ error: "Dealer not found", code: "NOT_FOUND" }, { status: 404 })
      : res;
  }
}
