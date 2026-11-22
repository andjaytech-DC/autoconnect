import { NextResponse } from "next/server";

import { adminCall, badId, parseId, readJson } from "@/app/server/admin-proxy";
import { providerSchema } from "@/app/lib/service-provider-schema";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/service-providers/[id] — edit, or (de)activate, a provider. */
export async function PATCH(request: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (id === null) return badId("provider");
  const json = await readJson(request);
  if (!json.ok) return json.response;
  const parsed = providerSchema.partial().safeParse(json.body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { email, ...rest } = parsed.data;
  return adminCall({
    request,
    path: `/service-providers/${id}`,
    method: "PATCH",
    body: { ...rest, ...(email !== undefined ? { email } : {}) },
    shape: (provider: unknown) => ({ provider }),
  });
}
