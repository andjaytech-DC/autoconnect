import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/server/prisma";
import { requireAdminSession } from "@/app/server/authz";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";

export const runtime = "nodejs";

const leadSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  customerName: z.string().min(1).max(120),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().trim().regex(/^\d{10}$/, "Phone must be a valid 10-digit Indian mobile number"),
  message: z.string().max(2000).optional(),
});

/** POST /api/leads — public: create a contact lead for a vehicle (backend first). */
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

  // 1) NestJS backend (authoritative)
  try {
    const lead = await backendFetch("/leads", {
      method: "POST",
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
    if (!isBackendUnreachable(err) && err instanceof BackendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // Backend unreachable — vehicles don't exist in local DB, so skip Prisma fallback
    return NextResponse.json({ error: "Service temporarily unavailable. Please try again." }, { status: 503 });
  }
}

/** GET /api/leads — admin: list leads with optional status filter (backend first). */
export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  const session = auth.session;
  const status = new URL(request.url).searchParams.get("status");

  // 1) NestJS backend (authoritative)
  if (session.token) {
    try {
      const leads = await backendFetch(
        `/leads${status ? `?status=${encodeURIComponent(status)}` : ""}`,
        { token: session.token },
      );
      return NextResponse.json({ leads: leads ?? [], source: "backend" });
    } catch (err) {
      if (!isBackendUnreachable(err) && err instanceof BackendError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
    }
  }

  // 2) Local fallback
  const rows = await prisma.lead.findMany({
    where: status ? { status: status as never } : undefined,
    include: { vehicle: { select: { id: true, title: true, price: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ leads: rows, source: "local" });
}