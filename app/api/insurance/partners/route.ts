import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { enforceRateLimit } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/insurance/partners — the active insurance partners, as disclosure.
 * NestJS returns no phone or email here (a customer sees a partner's contact
 * details only once their own enquiry is assigned to it), and shows each
 * partner's licence note exactly as the business wrote it. Nothing is invented
 * here: no partners means an empty list, not a placeholder.
 */
export async function GET(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 60, windowMs: 60_000, key: "insurance-partners" })).ok) {
    return NextResponse.json({ error: "Too many requests, try again shortly" }, { status: 429 });
  }
  try {
    const partners = await backendFetch<unknown[]>("/insurance-partners");
    return NextResponse.json({ partners: partners ?? [] });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
