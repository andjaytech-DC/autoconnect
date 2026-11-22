import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { requireAdminSession } from "@/app/server/authz";

export const runtime = "nodejs";

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

/** Normalize a phone number: strip spaces, dashes, parens and the +91 prefix. */
function normalizePhone(raw: string): string {
  let cleaned = raw.trim().replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

/**
 * POST /api/dealer/register — public: submit a dealer onboarding request.
 * NestJS stores it as PENDING; an admin must approve it before the dealer can
 * publish inventory.
 */
export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 3, key: "dealer-register" })).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = dealerSchema.safeParse(
    body && typeof body === "object" && "phone" in body && typeof (body as { phone: unknown }).phone === "string"
      ? { ...body, phone: normalizePhone((body as { phone: string }).phone) }
      : body,
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  }
  const { country: _country, ...fields } = parsed.data;
  try {
    const dealer = await backendFetch<{ id: number; status: string }>("/dealers/apply", {
      method: "POST",
      body: fields,
    });
    return NextResponse.json({ data: { id: dealer.id, status: dealer.status } }, { status: 201 });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

/** GET /api/dealer/register — admin: list dealer applications. */
export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  const status = new URL(request.url).searchParams.get("status");
  try {
    const dealers = await backendFetch<unknown[]>(
      `/dealers/admin/applications${status ? `?status=${encodeURIComponent(status)}` : ""}`,
      { token: auth.session.token },
    );
    return NextResponse.json({ dealers: dealers ?? [] });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

/** PATCH /api/dealer/register — admin: approve or reject a dealer. */
export async function PATCH(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }

  let body: { id?: unknown; status?: unknown };
  try {
    body = (await request.json()) as { id?: unknown; status?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.id !== "number" || !Number.isInteger(body.id) || body.id <= 0) {
    return NextResponse.json({ error: "Dealer id is required" }, { status: 400 });
  }
  const parsed = approveSchema.safeParse({ status: body.status });
  if (!parsed.success) {
    return NextResponse.json({ error: "Status must be APPROVED or REJECTED" }, { status: 400 });
  }

  try {
    const updated = await backendFetch<unknown>(`/dealers/${body.id}/status`, {
      method: "PATCH",
      token: auth.session.token,
      body: { status: parsed.data.status },
    });
    return NextResponse.json({ data: updated });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
