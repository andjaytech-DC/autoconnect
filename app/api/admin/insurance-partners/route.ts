import { NextResponse } from "next/server";

import { adminCall, readJson } from "@/app/server/admin-proxy";
import { partnerSchema } from "@/app/lib/insurance-partner-schema";

export const runtime = "nodejs";

/** GET /api/admin/insurance-partners — every partner (incl. inactive), with open-enquiry counts. */
export async function GET(request: Request) {
  return adminCall({
    request,
    path: "/insurance-partners/admin",
    shape: (partners: unknown) => ({ partners: partners ?? [] }),
  });
}

/** POST /api/admin/insurance-partners — add a partner. */
export async function POST(request: Request) {
  const json = await readJson(request);
  if (!json.ok) return json.response;
  const parsed = partnerSchema.safeParse(json.body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  return adminCall({
    request,
    path: "/insurance-partners",
    method: "POST",
    body: parsed.data,
    status: 201,
    shape: (partner: unknown) => ({ partner }),
  });
}
