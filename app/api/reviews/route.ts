import { NextResponse } from "next/server";
import { z } from "zod";

import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";
import { enforceRateLimit } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Reviews for a vehicle.
 *
 * The NestJS backend owns reviews (Review model, one per user per vehicle) and
 * exposes them on the vehicle detail payload. This route exposes a small
 * read/create surface over that same backend — there is no second store.
 */

const createSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().or(z.literal("")),
});

export interface UiReview {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  authorName: string | null;
}

interface BackendReview {
  id: number;
  rating: number;
  comment?: string | null;
  createdAt: string;
  user?: { firstName?: string | null; lastName?: string | null } | null;
}

/** Never expose a full name; show initials instead. */
function initials(u?: { firstName?: string | null; lastName?: string | null } | null): string | null {
  if (!u) return null;
  const first = (u.firstName ?? "").trim();
  const last = (u.lastName ?? "").trim();
  if (!first && !last) return null;
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function map(r: BackendReview): UiReview {
  return {
    id: r.id,
    rating: r.rating,
    comment: r.comment ?? null,
    createdAt: r.createdAt,
    authorName: initials(r.user),
  };
}

/** GET /api/reviews?vehicleId=1 — public list for a vehicle. */
export async function GET(request: Request) {
  const vehicleId = new URL(request.url).searchParams.get("vehicleId");
  if (!vehicleId) {
    return NextResponse.json({ error: "vehicleId is required" }, { status: 400 });
  }

  try {
    // GET /reviews is staff-only on the backend, so read the reviews from the
    // public vehicle detail instead — same rows, no auth wall, and it keeps a
    // single source of truth on the backend.
    const vehicle = await backendFetch<{ reviews?: BackendReview[] }>(
      `/vehicles/${vehicleId}`,
    );
    return NextResponse.json({ reviews: (vehicle?.reviews ?? []).map(map) });
  } catch (err) {
    if (!isBackendUnreachable(err) && err instanceof BackendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Reviews are temporarily unavailable." },
      { status: 503 },
    );
  }
}

/** POST /api/reviews — authenticated customer submits a review. */
export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 5, key: "reviews" })).ok) {
    return NextResponse.json(
      { error: "Too many requests, try again later" },
      { status: 429 },
    );
  }

  const session = await verifySession(readSessionCookie(request));
  if (!session) {
    return NextResponse.json(
      { error: "Sign in to write a review" },
      { status: 401 },
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

  if (!session.token) {
    return NextResponse.json(
      { error: "Reviews require a linked account." },
      { status: 401 },
    );
  }

  try {
    const created = await backendFetch<BackendReview>("/reviews", {
      method: "POST",
      token: session.token,
      body: {
        vehicleId: parsed.data.vehicleId,
        rating: parsed.data.rating,
        comment: parsed.data.comment || undefined,
      },
    });
    return NextResponse.json({ review: map(created) }, { status: 201 });
  } catch (err) {
    if (!isBackendUnreachable(err) && err instanceof BackendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Could not submit the review." },
      { status: 503 },
    );
  }
}
