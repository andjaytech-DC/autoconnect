import { NextResponse } from "next/server";

import { backendErrorResponse } from "@/app/lib/bff-errors";
import { backendUpload } from "@/app/lib/backend-multipart";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { requireRole } from "@/app/server/authz";

/**
 * POST /api/upload — forwards one image to NestJS, which validates, re-encodes
 * (1600px WebP + 400px thumbnail), stores it and records who uploaded it.
 *
 * This route keeps no files and no ownership state. It only gates the role,
 * rejects obviously wrong requests before a 10 MB body is forwarded, and
 * returns `{ url, thumbUrl, size }`.
 */
export const runtime = "nodejs";

const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  // Role first, so the answer cannot depend on the payload.
  const auth = await requireRole(request, "ADMIN", "DEALER");
  if (!auth.ok) return auth.response;
  if (!auth.session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }

  if (!(await enforceRateLimit(request, { limit: 60, windowMs: 60_000, key: "upload" })).ok) {
    return NextResponse.json({ error: "Too many uploads, try again shortly" }, { status: 429 });
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type.toLowerCase())) {
    return NextResponse.json({ error: "Invalid format. Allowed: jpg, jpeg, png, webp" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 413 });
  }

  try {
    const out = new FormData();
    out.append("file", file, file.name);
    const stored = await backendUpload<{ url: string; thumbUrl: string; size: number }>(
      "/uploads/images",
      out,
      auth.session.token,
    );
    return NextResponse.json(
      { url: stored.url, thumbUrl: stored.thumbUrl, size: stored.size },
      { status: 201 },
    );
  } catch (err) {
    return backendErrorResponse(err);
  }
}
