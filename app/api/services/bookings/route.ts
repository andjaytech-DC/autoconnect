import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireAdminSession } from "@/app/server/authz";

export const runtime = "nodejs";

const STATUSES = new Set([
  "REQUESTED", "CONFIRMED", "ASSIGNED", "VEHICLE_RECEIVED",
  "IN_PROGRESS", "AWAITING_APPROVAL", "COMPLETED", "CANCELLED",
]);

/**
 * GET /api/services/bookings — admin: search, filter and page the booking queue.
 *
 * Customers do NOT book through here (that would be an unauthenticated write);
 * they use POST /api/service-bookings, which requires a signed-in account.
 * Query: status, providerId, q, page, limit. Only whitelisted, validated values
 * are forwarded.
 */
export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }

  const sp = new URL(request.url).searchParams;
  const q = new URLSearchParams();
  const status = sp.get("status");
  if (status && STATUSES.has(status)) q.set("status", status);
  const providerId = sp.get("providerId");
  if (providerId && /^\d+$/.test(providerId)) q.set("providerId", providerId);
  const search = sp.get("q")?.trim().slice(0, 80);
  if (search) q.set("q", search);
  const page = sp.get("page");
  if (page && /^\d+$/.test(page)) q.set("page", page);
  const limit = sp.get("limit");
  if (limit && /^\d+$/.test(limit)) q.set("limit", String(Math.min(Number(limit), 100)));

  try {
    // raw: the totals and per-status counts live in `meta`.
    const res = await backendFetch<{ data?: unknown[]; meta?: unknown }>(
      `/service-bookings${q.toString() ? `?${q}` : ""}`,
      { token: auth.session.token, raw: true },
    );
    return NextResponse.json({ bookings: res?.data ?? [], meta: res?.meta ?? null });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
