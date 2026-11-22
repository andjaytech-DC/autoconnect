import { NextResponse } from "next/server";

import { adminCall, badId, parseId, readJson } from "@/app/server/admin-proxy";
import { partnerSchema } from "@/app/lib/insurance-partner-schema";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/insurance-partners/[id] — edit, or (de)activate, a partner. */
export async function PATCH(request: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (id === null) return badId("partner");
  const json = await readJson(request);
  if (!json.ok) return json.response;
  const parsed = partnerSchema.partial().safeParse(json.body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  return adminCall({
    request,
    path: `/insurance-partners/${id}`,
    method: "PATCH",
    body: parsed.data,
    shape: (partner: unknown) => ({ partner }),
  });
}
