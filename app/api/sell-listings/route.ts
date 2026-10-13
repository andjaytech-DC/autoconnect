import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/server/prisma";
import { requireAdminSession } from "@/app/server/authz";
import { enforceRateLimit } from "@/app/lib/rate-limit";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

const sellSchema = z.object({
  ownerName: z.string().min(1).max(120),
  phone: z.string().min(7).max(20).transform(normalizePhone).pipe(z.string().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number")),
  email: z.string().email().optional().or(z.literal("")),
  vehicleData: z.object({
    make: z.string().min(1).max(80),
    model: z.string().min(1).max(80),
    /**
     * Optional descriptive fields collected by the redesigned valuation form.
     * They live in the `vehicleData` JSON column, so adding them needs no schema
     * change and older clients that omit them keep working.
     */
    variant: z.string().trim().max(80).optional(),
    year: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
    mileage: z.coerce.number().int().min(0),
    /**
     * Sellers may not have a figure in mind; the redesigned form treats this as
     * optional and sends 0. Previously required, so it is defaulted rather than
     * rejected to stay backward compatible.
     */
    expectedPrice: z.coerce.number().int().min(0).optional().default(0),
    city: z.string().min(1).max(80),
    state: z.string().trim().max(80).optional(),
    fuel: z.string().max(20).optional(),
    transmission: z.string().max(20).optional(),
    ownership: z.string().trim().max(40).optional(),
    condition: z.string().trim().max(60).optional(),
    /**
     * Registration number captured on the homepage valuation form (`/sell?q=…`).
     * Optional so existing clients keep working; stored alongside the rest of
     * the vehicle payload in the JSON column.
     */
    registration: z
      .string()
      .trim()
      .max(20)
      .regex(/^[A-Za-z0-9 -]*$/, "Enter a valid registration number")
      .optional()
      .transform((v) => (v ? v.toUpperCase() : undefined)),
  }),
  images: z.array(z.string()).max(12).optional(),
});

/** POST /api/sell-listings — public: submit a "Sell My Car" evaluation request. */
export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 5, key: "sell" })).ok) {
    return NextResponse.json({ error: "Too many requests, try again later" }, { status: 429 });
  }
  try {
    const parsed = sellSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { ownerName, phone, email, vehicleData, images } = parsed.data;
    const listing = await prisma.sellerListing.create({
      data: { ownerName, phone, email: email || null, vehicleData, images: images ?? [] },
    });
    return NextResponse.json({ data: listing }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to submit listing" }, { status: 500 });
  }
}

/** GET /api/sell-listings — admin: list seller listings. */
export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  const items = await prisma.sellerListing.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ listings: items });
}
