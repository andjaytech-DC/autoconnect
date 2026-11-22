import { NextResponse } from "next/server";

import { adminCall, badId, parseId, readJson } from "@/app/server/admin-proxy";

export const runtime = "nodejs";

const ROLES = ["CUSTOMER", "DEALER", "DEALER_EMPLOYEE", "ADMIN"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  if (id === null) return badId("user");
  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;
  const role = (parsed.body as { role?: unknown } | null)?.role;
  if (typeof role !== "string" || !ROLES.includes(role)) {
    return NextResponse.json({ error: `role must be one of ${ROLES.join(", ")}` }, { status: 400 });
  }
  return adminCall({
    request,
    path: `/users/${id}/assign-role`,
    method: "PATCH",
    body: { role },
    shape: (result) => result ?? { success: true },
  });
}
