import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { requireAdminSession } from "@/app/server/authz";

export const runtime = "nodejs";

const leadSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  customerName: z.string().min(1).max(120),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().trim().regex(/^\d{10}$/, "Phone must be a valid 10-digit Indian mobile number"),
  message: z.string().max(2000).optional(),
});

/** POST /api/leads — public: create a contact lead for a vehicle. NestJS owns the record. */
export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 10, key: "leads" })).ok) {
    return NextResponse.json(
      { error: "Too many requests, try again later" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  // A signed-in caller's token lets NestJS record them as the owner; guests
  // still enquire anonymously.
  const session = await verifySession(readSessionCookie(request));

  try {
    const lead = await backendFetch("/leads", {
      method: "POST",
      token: session?.token ?? null,
      body: {
        vehicleId: parsed.data.vehicleId,
        customerName: parsed.data.customerName,
        customerEmail: parsed.data.customerEmail || undefined,
        customerPhone: parsed.data.customerPhone,
        message: parsed.data.message || undefined,
      },
    });
    return NextResponse.json({ data: lead, source: "backend" }, { status: 201 });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

/** GET /api/leads — admin: list leads with an optional status filter. */
export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  const token = auth.session.token;
  if (!token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  const status = new URL(request.url).searchParams.get("status");

  try {
    const leads = await backendFetch<unknown[]>(
      `/leads${status ? `?status=${encodeURIComponent(status)}` : ""}`,
      { token },
    );
    return NextResponse.json({ leads: leads ?? [], source: "backend" });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
