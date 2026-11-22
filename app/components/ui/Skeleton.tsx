import type { ReactNode } from "react";

/**
 * Loading placeholders built on the global `.skeleton` shimmer (which already
 * stops under prefers-reduced-motion). Pure server components, so a route's
 * `loading.tsx` can render them instantly.
 *
 * Every wrapper announces itself once as a polite status instead of making a
 * screen reader read dozens of empty blocks.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

function Status({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}

/** Same footprint as <PageHeader>, so the page does not jump when content arrives. */
export function PageHeaderSkeleton() {
  return (
    <div className="bg-ink-900" aria-hidden="true">
      <div className="page-container py-12 lg:py-14">
        <div className="h-3 w-28 rounded bg-white/15" />
        <div className="mt-5 h-9 w-72 max-w-full rounded bg-white/15 sm:h-10" />
        <div className="mt-4 h-4 w-full max-w-xl rounded bg-white/10" />
        <div className="mt-2 h-4 w-2/3 max-w-md rounded bg-white/10" />
      </div>
    </div>
  );
}

/** A listing card: 4:3 image, two text lines and a price. */
export function CardSkeleton() {
  return (
    <div className="rounded-card border border-line bg-card p-3" aria-hidden="true">
      <Skeleton className="aspect-[4/3] w-full rounded-control" />
      <div className="space-y-2.5 p-2 pt-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="mt-3 h-6 w-1/3" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 8, label = "Loading" }: { count?: number; label?: string }) {
  return (
    <Status label={label} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </Status>
  );
}

/** Rows with an avatar/thumbnail, a title line and a trailing action. */
export function ListSkeleton({ rows = 5, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <Status label={label} className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-card border border-line bg-card p-4" aria-hidden="true">
          <Skeleton className="h-12 w-12 shrink-0 rounded-control" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="hidden h-9 w-24 rounded-control sm:block" />
        </div>
      ))}
    </Status>
  );
}

/** Gallery + summary, matching a vehicle detail page. */
export function DetailSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <Status label={label} className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div aria-hidden="true">
        <Skeleton className="aspect-[16/10] w-full rounded-card" />
        <div className="mt-3 grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-control" />
          ))}
        </div>
      </div>
      <div className="space-y-4" aria-hidden="true">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-2 gap-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-control" />
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-control" />
      </div>
    </Status>
  );
}

/** A form card: label + field pairs and a submit button. */
export function FormSkeleton({ fields = 5, label = "Loading" }: { fields?: number; label?: string }) {
  return (
    <Status label={label} className="rounded-card border border-line bg-card p-6">
      <div className="space-y-5" aria-hidden="true">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-11 w-full rounded-control" />
          </div>
        ))}
        <Skeleton className="h-11 w-40 rounded-control" />
      </div>
    </Status>
  );
}
