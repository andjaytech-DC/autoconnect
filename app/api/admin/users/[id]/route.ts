import { NextResponse } from "next/server";

import { adminCall, badId, parseId, readJson } from "@/app/server/admin-proxy";

export const runtime = "nodejs";

const FORBIDDEN = ["role", "password", "refreshToken", "fcmToken"];

/**
 * PATCH /api/admin/users/:id: profile fields only (NestJS allow-lists them).
 * Role and password have dedicated, audited endpoints and are refused here.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  if (id === null) return badId("user");
  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;
  const body =
    parsed.body && typeof parsed.body === "object" && !Array.isArray(parsed.body)
      ? (parsed.body as Record<string, unknown>)
      : {};
  const attempted = Object.keys(body).filter((k) => FORBIDDEN.includes(k));
  if (attempted.length > 0) {
    return NextResponse.json(
      { error: `Fields not writable here: ${attempted.join(", ")}.` },
      { status: 400 },
    );
  }
  return adminCall({ request, path: `/admin/users/${id}`, method: "PATCH", body, shape: (user) => ({ user }) });
}
