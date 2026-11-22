import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireAdminSession } from "@/app/server/authz";

export const runtime = "nodejs";

/** GET /api/admin/stats — admin dashboard metrics, computed by NestJS. */
export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  try {
    const stats = await backendFetch<Record<string, number>>("/admin/stats", {
      token: auth.session.token,
    });
    return NextResponse.json({ stats: stats ?? {}, source: "backend" });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
