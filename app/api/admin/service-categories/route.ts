import { z } from "zod";
import { NextResponse } from "next/server";

import { adminCall, readJson } from "@/app/server/admin-proxy";

export const runtime = "nodejs";

const createSchema = z.object({
  code: z.string().regex(/^[A-Z][A-Z_]{1,30}$/, "Code must be UPPER_SNAKE_CASE (2-31 characters)"),
  name: z.string().trim().min(1, "Enter a name").max(80),
  description: z.string().trim().max(300).optional(),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
});

/** GET /api/admin/service-categories — every category (incl. inactive) with provider counts. */
export async function GET(request: Request) {
  return adminCall({
    request,
    path: "/services/admin/categories",
    shape: (categories: unknown) => ({ categories: categories ?? [] }),
  });
}

/** POST /api/admin/service-categories — add a category to the catalogue. */
export async function POST(request: Request) {
  const json = await readJson(request);
  if (!json.ok) return json.response;
  const parsed = createSchema.safeParse(json.body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  return adminCall({
    request,
    path: "/services/categories",
    method: "POST",
    body: parsed.data,
    status: 201,
    shape: (category: unknown) => ({ category }),
  });
}
