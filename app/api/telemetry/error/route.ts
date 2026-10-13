import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/app/server/authz";
import { withErrorGuard } from "@/app/lib/route-guard";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { recordError, snapshot } from "@/app/lib/telemetry-store";

export const runtime = "nodejs";

const errorSchema = z.object({
  message: z.string().min(1).max(2000),
  route: z.string().max(2000),
  status: z
    .union([z.number().int().min(100).max(599), z.null()])
    .optional(),
  code: z.string().max(50).nullable().optional(),
  url: z.string().max(1000).optional(),
});

/**
 * In-memory error counters, keyed by route|status|code.
 *
 * These are deliberately NOT written to AuditLog: that table requires a
 * non-null `userId` and this beacon is unauthenticated, so there is no user to
 * attribute an event to. Inventing one would put fake rows in an audit table.
 */

/**
 * POST /api/telemetry/error — client-side failure beacon.
 *
 * Receives the failures that defensive client fallbacks would otherwise
 * swallow (network errors, non-JSON/HTML error pages, empty bodies) so
 * frontend telemetry isn't blinded. Each occurrence is counted in-memory and
 * logged to the server console; the endpoint itself never throws so the metrics
 * path can't break the app. GET is an admin readout of the counters.
 *
 * The route is unauthenticated, so it is both rate-limited (it cannot be used
 * as a free request amplifier) and fed through a bounded store whose key space
 * is constrained to route|status|code — see `app/lib/telemetry-store.ts`.
 */
const postHandler = async (request: Request): Promise<NextResponse> => {
  // Beacon traffic is background noise; keep the ceiling low enough that a
  // single client cannot monopolise the counters.
  if (!(await enforceRateLimit(request, { limit: 60, windowMs: 60_000, key: "telemetry-error" })).ok) {
    return NextResponse.json({ ok: true }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = errorSchema.safeParse(body);
    if (parsed.success) {
      const d = parsed.data;
      const outcome = recordError({
        route: d.route,
        status: d.status,
        code: d.code,
        message: d.message,
      });
      if (outcome) {
        console.error(
          `[client-error x${outcome.count}] ${outcome.key} ${d.code ? `(${d.code}) ` : ""}${d.message}`,
        );
      }
    }
    // Always 200 — a rejected payload must not produce a second client error.
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
};

export const POST = withErrorGuard(postHandler, { route: "api/telemetry/error" });

const getHandler = async (request: Request): Promise<NextResponse> => {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(snapshot());
};

export const GET = withErrorGuard(getHandler, { route: "api/telemetry/error" });
