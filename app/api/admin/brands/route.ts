import { NextResponse } from "next/server";

import { adminCall, readJson } from "@/app/server/admin-proxy";

export const runtime = "nodejs";

/**
 * POST /api/admin/brands — admin-only: add a brand (e.g. "Ferrari") so it shows
 * up in the vehicle form's brand list. NestJS owns the rule that names are unique.
 */
export async function POST(request: Request) {
  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;
  const { name, country } = (parsed.body ?? {}) as { name?: unknown; country?: unknown };
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  return adminCall({
    request,
    path: "/brands",
    method: "POST",
    body: {
      name: name.trim(),
      ...(typeof country === "string" && country.trim() ? { country: country.trim() } : {}),
    },
    shape: (brand) => ({ brand }),
  });
}
