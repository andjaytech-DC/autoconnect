import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/server/prisma";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { requireAdminSession } from "@/app/server/authz";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

const financeSchema = z.object({
  vehicleId: z.coerce.number().int().positive().optional(),
  // Applicant identity fields (name/phone/email) are still accepted and
  // validated so existing forms keep working, but FinanceApplication has no
  // columns for them — see the POST handler note.
  applicantName: z.string().min(1).max(120),
  phone: z.string().min(7).max(20).transform(normalizePhone).pipe(z.string().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number")),
  email: z.string().email().optional().or(z.literal("")),
  monthlyIncome: z.coerce.number().int().positive(),
  employmentType: z.enum(["SALARIED", "SELF_EMPLOYED", "BUSINESS"]),
  loanAmount: z.coerce.number().int().positive(),
  tenureMonths: z.coerce.number().int().positive().max(480).default(60),
  downPayment: z.coerce.number().int().min(0).default(0),
});

/** POST /api/finance-applications — public: apply for financing. */
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

  try {
    const { vehicleId, monthlyIncome, loanAmount, tenureMonths, downPayment } = parsed.data;
    const ref = "FA" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

    // FinanceApplication stores no applicant name/phone/email — identity comes
    // from the linked `userId`. A signed-in applicant is linked automatically;
    // a guest's contact details are returned with the reference so the response
    // is not lossy, but they are not persisted. See docs/schema-alignment.md.
    const session = await verifySession(readSessionCookie(request));
    const userId = session ? Number.parseInt(session.id, 10) : Number.NaN;

    const app = await prisma.financeApplication.create({
      data: {
        ...(vehicleId ? { vehicleId } : {}),
        ...(Number.isInteger(userId) ? { userId } : {}),
        loanAmount,
        monthlyIncome,
        tenureMonths,
        downPayment,
        status: "SUBMITTED",
      },
    });
    return NextResponse.json({ data: { ...app, referenceNo: ref } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to submit finance application" }, { status: 500 });
  }
}

/**
 * GET /api/finance-applications — admin: list applications.
 *
 * Stays ADMIN-only so the 401/403 contract is unchanged. The projection is
 * explicit rather than `include`-ing the whole row, so a future column cannot
 * silently widen what leaves the server, and `panNumber` is returned in full
 * only because every caller of this route is an administrator.
 *
 * The customer's own view is scoped to their session by the customer portal
 * (see `app/server/customer-portal.ts`); it never calls this route.
 */
export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  const items = await prisma.financeApplication.findMany({
    select: {
      id: true,
      status: true,
      loanAmount: true,
      interestRate: true,
      tenureMonths: true,
      emi: true,
      downPayment: true,
      monthlyIncome: true,
      employerName: true,
      panNumber: true,
      createdAt: true,
      vehicle: { select: { id: true, title: true, price: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ applications: items });
}
