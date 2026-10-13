import { NextResponse } from "next/server";
import { z } from "zod";

import {
  backendFetch,
  BackendError,
  isBackendUnreachable,
} from "@/app/lib/backend";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { requireAdminSession } from "@/app/server/authz";
import { prisma } from "@/app/server/prisma";

/**
 * POST /api/test-drives — request a test drive.
 *
 * Public: a guest may book without an account. When the caller IS signed in the
 * request is linked to them (`TestDrive.userId`), which is the only thing that
 * makes the customer portal able to show "your test drives" — the table had no
 * owner column at all before, so every customer-scoped read fell back to a
 * global scan. The owner is taken from the verified session cookie and never
 * from anything in the body.
 *
 * The NestJS backend is authoritative when it is reachable; `userId` is sent
 * along so the backend can persist the same link. When the backend is
 * unreachable the request is written to the local store instead of being lost.
 */

const testDriveSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  customerName: z.string().min(1).max(120),
  customerPhone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Phone must be a valid 10-digit Indian mobile number"),
  // Bounded: the value is stored in a `DateTime` column. Anything that does not
  // parse is refused rather than coerced into an Invalid Date.
  preferredDate: z
    .string()
    .min(4)
    .max(40)
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date"),
  preferredTime: z.string().min(1).max(20),
});

/** Resolve the caller's user id from the signed session, or null for a guest. */
async function callerUserId(request: Request): Promise<number | null> {
  const session = await verifySession(readSessionCookie(request));
  if (!session) return null;
  const id = Number.parseInt(session.id, 10);
  return Number.isInteger(id) ? id : null;
}

export async function POST(request: Request) {
  // The limit is keyed on the request so an unauthenticated flood from one
  // address is throttled; when the caller is signed in the identifier axis
  // keeps a single abusive account bounded even if its address is unknown.
  const userId = await callerUserId(request);
  const gate = await enforceRateLimit(request, {
    limit: 10,
    key: "test-drives",
    ...(userId ? { identifier: `user:${userId}` } : {}),
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

  const data = parsed.data;

  // 1) NestJS backend (authoritative)
  try {
    const created = await backendFetch<unknown>("/test-drives", {
      method: "POST",
      body: {
        ...data,
        // Additive: associates the authenticated applicant with the record.
        // Unknown fields are ignored by a backend that whitelists its DTO.
        ...(userId ? { userId } : {}),
      },
    });
    return NextResponse.json({ data: created, source: "backend" }, { status: 201 });
  } catch (err) {
    if (!isBackendUnreachable(err) && err instanceof BackendError) {
      // The backend answered and refused — do not shadow that with a local
      // row that the dealership would then see twice.
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // Unreachable → local fallback below.
  }

  // 2) Local fallback. The row is written with the verified owner (null for a
  //    guest) so a request is never lost and never unattributable.
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: data.vehicleId },
      select: { id: true },
    });
    if (!vehicle) {
      return NextResponse.json({ error: "Unknown vehicle" }, { status: 400 });
    }

    const row = await prisma.testDrive.create({
      data: {
        vehicleId: data.vehicleId,
        userId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        preferredDate: new Date(data.preferredDate),
        preferredTime: data.preferredTime,
      },
      select: { id: true, vehicleId: true, preferredDate: true, preferredTime: true },
    });
    return NextResponse.json(
      { data: { ...row, source: "local" }, source: "local" },
      { status: 201 },
    );
  } catch (err) {
    console.error("Failed to create test drive:", err);
    const message = err instanceof Error ? err.message : "Unable to create test drive request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/test-drives — admin: list test drive requests (proxied to backend).
 *
 * Dealer- and customer-scoped views of this table are served by
 * `/api/dealer/test-drives` and by the customer portal respectively — this
 * endpoint stays ADMIN-only so the 401/403 contract (anonymous → 401, wrong
 * role → 403) is unchanged.
 */
export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  try {
    const items = await backendFetch("/test-drives", {
      token: request.headers.get("authorization")?.replace("Bearer ", ""),
    });
    return NextResponse.json({ testDrives: items });
  } catch {
    return NextResponse.json({ testDrives: [] });
  }
}
