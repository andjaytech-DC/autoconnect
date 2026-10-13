import { NextResponse } from "next/server";
import { z } from "zod";

import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";
import {
  addToWishlist,
  listWishlist,
  removeFromWishlist,
} from "@/app/server/wishlist";

export const runtime = "nodejs";

const addSchema = z.object({ carId: z.number().int().positive() });

interface BackendWishlistItem {
  id: number;
  vehicleId: number;
  createdAt: string;
}

/** Map a backend wishlist row to the UI item shape ({ id, carId, addedAt }). */
function mapItem(item: BackendWishlistItem) {
  return {
    id: String(item.id),
    carId: item.vehicleId,
    addedAt: item.createdAt,
  };
}

async function userId(request: Request): Promise<{
  id: string;
  token?: string;
} | null> {
  const session = await verifySession(readSessionCookie(request));
  if (!session) return null;
  return { id: session.id, token: session.token };
}

export async function GET(request: Request) {
  const user = await userId(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 1) NestJS backend (authoritative)
  if (user.token) {
    try {
      const items = await backendFetch<BackendWishlistItem[]>("/wishlist", {
        token: user.token,
      });
      return NextResponse.json({
        items: (items ?? []).map(mapItem),
        source: "backend",
      });
    } catch (err) {
      if (!isBackendUnreachable(err) && err instanceof BackendError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
    }
  }

  // 2) Local fallback
  return NextResponse.json({ items: await listWishlist(user.id), source: "local" });
}

export async function POST(request: Request) {
  const user = await userId(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

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

  // 1) NestJS backend (authoritative)
  if (user.token) {
    try {
      const item = await backendFetch<BackendWishlistItem>("/wishlist", {
        method: "POST",
        token: user.token,
        body: { vehicleId: parsed.data.carId },
      });
      return NextResponse.json(
        { item: mapItem(item), source: "backend" },
        { status: 201 },
      );
    } catch (err) {
      if (!isBackendUnreachable(err) && err instanceof BackendError) {
        if (err.status === 400) {
          // Already in wishlist — treat as success (idempotent add).
          return NextResponse.json({ alreadySaved: true, source: "backend" });
        }
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
    }
  }

  // 2) Local fallback
  const item = await addToWishlist(user.id, parsed.data.carId);
  return NextResponse.json(
    item ? { item, source: "local" } : { alreadySaved: true, source: "local" },
    { status: item ? 201 : 200 },
  );
}

export async function DELETE(request: Request) {
  const user = await userId(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const carId = Number(new URL(request.url).searchParams.get("carId"));
  if (!Number.isInteger(carId) || carId <= 0) {
    return NextResponse.json({ error: "A valid carId is required" }, { status: 400 });
  }

  // 1) NestJS backend (authoritative)
  if (user.token) {
    try {
      await backendFetch(`/wishlist/vehicle/${carId}`, {
        method: "DELETE",
        token: user.token,
      });
      return NextResponse.json({ removed: true, source: "backend" });
    } catch (err) {
      if (!isBackendUnreachable(err) && err instanceof BackendError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
    }
  }

  // 2) Local fallback
  const removed = await removeFromWishlist(user.id, carId);
  return NextResponse.json({ removed, source: "local" });
}