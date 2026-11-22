import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { requireAdminSession } from "@/app/server/authz";

/**
 * POST /api/test-drives — request a test drive.
 *
 * Public: a guest may book without an account. When the caller is signed in,
 * their NestJS token is forwarded and NestJS links the request to them (that
 * link is what lets the customer portal show "your test drives"). The owner is
 * never sent in the body, so nothing the client submits can choose it.
 */

const testDriveSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  customerName: z.string().min(1).max(120),
  customerPhone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Phone must be a valid 10-digit Indian mobile number"),
  preferredDate: z
    .string()
    .min(4)
    .max(40)
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date"),
  preferredTime: z.string().min(1).max(20),
});

export async function POST(request: Request) {
  const session = await verifySession(readSessionCookie(request));
  const userId = session ? Number.parseInt(session.id, 10) : NaN;

  // Keyed on the request, plus the account when signed in so one abusive
  // account stays bounded even if its address is unknown.
  const gate = await enforceRateLimit(request, {
    limit: 10,
    key: "test-drives",
    ...(Number.isInteger(userId) ? { identifier: `user:${userId}` } : {}),
  });
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many requests, try again later" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = testDriveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const created = await backendFetch<unknown>("/test-drives", {
      method: "POST",
      token: session?.token ?? null,
      body: parsed.data,
    });
    return NextResponse.json({ data: created, source: "backend" }, { status: 201 });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

/**
 * GET /api/test-drives — admin: list test drive requests. Dealer- and
 * customer-scoped views are served elsewhere, so this stays ADMIN-only.
 */
export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  try {
    const items = await backendFetch<unknown[]>("/test-drives", { token: auth.session.token });
    return NextResponse.json({ testDrives: items ?? [] });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
