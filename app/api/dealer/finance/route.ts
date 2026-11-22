import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireRole } from "@/app/server/authz";
import { withErrorGuard } from "@/app/lib/route-guard";

export const runtime = "nodejs";

/**
 * GET /api/dealer/finance — finance applications for the dealership's own
 * vehicles. Owner only: these carry income and employer details, so employees
 * are refused here and again by NestJS. The PAN is masked to its last four
 * characters by NestJS before it leaves the backend.
 */
const handler = async (request: Request): Promise<NextResponse> => {
  const auth = await requireRole(request, "DEALER");
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  try {
    const applications = await backendFetch<unknown[]>("/dealers/me/finance", {
      token: auth.session.token,
    });
    return NextResponse.json({ applications: applications ?? [] });
  } catch (err) {
    return backendErrorResponse(err);
  }
};

export const GET = withErrorGuard(handler, { route: "api/dealer/finance" });
