import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { adminListQuery } from "@/app/lib/insurance-query";
import { requireAdminSession } from "@/app/server/authz";

export const runtime = "nodejs";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const insuranceSchema = z.object({
  customerName: z.string().trim().min(1, "Enter your name").max(120),
  phone: z
    .string()
    .min(7)
    .max(20)
    .transform(normalizePhone)
    .pipe(z.string().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number")),
  email: z.preprocess(blank, z.string().email("Enter a valid email").max(254).optional()),
  city: z.preprocess(blank, z.string().trim().max(80).optional()),
  vehicleId: z.preprocess(blank, z.coerce.number().int().positive().optional()),
  registrationNo: z.preprocess(blank, z.string().trim().max(20).optional()),
  registrationYear: z.preprocess(blank, z.coerce.number().int().min(1980).max(2100).optional()),
  vehicleMake: z.preprocess(blank, z.string().trim().max(60).optional()),
  vehicleModel: z.preprocess(blank, z.string().trim().max(60).optional()),
  fuelType: z.preprocess(blank, z.string().trim().max(20).optional()),
  coverType: z.enum(["NEW", "RENEWAL", "COMPREHENSIVE", "THIRD_PARTY", "ADD_ON"]),
  existingInsurance: z.enum(["NONE", "ACTIVE", "EXPIRED", "UNKNOWN"]).optional(),
  policyExpiry: z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid expiry date").optional()),
  hadClaim: z.boolean().optional(),
  contactPreference: z.enum(["PHONE", "WHATSAPP", "EMAIL"]).optional(),
  message: z.preprocess(blank, z.string().trim().max(1000).optional()),
  // Must be exactly true: consent is never defaulted or inferred.
  consent: z.literal(true, {
    message: "Please agree to be contacted and to share your details with an insurance partner",
  }),
});

/**
 * POST /api/insurance — send an insurance enquiry to be referred to a partner.
 * Open to guests; if the visitor is signed in their token is forwarded so NestJS
 * records them as the owner (and they can track it). The owner is never a body
 * field. NestJS owns the record and returns the real reference number.
 */
export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 5, key: "insurance" })).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = insuranceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  }
  const session = await verifySession(readSessionCookie(request));
  try {
    const enquiry = await backendFetch("/insurance-enquiries", {
      method: "POST",
      token: session?.token ?? null,
      body: parsed.data,
    });
    return NextResponse.json({ data: enquiry }, { status: 201 });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

/** GET /api/insurance — admin: search, filter and page the enquiries (with status counts). */
export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  const q = adminListQuery(new URL(request.url).searchParams);
  try {
    // raw: the totals and per-status counts live in `meta`.
    const res = await backendFetch<{ data?: unknown[]; meta?: unknown }>(
      `/insurance-enquiries${q.toString() ? `?${q}` : ""}`,
      { token: auth.session.token, raw: true },
    );
    return NextResponse.json({ enquiries: res?.data ?? [], meta: res?.meta ?? null });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
