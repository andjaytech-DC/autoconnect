import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/app/server/authz";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";

export const runtime = "nodejs";

/**
 * Admin Trust & Safety surface.
 *
 * Proxies the NestJS vehicle-history, warranty-plan and return-request APIs.
 * The backend is the single source of truth; nothing is stored here.
 *
 * POST bodies carry an `action` so the panel can drive several backend routes
 * from one endpoint:
 *   lookup        -> POST /vehicle-history/lookup/:vehicleId
 *   record        -> POST /vehicle-history
 *   plan.create   -> POST /warranty/plans
 *   plan.update   -> PATCH /warranty/plans/:id
 *   plan.remove   -> DELETE /warranty/plans/:id
 *   return.update -> PATCH /return-requests/:id
 */

const historySchema = z.object({
  action: z.literal("record"),
  vehicleId: z.coerce.number().int().positive(),
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

const lookupSchema = z.object({
  action: z.literal("lookup"),
  vehicleId: z.coerce.number().int().positive(),
  force: z.boolean().optional(),
});

const planCreateSchema = z.object({
  action: z.literal("plan.create"),
  name: z.string().trim().min(1).max(120),
  providerName: z.string().trim().min(1).max(120),
  providerRef: z.string().trim().max(80).optional().or(z.literal("")),
  durationMonths: z.coerce.number().int().min(1).max(120),
  maxMileageKm: z.coerce.number().int().min(0),
  coverageType: z.enum(["COMPREHENSIVE", "POWERTRAIN"]),
  coveredComponents: z.array(z.string().trim().min(1)).max(50).optional(),
  exclusions: z.array(z.string().trim().min(1)).max(50).optional(),
  priceAmount: z.coerce.number().int().min(0),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

const planUpdateSchema = z.object({
  action: z.literal("plan.update"),
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(120).optional(),
  providerName: z.string().trim().min(1).max(120).optional(),
  providerRef: z.string().trim().max(80).optional().or(z.literal("")),
  durationMonths: z.coerce.number().int().min(1).max(120).optional(),
  maxMileageKm: z.coerce.number().int().min(0).optional(),
  coverageType: z.enum(["COMPREHENSIVE", "POWERTRAIN"]).optional(),
  priceAmount: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

const planRemoveSchema = z.object({
  action: z.literal("plan.remove"),
  id: z.coerce.number().int().positive(),
});

const returnUpdateSchema = z.object({
  action: z.literal("return.update"),
  id: z.coerce.number().int().positive(),
  status: z.enum([
    "REQUESTED",
    "APPROVED",
    "REJECTED",
    "PICKUP_SCHEDULED",
    "COMPLETED",
  ]),
  resolutionNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});

const anySchema = z.union([
  historySchema,
  lookupSchema,
  planCreateSchema,
  planUpdateSchema,
  planRemoveSchema,
  returnUpdateSchema,
]);

/**
 * GET /api/admin/trust - everything the panel renders, in one call.
 *
 * `backendFetch` already unwraps the backend's `{ success, data }` envelope, so
 * every value below is the array itself rather than an envelope.
 */
export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  const session = auth.session;
  if (!session.token) {
    return NextResponse.json(
      { error: "Not linked to the API." },
      { status: 401 },
    );
  }

  try {
    const [checks, plans, policies, claims, returns] = await Promise.all([
      backendFetch<unknown>("/vehicle-history", { token: session.token }).catch(
        () => null,
      ),
      backendFetch<unknown>("/warranty/plans/all", {
        token: session.token,
      }).catch(() => null),
      backendFetch<unknown>("/warranty/purchases", {
        token: session.token,
      }).catch(() => null),
      backendFetch<unknown>("/warranty/claims", {
        token: session.token,
      }).catch(() => null),
      backendFetch<unknown>("/return-requests", {
        token: session.token,
      }).catch(() => null),
    ]);

    return NextResponse.json({
      checks: checks ?? [],
      plans: plans ?? [],
      policies: policies ?? [],
      claims: claims ?? [],
      returns: returns ?? [],
    });
  } catch (err) {
    if (!isBackendUnreachable(err) && err instanceof BackendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Trust data is temporarily unavailable." },
      { status: 503 },
    );
  }
}

/** Strips the routing `action` key so only backend fields are forwarded. */
function withoutAction<T extends { action: string }>(
  value: T,
): Omit<T, "action"> {
  const out: Record<string, unknown> = { ...value };
  delete out.action;
  return out as Omit<T, "action">;
}

/** POST /api/admin/trust - drive one backend action. */
export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 60, key: "admin-trust" })).ok) {
    return NextResponse.json(
      { error: "Too many requests, try again later" },
      { status: 429 },
    );
  }

  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  const session = auth.session;
  if (!session.token) {
    return NextResponse.json(
      { error: "Not linked to the API." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = anySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const action = parsed.data.action;
  const token = session.token;

  try {
    switch (action) {
      case "lookup": {
        const res = await backendFetch<{ outcome: string; message: string }>(
          `/vehicle-history/lookup/${parsed.data.vehicleId}?force=${
            parsed.data.force ? "true" : "false"
          }`,
          { method: "POST", token },
        );
        return NextResponse.json(res, { status: 201 });
      }
      case "record": {
        const rest = withoutAction(parsed.data);
        const res = await backendFetch("/vehicle-history", {
          method: "POST",
          token,
          body: {
            ...rest,
            summary: rest.summary || undefined,
            notes: rest.notes || undefined,
          },
        });
        return NextResponse.json(res, { status: 201 });
      }
      case "plan.create": {
        const rest = withoutAction(parsed.data);
        const res = await backendFetch("/warranty/plans", {
          method: "POST",
          token,
          body: {
            ...rest,
            providerRef: rest.providerRef || undefined,
            notes: rest.notes || undefined,
          },
        });
        return NextResponse.json(res, { status: 201 });
      }
      case "plan.update": {
        const { id, ...rest } = withoutAction(parsed.data);
        const res = await backendFetch(`/warranty/plans/${id}`, {
          method: "PATCH",
          token,
          body: {
            ...rest,
            providerRef: rest.providerRef || undefined,
            notes: rest.notes || undefined,
          },
        });
        return NextResponse.json(res);
      }
      case "plan.remove": {
        const res = await backendFetch(`/warranty/plans/${parsed.data.id}`, {
          method: "DELETE",
          token,
        });
        return NextResponse.json(res);
      }
      case "return.update": {
        const { id, ...rest } = withoutAction(parsed.data);
        const res = await backendFetch(`/return-requests/${id}`, {
          method: "PATCH",
          token,
          body: {
            status: rest.status,
            resolutionNotes: rest.resolutionNotes || undefined,
          },
        });
        return NextResponse.json(res);
      }
    }
  } catch (err) {
    if (!isBackendUnreachable(err) && err instanceof BackendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "The trust service is temporarily unavailable." },
      { status: 503 },
    );
  }
}
