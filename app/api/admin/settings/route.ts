import { NextResponse } from "next/server";

import { adminCall, readJson } from "@/app/server/admin-proxy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return adminCall({ request, path: "/admin/settings", shape: (settings) => ({ settings: settings ?? [] }) });
}

export async function POST(request: Request) {
  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;
  const { key, value } = (parsed.body ?? {}) as { key?: unknown; value?: unknown };
  if (typeof key !== "string" || !key.trim() || typeof value !== "string") {
    return NextResponse.json({ error: "key and value (strings) are required" }, { status: 400 });
  }
  return adminCall({
    request,
    path: "/admin/settings",
    method: "POST",
    body: { key, value },
    shape: (setting) => ({ setting }),
  });
}
