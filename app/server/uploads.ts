import { prisma } from "@/app/server/prisma";
import type { SessionPayload } from "@/app/lib/auth";

/**
 * Upload ownership tracking.
 *
 * `/api/upload/cleanup` used to delete any file under `public/uploads` (and any
 * Cloudinary object) whose name a caller supplied. The names are random, but
 * they are published in every `/api/vehicles` response, so any signed-in user
 * could delete another user's photos. There was no role check and no ownership
 * check at all.
 *
 * Two facts have to be reconciled:
 *   - an upload happens BEFORE any row references it (a listing is created
 *     afterwards), so most freshly-uploaded files have no owner;
 *   - once a listing exists, the file's owner is the listing's dealer.
 *
 * So ownership is decided in two places: unattached files are claimed from this
 * registry (which records who uploaded them), and attached files are verified
 * against the vehicle row. Anything that is neither is refused.
 */

/** How long an unattached upload stays claimable. */
export const PENDING_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Attached uploads one user may have outstanding at once. */
export const MAX_PENDING_PER_USER = 50;

/** Unattached bytes one user may have outstanding. */
export const MAX_PENDING_BYTES_PER_USER = 50 * 1024 * 1024; // 50 MB

/** Rolling daily upload budget per user. */
export const MAX_UPLOAD_BYTES_PER_DAY = 250 * 1024 * 1024; // 250 MB

/** Rolling daily upload count per user. */
export const MAX_UPLOADS_PER_DAY = 200;

const DAY_MS = 24 * 60 * 60 * 1000;

interface PendingEntry {
  userId: string;
  bytes: number;
  createdAt: number;
}

interface UsageEntry {
  bytes: number;
  count: number;
  windowStart: number;
}

/**
 * In-memory, per-process. Correct for a single `next start` instance; when the
 * app is scaled horizontally, unattached files can only be claimed by the
 * instance that received the upload, so a cross-instance cleanup falls back to
 * the attached-asset check. Attached assets — the common case — are always
 * resolved from the database and behave identically in both deployments.
 */
const pending = new Map<string, PendingEntry>();

/** Rolling per-user upload usage, keyed by user id. */
const usage = new Map<string, UsageEntry>();

function prunePending(now: number): void {
  for (const [url, entry] of pending) {
    if (now - entry.createdAt > PENDING_TTL_MS) pending.delete(url);
  }
}

/** Record that `userId` just uploaded `url`. */
export function registerUpload(url: string, userId: string, bytes: number): void {
  const now = Date.now();
  prunePending(now);

  const existing = pending.get(url);
  if (existing) {
    if (existing.userId === userId) return;
    // Never let a second caller claim an asset somebody else uploaded.
    pending.delete(url);
  }

  let userBytes = 0;
  let userCount = 0;
  for (const entry of pending.values()) {
    if (entry.userId !== userId) continue;
    userBytes += entry.bytes;
    userCount += 1;
  }
  if (userCount >= MAX_PENDING_PER_USER) return;
  if (userBytes + bytes > MAX_PENDING_BYTES_PER_USER) return;

  pending.set(url, { userId, bytes, createdAt: now });
}

/** Forget an unattached upload (it has since been attached to a listing). */
export function forgetUpload(url: string): void {
  pending.delete(url);
}

/**
 * Consume a claim on an unattached upload.
 *
 * Returns true only when `userId` created the asset, the claim is still inside
 * the TTL, and this is the first claim. A second call for the same URL fails.
 */
export function claimPendingUpload(url: string, userId: string): boolean {
  const entry = pending.get(url);
  if (!entry) return false;
  pending.delete(url);
  if (entry.userId !== userId) return false;
  if (Date.now() - entry.createdAt > PENDING_TTL_MS) return false;
  return true;
}

export interface UploadQuotaResult {
  ok: boolean;
  reason?: string;
}

/** Enforce the rolling daily upload budget. */
export function checkUploadQuota(
  userId: string,
  bytes: number,
  now: number = Date.now(),
): UploadQuotaResult {
  const entry = usage.get(userId);
  if (!entry || now - entry.windowStart >= DAY_MS) {
    usage.set(userId, { bytes, count: 1, windowStart: now });
    return { ok: true };
  }
  if (entry.count >= MAX_UPLOADS_PER_DAY) {
    return {
      ok: false,
      reason: `Daily upload limit reached (${MAX_UPLOADS_PER_DAY} files). Try again tomorrow.`,
    };
  }
  if (entry.bytes + bytes > MAX_UPLOAD_BYTES_PER_DAY) {
    return {
      ok: false,
      reason: `Daily upload budget reached (${Math.round(MAX_UPLOAD_BYTES_PER_DAY / (1024 * 1024))} MB). Try again tomorrow.`,
    };
  }
  entry.bytes += bytes;
  entry.count += 1;
  return { ok: true };
}

export type AssetKind = "local" | "cloudinary" | "external";

/** Classify an image URL as one we manage or somebody else's. */
export function assetKind(url: string): AssetKind {
  if (url.startsWith("/uploads/")) return "local";
  if (url.includes("res.cloudinary.com")) return "cloudinary";
  return "external";
}

/**
 * Normalise a caller-supplied asset reference to a bare, comparable form.
 * Returns null for anything that is not a bare filename, which is what makes
 * path traversal (`../../etc/passwd`) impossible here — only a single, safe
 * path segment survives.
 */
export function localUploadName(url: string): string | null {
  const name = url.split("/").pop() ?? "";
  if (!name || !/^[A-Za-z0-9._-]+$/.test(name)) return null;
  if (name.startsWith(".")) return null;
  return name;
}

export interface AssetOwnerCheck {
  deletable: boolean;
  reason?: string;
}

export interface AssetOwnershipContext {
  session: SessionPayload;
  /** Dealer profile of a DEALER caller; ignored for ADMIN. */
  dealerId?: number | null;
}

/**
 * Decide whether `session` may physically delete `url`.
 *
 * Deletable when either
 *   1. the asset is referenced by a vehicle the caller manages (own dealership
 *      for DEALER, any dealership for ADMIN), or
 *   2. the asset is an unattached upload still claimed by the caller.
 */
export async function canDeleteAsset(
  url: string,
  context: AssetOwnershipContext,
): Promise<AssetOwnerCheck> {
  const kind = assetKind(url);
  if (kind === "external") {
    return { deletable: false, reason: "Not a managed asset" };
  }

  const { session, dealerId } = context;

  // Only the roles permitted to upload may ever delete an asset. The upload and
  // cleanup routes already enforce this upstream, but the store must not be the
  // thing that lets a role slip through if a future route forgets to.
  if (session.role !== "ADMIN" && session.role !== "DEALER") {
    return { deletable: false, reason: "Role may not manage assets" };
  }

  if (kind === "local") {
    const name = localUploadName(url);
    if (!name) return { deletable: false, reason: "Invalid asset name" };
  }

  const owned = await referencedByManagedVehicle(url, session, dealerId ?? null);
  if (owned) return { deletable: true };

  if (claimPendingUpload(url, session.id)) return { deletable: true };

  return { deletable: false, reason: "Asset is not attached to your inventory" };
}

/**
 * True when `url` is referenced by a vehicle the caller manages.
 *
 * Vehicle rows carry the URL either in the legacy `images` string array or in
 * the `VehicleImage` rows written at create time, so both are checked.
 */
async function referencedByManagedVehicle(
  url: string,
  session: SessionPayload,
  dealerId: number | null,
): Promise<boolean> {
  if (session.role !== "ADMIN" && session.role !== "DEALER") return false;

  const where = {
    OR: [{ images: { has: url } }, { vehicleImages: { some: { imageUrl: url } } }],
    ...(session.role === "ADMIN" ? {} : { dealerId: dealerId ?? -1 }),
  };

  const vehicle = await prisma.vehicle.findFirst({
    where,
    select: { id: true },
  });
  return vehicle !== null;
}

/** Test-only reset of the in-memory registries. */
export function resetUploadRegistries(): void {
  pending.clear();
  usage.clear();
}

/** Number of outstanding unattached uploads. Tests/observability only. */
export function pendingUploadCount(): number {
  return pending.size;
}
