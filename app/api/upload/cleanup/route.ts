import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { withErrorGuard } from "@/app/lib/route-guard";
import { requireRole } from "@/app/server/authz";

export const runtime = "nodejs";

/**
 * POST /api/upload/cleanup — ask NestJS to delete managed images.
 *
 * Used for uploads that were never attached (form discarded) and for removing
 * one image from the vehicle form. NestJS decides ownership (the caller's own
 * inventory, or an unattached upload they made) and does the deleting; this
 * route only gates the role and caps the batch.
 */
const handler = async (request: Request): Promise<NextResponse> => {
  const auth = await requireRole(request, "ADMIN", "DEALER");
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }

  if (!(await enforceRateLimit(request, { limit: 60, windowMs: 60_000, key: "upload-cleanup" })).ok) {
    return NextResponse.json({ error: "Too many requests, try again shortly" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = (body as { urls?: unknown })?.urls;
  const urls = Array.isArray(raw)
    ? raw.filter((u): u is string => typeof u === "string" && u !== "")
    : [];
  if (urls.length > 100) {
    return NextResponse.json({ error: "Too many assets in one request (max 100)" }, { status: 400 });
  }
  if (urls.length === 0) return NextResponse.json({ removed: 0 });

  try {
    const result = await backendFetch<{ removed: number }>("/uploads/cleanup", {
      method: "POST",
      token: auth.session.token,
      body: { urls },
    });
    return NextResponse.json({ removed: result?.removed ?? 0 });
  } catch (err) {
    return backendErrorResponse(err);
  }
};

export const POST = withErrorGuard(handler, { route: "api/upload/cleanup" });
