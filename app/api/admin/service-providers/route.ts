import { NextResponse } from "next/server";

import { adminCall, readJson } from "@/app/server/admin-proxy";
import { providerSchema } from "@/app/lib/service-provider-schema";

export const runtime = "nodejs";

/** GET /api/admin/service-providers — every provider (incl. inactive), with open-booking counts. */
export async function GET(request: Request) {
  return adminCall({
    request,
    path: "/service-providers/admin",
    shape: (providers: unknown) => ({ providers: providers ?? [] }),
  });
}

/** POST /api/admin/service-providers — create a provider. NestJS checks the services exist. */
export async function POST(request: Request) {
  const json = await readJson(request);
  if (!json.ok) return json.response;
  const parsed = providerSchema.safeParse(json.body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { email, ...rest } = parsed.data;
  return adminCall({
    request,
    path: "/service-providers",
    method: "POST",
    body: { ...rest, ...(email ? { email } : {}) },
    status: 201,
    shape: (provider: unknown) => ({ provider }),
  });
}
