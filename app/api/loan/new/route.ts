import { NextResponse } from "next/server";

import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { submitFinanceApplication } from "@/app/lib/finance-bff";

export const runtime = "nodejs";

/**
 * POST /api/loan/new — submit a car-loan application.
 *
 * Validates the request and files it as a finance application in NestJS, on the
 * signed-in customer's account. No approval is granted here; the lender decision
 * happens on the backend.
 */
export async function POST(request: Request) {
  const session = await verifySession(readSessionCookie(request));
  if (!session?.token) {
    return NextResponse.json({ error: "Please sign in to apply" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const carId = Number(body.carId);
  const amount = Number(body.amount);
  const tenureYears = Number(body.tenureYears);
  const monthlyIncome = Number(body.monthlyIncome ?? 0);

  if (!Number.isInteger(carId) || carId <= 0) {
    return NextResponse.json({ error: "Choose a valid vehicle" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 50_000) {
    return NextResponse.json(
      { error: "Loan amount must be at least ₹50,000" },
      { status: 400 },
    );
  }
  if (!Number.isInteger(tenureYears) || tenureYears < 1 || tenureYears > 7) {
    return NextResponse.json(
      { error: "Loan tenure must be 1–7 years" },
      { status: 400 },
    );
  }
  if (monthlyIncome > 0 && amount / Math.max(tenureYears * 12, 1) > monthlyIncome * 0.5) {
    return NextResponse.json(
      { error: "The estimated EMI looks too high for the income provided. Consider a longer tenure or lower amount." },
      { status: 400 },
    );
  }

  try {
    const application = await submitFinanceApplication(session.token, {
      vehicleId: carId,
      loanAmount: amount,
      tenureMonths: tenureYears * 12,
      ...(monthlyIncome > 0 ? { monthlyIncome } : {}),
    });
    return NextResponse.json(
      {
        applicationId: application.referenceNo,
        status: application.status,
        message: "Loan application received. A partner bank will review it.",
      },
      { status: 201 },
    );
  } catch (err) {
    return backendErrorResponse(err);
  }
}
