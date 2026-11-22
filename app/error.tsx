"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

/**
 * Route-level error boundary. Shown when a page throws while rendering, for
 * example when a server component cannot reach the API. Keeps the visitor in
 * the site with a clear retry instead of a blank screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Only the digest is logged; the message may contain internal details.
    console.error("Route error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--color-content))] sm:text-3xl">
        We couldn&apos;t load this page
      </h1>
      <p className="mt-3 max-w-md text-sm text-[hsl(var(--color-content-muted))]">
        Something went wrong on our side. Your information is safe. Please try again, or
        come back in a minute.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="btn btn-primary inline-flex min-h-11 items-center gap-2 px-5 py-2.5 text-sm font-bold"
        >
          <RefreshCw size={14} aria-hidden="true" />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-xl border border-[hsl(var(--color-line))] px-5 py-2.5 text-sm font-semibold text-[hsl(var(--color-content))] transition hover:border-[hsl(var(--color-line-hover))]"
        >
          Go to home page
        </Link>
      </div>
    </div>
  );
}
