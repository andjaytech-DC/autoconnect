import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { enforceRateLimit } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/services/providers — list active service providers.
 *
 * The directory is public. Phone, email and street address are withheld from
 * anonymous callers by NestJS itself (so calling the API directly cannot get
 * around it); this route only forwards the visitor's token when they have one.
 */
export async function GET(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 60, windowMs: 60_000, key: "providers" })).ok) {
    return NextResponse.json(
      { error: "Too many requests, try again shortly" },
      { status: 429 },
    );
  }

  const session = await verifySession(readSessionCookie(request));
  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams();
  for (const key of ["city", "service", "page", "limit"]) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }

  try {
    const data = await backendFetch<{
      providers: unknown[];
      contactAvailable: boolean;
      pagination: { page: number; limit: number };
    }>(`/service-providers${query.toString() ? `?${query.toString()}` : ""}`, { token: session?.token ?? null });
    return NextResponse.json({
      providers: data?.providers ?? [],
      contactAvailable: Boolean(data?.contactAvailable),
      pagination: data?.pagination ?? { page: 1, limit: 24 },
    });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
