import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/server/prisma";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { audit, clientIp } from "@/app/server/audit";
import { requireAdmin } from "@/app/server/authz";

const dealerSchema = z.object({
  businessName: z.string().trim().min(1).max(200),
  ownerName: z.string().trim().min(1).max(120),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be a valid 10-digit Indian mobile number'),
  email: z.string().trim().toLowerCase().email(),
  country: z.string().trim().max(100).default("India"),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(300),
  pincode: z.string().trim().min(1).max(10),
  gstNumber: z.string().trim().max(30).optional(),
});

const approveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

/** Normalize a phone number for storage + duplicate comparison: strip spaces, dashes, parens, +91 prefix. */
function normalizePhone(raw: string): string {
  let cleaned = raw.trim().replace(/[\s\-()]/g, "");
  // Remove +91 or 91 prefix if present
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

/**
 * POST /api/dealer/register — public: submit a dealer onboarding request.
 * Status defaults to PENDING; an admin must approve before the dealer can
 * publish inventory.
 */
export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 3, key: "dealer-register" })).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  try {
    const parsed = dealerSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    const clean = { ...parsed.data, phone: normalizePhone(parsed.data.phone) };
// The Dealer table stores no email — contact lives on the linked User account
      // (Dealer.userId) and `phone` is the business contact for onboarding. So
      // duplicate detection is by phone.
      const phoneExists = await prisma.dealer.findFirst({ where: { phone: clean.phone } });
      if (phoneExists) return NextResponse.json({ error: "A dealer with this phone number already exists" }, { status: 409 });
      const dealer = await prisma.dealer.create({
        data: {
          businessName: clean.businessName,
          phone: clean.phone,
          address: clean.address,
          city: clean.city,
          state: clean.state,
          pincode: clean.pincode,
          status: "PENDING",
        },
      });
    await audit({ action: "DEALER_REGISTER", entity: "Dealer", entityId: dealer.id, ipAddress: clientIp(request) });
    return NextResponse.json({ data: { id: dealer.id, status: dealer.status } }, { status: 201 });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "A dealer with these details already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to register dealer" }, { status: 500 });
  }
}

/** GET /api/dealer/register — admin: list dealer applications. */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const status = new URL(request.url).searchParams.get("status");
  const dealers = await prisma.dealer.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
select: {
        id: true, businessName: true, phone: true,
        city: true, state: true, address: true, pincode: true,
        isVerified: true, status: true, createdAt: true,
      },
  });
  return NextResponse.json({ dealers });
}

/** PATCH /api/dealer/register — admin: approve or reject a dealer. */
export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { id } = body;
    if (!id || typeof id !== "number") {
      return NextResponse.json({ error: "Dealer id is required" }, { status: 400 });
    }
    const parsed = approveSchema.safeParse({ status: body.status });
    if (!parsed.success) {
      return NextResponse.json({ error: "Status must be APPROVED or REJECTED" }, { status: 400 });
    }

    const dealer = await prisma.dealer.findUnique({ where: { id } });
    if (!dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 });
    }

// No `approvedAt` column: Dealer carries `isVerified` + `status` only, and the
      // decision time is the AuditLog entry written below.
      const updated = await prisma.dealer.update({
        where: { id },
        data: {
          status: parsed.data.status,
          isVerified: parsed.data.status === "APPROVED",
        },
      });

    await audit({
      action: parsed.data.status === "APPROVED" ? "DEALER_APPROVE" : "DEALER_REJECT",
      entity: "Dealer",
      entityId: dealer.id,
      ipAddress: clientIp(request),
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("Failed to update dealer status:", err);
    return NextResponse.json({ error: "Unable to update dealer status" }, { status: 500 });
  }
}
