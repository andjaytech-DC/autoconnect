import { NextResponse } from "next/server";
import { z } from "zod";

import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { backendFetch, BackendError } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";

export const runtime = "nodejs";

const addSchema = z.object({ carId: z.number().int().positive() });

interface BackendWishlistItem {
  id: number;
  vehicleId: number;
  createdAt: string;
}

/** Map a backend wishlist row to the UI item shape ({ id, carId, addedAt }). */
function mapItem(item: BackendWishlistItem) {
  return { id: String(item.id), carId: item.vehicleId, addedAt: item.createdAt };
}

/** The wishlist is per-account and lives in NestJS; there is no local copy. */
type Who = { response: Response } | { token: string };

async function authenticate(request: Request): Promise<Who> {
  const session = await verifySession(readSessionCookie(request));
  if (!session) {
    return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  if (!session.token) {
    return { response: NextResponse.json({ error: "Please sign in again" }, { status: 401 }) };
  }
  return { token: session.token };
}

export async function GET(request: Request) {
  const who = await authenticate(request);
  if ("response" in who) return who.response;
  try {
    const items = await backendFetch<BackendWishlistItem[]>("/wishlist", { token: who.token });
    return NextResponse.json({ items: (items ?? []).map(mapItem), source: "backend" });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

export async function POST(request: Request) {
  const who = await authenticate(request);
  if ("response" in who) return who.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid carId is required" }, { status: 400 });
  }

  try {
    const item = await backendFetch<BackendWishlistItem>("/wishlist", {
      method: "POST",
      token: who.token,
      body: { vehicleId: parsed.data.carId },
    });
    return NextResponse.json({ item: mapItem(item), source: "backend" }, { status: 201 });
  } catch (err) {
    // 409 is NestJS saying it is already saved — adding twice is a success.
    // Every other refusal (unknown car, a dealer's own car, ...) is reported.
    if (err instanceof BackendError && err.status === 409) {
      return NextResponse.json({ alreadySaved: true, source: "backend" });
    }
    return backendErrorResponse(err);
  }
}

export async function DELETE(request: Request) {
  const who = await authenticate(request);
  if ("response" in who) return who.response;

  const carId = Number(new URL(request.url).searchParams.get("carId"));
  if (!Number.isInteger(carId) || carId <= 0) {
    return NextResponse.json({ error: "A valid carId is required" }, { status: 400 });
  }

  try {
    await backendFetch(`/wishlist/vehicle/${carId}`, { method: "DELETE", token: who.token });
    return NextResponse.json({ removed: true, source: "backend" });
  } catch (err) {
    // Removing something that is not saved leaves the wishlist as asked.
    if (err instanceof BackendError && err.status === 404) {
      return NextResponse.json({ removed: false, source: "backend" });
    }
    return backendErrorResponse(err);
  }
}
