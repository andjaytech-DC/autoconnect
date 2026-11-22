import type { ReactNode } from "react";
import { AlertCircle, Inbox } from "lucide-react";

import AdminRouteShell from "../ui/AdminRouteShell";

/** Common frame for the standalone admin tool pages. */
export default function AdminToolShell({
  title,
  description,
  breadcrumb,
  actions,
  width = "6xl",
  children,
}: {
  title: string;
  description?: string;
  breadcrumb?: string[];
  actions?: ReactNode;
  width?: "5xl" | "6xl" | "7xl";
  children: ReactNode;
}) {
  return (
    <AdminRouteShell
      title={title}
      description={description}
      breadcrumb={breadcrumb ?? ["Management"]}
      actions={actions}
      width={width}
    >
      {children}
    </AdminRouteShell>
  );
}

export function Notice({
  kind,
  children,
  onRetry,
}: {
  kind: "loading" | "error" | "empty";
  children: ReactNode;
  onRetry?: () => void;
}) {
  if (kind === "error") {
    return (
      <div className="admin-card p-5" role="alert">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
            <AlertCircle size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[hsl(var(--color-content))]">
              Could not load this tool
            </p>
            <p className="mt-1 text-sm leading-6 text-[hsl(var(--color-content-muted))]">
              {children}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="admin-btn admin-btn-secondary mt-3 text-xs"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (kind === "empty") {
    return (
      <div className="admin-card px-5 py-12 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--admin-surface-muted))] text-[hsl(var(--color-content-faint))]">
          <Inbox size={24} aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-semibold text-[hsl(var(--color-content))]">
          {children}
        </p>
      </div>
    );
  }

  return (
    <div className="admin-card p-5" role="status">
      <div className="space-y-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3">
            <div className="skeleton h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-1/3" />
              <div className="skeleton h-2.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">{children}</span>
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="admin-card p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[hsl(var(--color-content-muted))]">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-[hsl(var(--color-content))]">
        {value}
      </p>
    </div>
  );
}
