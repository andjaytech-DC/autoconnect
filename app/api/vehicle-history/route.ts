import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { requireRole } from "@/app/server/authz";

export const runtime = "nodejs";

/**
 * Vehicle history checks for one vehicle.
 *
 * Backed by the NestJS VehicleHistory model. Writes are limited to ADMIN and to
 * the dealership that owns the vehicle (enforced in NestJS). A check only reads as VERIFIED when
 * it was recorded against an external authority — operator-entered records stay
 * PENDING in the backend, so this route never has to relabel them.
 */

const createSchema = z.object({
  checkType: z.string().trim().min(1).max(50),
  status: z.enum(["PENDING", "VERIFIED", "FAILED", "NOT_AVAILABLE"]),
  source: z
    .enum(["MANUAL", "VAHAN", "RTO", "INSURER", "SERVICE_CENTRE", "POLICE"])
    .optional(),
  summary: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  hasAccidentRecord: z.boolean().optional(),
  hasFloodDamage: z.boolean().optional(),
  hasOdometerTampering: z.boolean().optional(),
  hasLoanEncumbrance: z.boolean().optional(),
  pendingChallanCount: z.coerce.number().int().min(0).optional(),
  ownershipCount: z.coerce.number().int().min(0).optional(),
  rcVerified: z.boolean().optional(),
  insuranceVerified: z.boolean().optional(),
  pucValid: z.boolean().optional(),
});

export interface UiHistoryCheck {
  id: number;
  checkType: string;
  status: "PENDING" | "VERIFIED" | "FAILED" | "NOT_AVAILABLE";
  source: string;
  summary: string | null;
  checkedAt: string;
  hasAccidentRecord: boolean | null;
  hasFloodDamage: boolean | null;
  hasOdometerTampering: boolean | null;
  hasLoanEncumbrance: boolean | null;
  pendingChallanCount: number | null;
  ownershipCount: number | null;
  rcVerified: boolean | null;
  insuranceVerified: boolean | null;
  pucValid: boolean | null;
}

interface BackendHistoryPayload {
  checks?: {
    id: number;
    checkType: string;
    status: UiHistoryCheck["status"];
    source: string;
    summary?: string | null;
    checkedAt: string;
    hasAccidentRecord?: boolean | null;
    hasFloodDamage?: boolean | null;
    hasOdometerTampering?: boolean | null;
    hasLoanEncumbrance?: boolean | null;
    pendingChallanCount?: number | null;
    ownershipCount?: number | null;
    rcVerified?: boolean | null;
    insuranceVerified?: boolean | null;
    pucValid?: boolean | null;
  }[];
}

/** GET /api/vehicle-history?vehicleId=1 — public read. */
export async function GET(request: Request) {
  const vehicleId = new URL(request.url).searchParams.get("vehicleId");
  if (!vehicleId || !/^\d+$/.test(vehicleId)) {
    return NextResponse.json(
      { error: "A valid vehicleId is required" },
      { status: 400 },
    );
  }

  try {
    const payload = await backendFetch<BackendHistoryPayload>(
      `/vehicle-history/vehicle/${vehicleId}`,
    );
    const checks: UiHistoryCheck[] = (payload?.checks ?? []).map((c) => ({
      id: c.id,
      checkType: c.checkType,
      status: c.status,
      source: c.source,
      summary: c.summary ?? null,
      checkedAt: c.checkedAt,
      hasAccidentRecord: c.hasAccidentRecord ?? null,
      hasFloodDamage: c.hasFloodDamage ?? null,
      hasOdometerTampering: c.hasOdometerTampering ?? null,
      hasLoanEncumbrance: c.hasLoanEncumbrance ?? null,
      pendingChallanCount: c.pendingChallanCount ?? null,
      ownershipCount: c.ownershipCount ?? null,
      rcVerified: c.rcVerified ?? null,
      insuranceVerified: c.insuranceVerified ?? null,
      pucValid: c.pucValid ?? null,
    }));
    return NextResponse.json({ checks });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

/** POST /api/vehicle-history — staff records a check. */
export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 20, key: "vehicle-history" })).ok) {
    return NextResponse.json(
      { error: "Too many requests, try again later" },
      { status: 429 },
    );
  }

  // NestJS enforces role and dealership ownership; this is the early gate.
  const auth = await requireRole(request, "ADMIN", "DEALER");
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const vehicleId = new URL(request.url).searchParams.get("vehicleId");
  if (!vehicleId || !/^\d+$/.test(vehicleId)) {
    return NextResponse.json(
      { error: "A valid vehicleId is required" },
      { status: 400 },
    );
  }

  try {
    const created = await backendFetch<UiHistoryCheck>("/vehicle-history", {
      method: "POST",
      token: auth.session.token,
      body: {
        vehicleId: Number(vehicleId),
        ...parsed.data,
        summary: parsed.data.summary || undefined,
        notes: parsed.data.notes || undefined,
      },
    });
    return NextResponse.json({ check: created }, { status: 201 });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
