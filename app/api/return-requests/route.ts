import { NextResponse } from "next/server";
import { z } from "zod";

import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";
import { enforceRateLimit } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Return requests.
 *
 * Eligibility is decided by staff in the backend, never here. This route only
 * forwards the request, and the UI is explicit that submitting is not approval.
 */

const createSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

/** POST /api/return-requests — authenticated customer opens a request. */
export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 3, key: "return-requests" })).ok) {
    return NextResponse.json(
      { error: "Too many requests, try again later" },
      { status: 429 },
    );
  }

  const session = await verifySession(readSessionCookie(request));
  if (!session) {
    return NextResponse.json(
      { error: "Sign in to request a return" },
      { status: 401 },
    );
  }
  if (!session.token) {
    return NextResponse.json(
      { error: "Return requests require a linked account." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const created = await backendFetch("/return-requests", {
      method: "POST",
      token: session.token,
      body: {
        vehicleId: parsed.data.vehicleId,
        reason: parsed.data.reason,
        description: parsed.data.description || undefined,
      },
    });
    return NextResponse.json({ request: created }, { status: 201 });
  } catch (err) {
    if (!isBackendUnreachable(err) && err instanceof BackendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Could not submit your request." },
      { status: 503 },
    );
  }
}
