import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { adminListQuery } from "@/app/lib/insurance-query";
import { requireAdminSession } from "@/app/server/authz";

export const runtime = "nodejs";

/**
 * GET /api/insurance/export — admin: download the (filtered) enquiries as CSV.
 * The file contains customers' personal data, so it is admin-only, never cached,
 * and NestJS neutralises spreadsheet formulas in customer-typed cells.
 */
export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  // Pagination makes no sense for an export, so only the filters are forwarded.
  const q = adminListQuery(new URL(request.url).searchParams);
  q.delete("page");
  q.delete("limit");
  try {
    const csv = await backendFetch<string>(`/insurance-enquiries/export${q.toString() ? `?${q}` : ""}`, {
      token: auth.session.token,
      text: true,
      timeoutMs: 20_000,
    });
    // fetch's text() drops a leading UTF-8 BOM, so the one NestJS wrote is gone by now.
    // Excel needs it to read UTF-8 (₹, non-English names) correctly, so re-add exactly one.
    return new NextResponse("﻿" + csv.replace(/^﻿/, ""), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="insurance-enquiries.csv"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
