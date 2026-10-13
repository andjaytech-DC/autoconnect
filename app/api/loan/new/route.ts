import { NextResponse } from "next/server";

import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { newId, updateDb } from "@/app/server/db";

export const runtime = "nodejs";

/**
 * POST /api/loan/new — submit a car-loan application.
 *
 * Validates the request, records it as a FINANCE order (status PENDING) on the
 * user's account, and returns a reference. No fake approval is granted; an
 * actual lender decision happens on the NestJS/underwriting side.
 */
export async function POST(request: Request) {
  const session = await verifySession(readSessionCookie(request));
  if (!session) {
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

  const applicationId = newId("loan");
  await updateDb((db) => {
    db.orders.push({
      id: applicationId,
      userId: session.id,
      carId,
      type: "FINANCE",
      amount,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    });
  });

  return NextResponse.json(
    { applicationId, status: "PENDING", message: "Loan application received. A partner bank will review it." },
    { status: 201 },
  );
}