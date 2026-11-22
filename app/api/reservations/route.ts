import { NextResponse } from "next/server";
import { z } from "zod";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { requireUser } from "@/app/server/authz";

export const runtime = "nodejs";

/**
 * Vehicle reservations live in NestJS. A reservation always belongs to a
 * signed-in customer: the owner comes from the forwarded token, never the body.
 */

const createSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  note: z.string().trim().max(500).optional(),
});

async function authenticate(request: Request) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return { response: auth } as const;
  if (!auth.session.token) {
    return {
      response: NextResponse.json({ error: "Please sign in again" }, { status: 401 }),
    } as const;
  }
  return { token: auth.session.token, userId: auth.session.id } as const;
}

/** GET /api/reservations — the caller's own reservations. */
export async function GET(request: Request) {
  const who = await authenticate(request);
  if ("response" in who) return who.response;
  try {
    const items = await backendFetch<unknown[]>("/reservations/mine", { token: who.token });
    return NextResponse.json({ reservations: items ?? [] });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

/** POST /api/reservations — hold an available vehicle. */
export async function POST(request: Request) {
  const who = await authenticate(request);
  if ("response" in who) return who.response;

  const gate = await enforceRateLimit(request, {
    limit: 10,
    key: "reservations",
    identifier: `user:${who.userId}`,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many requests, try again later" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const created = await backendFetch<unknown>("/reservations", {
      method: "POST",
      token: who.token,
      body: parsed.data,
    });
    return NextResponse.json({ reservation: created }, { status: 201 });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

/** DELETE /api/reservations?id=3 — cancel your own reservation. */
export async function DELETE(request: Request) {
  const who = await authenticate(request);
  if ("response" in who) return who.response;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid reservation id" }, { status: 400 });
  }
  try {
    await backendFetch(`/reservations/${Number(id)}`, { method: "DELETE", token: who.token });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
