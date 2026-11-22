import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { submitFinanceApplication } from "@/app/lib/finance-bff";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { requireAdminSession } from "@/app/server/authz";

export const runtime = "nodejs";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

const financeSchema = z.object({
  vehicleId: z.coerce.number().int().positive().optional(),
  // The applicant's identity comes from the signed-in account on the backend.
  // These fields are still validated so the existing form keeps working, but
  // FinanceApplication has no columns for them, so they are not forwarded.
  applicantName: z.string().min(1).max(120),
  phone: z.string().min(7).max(20).transform(normalizePhone).pipe(z.string().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number")),
  email: z.string().email().optional().or(z.literal("")),
  monthlyIncome: z.coerce.number().int().positive(),
  employmentType: z.enum(["SALARIED", "SELF_EMPLOYED", "BUSINESS"]),
  loanAmount: z.coerce.number().int().positive(),
  tenureMonths: z.coerce.number().int().positive().max(480).default(60),
  downPayment: z.coerce.number().int().min(0).default(0),
});

/**
 * POST /api/finance-applications — a signed-in customer applies for financing.
 *
 * The application is owned by the account on the NestJS side, which is what
 * lets the customer see it later and an underwriter act on it. Anonymous
 * applications are therefore no longer accepted: they could not be shown back
 * to anyone and stored no contact details at all.
 */
export async function POST(request: Request) {
  if (
    !(await enforceRateLimit(request, { limit: 10, key: "finance" })).ok
  ) {
    return NextResponse.json({ error: "Too many requests, try again later" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = financeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  // Second, always-available limit axis keyed on the submitted phone number:
  // an untrusted deployment collapses every caller into one IP bucket, so the
  // per-phone limit is what actually bounds repeat submissions regardless of
  // whether the caller's address can be resolved.
  if (!(await enforceRateLimit(request, { limit: 5, windowMs: 60 * 60 * 1000, key: "finance-phone", identifier: parsed.data.phone })).ok) {
    return NextResponse.json({ error: "Too many requests, try again later" }, { status: 429 });
  }

  const session = await verifySession(readSessionCookie(request));
  if (!session?.token) {
    return NextResponse.json(
      { error: "Please sign in to apply for financing" },
      { status: 401 },
    );
  }

  const { vehicleId, monthlyIncome, loanAmount, tenureMonths, downPayment } = parsed.data;
  try {
    const application = await submitFinanceApplication(session.token, {
      ...(vehicleId ? { vehicleId } : {}),
      loanAmount,
      tenureMonths,
      downPayment,
      monthlyIncome,
    });
    return NextResponse.json({ data: application }, { status: 201 });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

/**
 * GET /api/finance-applications — admin: list applications.
 *
 * Stays ADMIN-only so the 401/403 contract is unchanged. The role check runs
 * here for the status code and again in NestJS (`@Roles('ADMIN')`), which is the
 * one that actually decides.
 */
export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  try {
    const applications = await backendFetch<unknown[]>(
      "/finance/admin/applications",
      { token: auth.session.token },
    );
    return NextResponse.json({ applications: applications ?? [] });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
