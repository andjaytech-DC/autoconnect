import { NextResponse } from "next/server";

import { backendFetch, type BackendFetchOptions } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireAdminSession } from "@/app/server/authz";

export interface AdminCall<T> {
  request: Request;
  path: string;
  method?: BackendFetchOptions["method"];
  body?: unknown;
  /** Reshape the NestJS payload into what the admin screen expects. */
  shape: (data: T) => unknown;
  status?: number;
}

/**
 * Thin admin BFF: admin session -> one NestJS call -> reshape.
 * NestJS re-checks the ADMIN role and owns validation; Next holds no data and
 * has no fallback, so an outage is a 503 rather than stale or invented rows.
 */
export async function adminCall<T = unknown>(c: AdminCall<T>): Promise<NextResponse> {
  const auth = await requireAdminSession(c.request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  try {
    const data = await backendFetch<T>(c.path, {
      method: c.method ?? "GET",
      token: auth.session.token,
      body: c.body,
    });
    return NextResponse.json(c.shape(data), { status: c.status ?? 200 });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

export type JsonBody = { ok: true; body: unknown } | { ok: false; response: NextResponse };

export async function readJson(request: Request): Promise<JsonBody> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }
}

export function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const badId = (what: string) =>
  NextResponse.json({ error: `Invalid ${what} id` }, { status: 400 });
