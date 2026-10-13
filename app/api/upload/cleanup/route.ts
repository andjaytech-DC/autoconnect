import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { requireAdminOrDealer } from "@/app/server/authz";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import {
  assetKind,
  canDeleteAsset,
  localUploadName,
} from "@/app/server/uploads";
import { withErrorGuard } from "@/app/lib/route-guard";

export const runtime = "nodejs";

/**
 * POST /api/upload/cleanup — permanently delete managed image assets.
 *
 * Two uses:
 * 1. Orphaned uploads — the client sends the list of /uploads/*.webp files it
 *    created but never attached to a vehicle (form cancelled/discarded).
 * 2. Individual image removal from VehicleForm — the confirmed deletion
 *    triggers physical cleanup of the stored asset (disk file in dev, or the
 *    Cloudinary object in production when CLOUDINARY_* env vars are set).
 *
 * Authorization: ADMIN or DEALER only, and every asset must be provably the
 * caller's — either referenced by a vehicle in the caller's own inventory (any
 * inventory for ADMIN), or an unattached upload this session created. See
 * `app/server/uploads.ts`. Previously any authenticated user could delete any
 * file by name, including another user's photos.
 *
 * Tangential URLs, foreign paths and anything that fails the ownership check
 * are skipped, never deleted.
 */
const handler = async (request: Request): Promise<NextResponse> => {
  const auth = await requireAdminOrDealer(request);
  if (auth instanceof NextResponse) return auth;

  if (!(await enforceRateLimit(request, { limit: 60, windowMs: 60_000, key: "upload-cleanup" })).ok) {
    return NextResponse.json(
      { error: "Too many requests, try again shortly" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const urls = Array.isArray((body as { urls?: unknown })?.urls)
    ? (body as { urls: unknown[] }).urls
    : [];

  // Cap the batch so one request cannot turn into an unbounded unlink loop.
  if (urls.length > 100) {
    return NextResponse.json(
      { error: "Too many assets in one request (max 100)" },
      { status: 400 },
    );
  }

  // Dealers are re-scoped to their own dealership here; ownership checks then
  // resolve the vehicle through this id, never through anything client-supplied.
  let dealerId: number | null = null;
  if (auth.session.role === "DEALER") {
    dealerId = auth.dealer?.id ?? null;
    if (dealerId === null) {
      return NextResponse.json({ error: "Forbidden — no dealer profile" }, { status: 403 });
    }
  }

  let removed = 0;
  for (const raw of urls) {
    if (typeof raw !== "string" || raw === "") continue;

    const check = await canDeleteAsset(raw, {
      session: auth.session,
      dealerId,
    });
    if (!check.deletable) continue;

    if (assetKind(raw) === "cloudinary") {
      if (await destroyCloudinary(raw)) removed += 1;
      continue;
    }

    const name = localUploadName(raw);
    if (!name) continue; // belt and braces: canDeleteAsset already rejected this
    const full = path.join(process.cwd(), "public", "uploads", name);
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    // Refuse anything that escaped the uploads directory.
    if (path.resolve(full) !== path.resolve(uploadsDir, name)) continue;
    try {
      await unlink(full);
      removed += 1;
    } catch {
      /* file already gone — fine */
    }
  }

  return NextResponse.json({ removed });
};

export const POST = withErrorGuard(handler, { route: "api/upload/cleanup" });

/**
 * Best-effort Cloudinary destroy. Needs CLOUDINARY_CLOUD_NAME,
 * CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET (the upload route only needs
 * CLOUDINARY_URL, so destroy silently no-ops when secrets aren't present).
 */
async function destroyCloudinary(url: string): Promise<boolean> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return false;

  // Extract public_id: .../upload/<transformations>/v123/<public_id>.<ext>
  const match = url.match(/\/upload\/(?:[^/]+\/)*v\d+\/(.+?)(?:\.[a-zA-Z0-9]+)?(?:\?.*)?$/);
  const publicId = match?.[1];
  if (!publicId) return false;

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash("sha1")
    .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  try {
    const form = new FormData();
    form.append("public_id", publicId);
    form.append("timestamp", String(timestamp));
    form.append("api_key", apiKey);
    form.append("signature", signature);
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      { method: "POST", body: form },
    );
    const json = (await res.json()) as { result?: string };
    return json.result === "ok";
  } catch {
    return false;
  }
}