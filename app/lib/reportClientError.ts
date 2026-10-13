'use client';

/**
 * Lightweight client-side error beacon.
 *
 * When a data fetch fails (network, HTML error page, empty body), call this
 * so the failure is recorded server-side instead of being silently swallowed
 * by defensive fallbacks. Fire-and-forget with `keepalive` so it still sends
 * during tab close. Extend with your APM/Sentry sink here.
 */
export function reportClientError(info: {
  message: string;
  route: string;
  status?: number | null;
  code?: string | null;
  url?: string;
}): void {
  if (process.env.NODE_ENV === "development") {
    console.error("[client-error]", info);
  }
  try {
    void fetch("/api/telemetry/error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(info),
      keepalive: true,
    });
  } catch {
    /* metrics must never throw */
  }
}