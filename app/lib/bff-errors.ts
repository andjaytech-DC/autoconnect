import { NextResponse } from "next/server";

import { BackendError } from "@/app/lib/backend";

/**
 * Turn an error from `backendFetch` into the response a BFF route should send.
 *
 * Next.js holds no data of its own, so there is nothing to fall back to when
 * NestJS cannot answer. The honest answers are:
 *
 *   - unreachable (status 0)  → 503, so the client can say "try again"
 *   - the backend refused     → its own 4xx status and message, unchanged
 *                               (400 validation, 401 expired token, 403, 404,
 *                               409, 429 …)
 *   - the backend crashed     → 502 with a generic message; a backend 5xx body
 *                               is not something to show a visitor
 */
export function backendErrorResponse(err: unknown): NextResponse {
  if (err instanceof BackendError) {
    if (err.status === 0) {
      return NextResponse.json(
        { error: "The service is temporarily unavailable. Please try again shortly." },
        { status: 503 },
      );
    }
    if (err.status >= 500) {
      return NextResponse.json(
        { error: "The service had a problem with that request. Please try again." },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[bff]", err);
  return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
}
