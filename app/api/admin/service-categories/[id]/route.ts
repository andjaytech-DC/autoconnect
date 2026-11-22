import { z } from "zod";
import { NextResponse } from "next/server";

import { adminCall, badId, parseId, readJson } from "@/app/server/admin-proxy";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// `code` is deliberately not editable: providers and bookings reference it.
const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(300).optional(),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
});

/** PATCH /api/admin/service-categories/[id] — rename, reorder or (de)activate. */
export async function PATCH(request: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (id === null) return badId("category");
  const json = await readJson(request);
  if (!json.ok) return json.response;
  const parsed = patchSchema.safeParse(json.body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  return adminCall({
    request,
    path: `/services/categories/${id}`,
    method: "PATCH",
    body: parsed.data,
    shape: (category: unknown) => ({ category }),
  });
}
