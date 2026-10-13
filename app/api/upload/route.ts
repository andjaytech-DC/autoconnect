import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { requireAdminOrDealer } from "@/app/server/authz";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { checkUploadQuota, registerUpload } from "@/app/server/uploads";

/**
 * POST /api/upload — image upload with validation, compression and thumbnails.
 *
 * - ADMIN vehicle manager or DEALER inventory form only (uploading is a
 *   privileged action; a plain customer session has no reason to write assets).
 * - Accepts jpg/jpeg/png/webp up to 10 MB.
 * - Compresses to a max 1600px-wide WebP; generates a 400px thumbnail.
 * - Bounded by a per-user request rate and a rolling daily byte/count budget.
 * - Development storage: public/uploads (served statically).
 * - Production: set CLOUDINARY_* env vars and swap `persist()` for the
 *   Cloudinary upload stream (the handler returns the same { url, thumbUrl }).
 */
export const runtime = "nodejs";

const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await verifySession(readSessionCookie(request));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Uploading is an inventory-management capability. The check happens before
  // the body is read so the answer cannot depend on the payload.
  if (session.role !== "ADMIN" && session.role !== "DEALER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!(await enforceRateLimit(request, { limit: 60, windowMs: 60_000, key: "upload" })).ok) {
    return NextResponse.json(
      { error: "Too many uploads, try again shortly" },
      { status: 429 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid format. Allowed: jpg, jpeg, png, webp" },
        { status: 415 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 413 });
    }

    const quota = checkUploadQuota(session.id, file.size);
    if (!quota.ok) {
      return NextResponse.json({ error: quota.reason }, { status: 429 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Compress: cap width at 1600px, convert to WebP for size.
    const compressed = await sharp(buffer)
      .rotate() // respect EXIF orientation
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    // Thumbnail: 400px wide.
    const thumb = await sharp(buffer)
      .rotate()
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();

    const name = crypto.randomBytes(8).toString("hex");
    const url = await persist(`${name}.webp`, compressed);
    const thumbUrl = await persist(`${name}_thumb.webp`, thumb);

    // Track both files as unattached so /api/upload/cleanup can prove the
    // caller owns them if the form that created them is discarded.
    registerUpload(url, session.id, compressed.length);
    registerUpload(thumbUrl, session.id, thumb.length);

    return NextResponse.json({ url, thumbUrl, size: compressed.length }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

/** Persist bytes and return the public URL. Local FS in dev; Cloudinary in prod. */
async function persist(filename: string, data: Buffer): Promise<string> {
  if (process.env.CLOUDINARY_URL) {
    // Production: upload via Cloudinary REST API (unsigned preset).
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const preset = process.env.CLOUDINARY_UPLOAD_PRESET;
    if (cloudName && preset) {
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(data)], { type: "image/webp" }), filename);
      form.append("upload_preset", preset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        const json = (await res.json()) as { secure_url?: string };
        if (json.secure_url) return json.secure_url;
      }
      console.error("Cloudinary upload failed, falling back to local storage");
    }
  }

  // Development: local uploads folder.
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), data);
  return `/uploads/${filename}`;
}
