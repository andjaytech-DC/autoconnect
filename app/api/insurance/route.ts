import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/server/prisma";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { audit, clientIp } from "@/app/server/audit";
import { requireAdmin } from "@/app/server/authz";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

const insuranceSchema = z.object({
  customerName: z.string().min(1).max(120),
  phone: z.string().min(7).max(20).transform(normalizePhone).pipe(z.string().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number")),
  email: z.string().email().optional().or(z.literal("")),
  registrationNo: z.string().max(20).optional(),
  coverType: z.enum(["NEW", "RENEWAL", "THIRD_PARTY", "COMPREHENSIVE"]),
  message: z.string().max(1000).optional(),
});

/** POST /api/insurance — public: submit an insurance enquiry. */
export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 5, key: "insurance" })).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  try {
    const parsed = insuranceSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    const { customerName, phone, email, registrationNo, coverType, message } = parsed.data;
    const enquiry = await prisma.insuranceEnquiry.create({
      data: { customerName, phone, email: email || null, registrationNo: registrationNo || null, coverType, message: message || null },
    });
    await audit({ action: "INSURANCE_ENQUIRY", entity: "InsuranceEnquiry", entityId: enquiry.id, ipAddress: clientIp(request) });
    return NextResponse.json({ data: enquiry }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to submit enquiry" }, { status: 500 });
  }
}

/** GET /api/insurance — admin: list insurance enquiries. */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const status = new URL(request.url).searchParams.get("status");
  const items = await prisma.insuranceEnquiry.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ enquiries: items });
}
