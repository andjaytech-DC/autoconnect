"use client";

import type { ComponentType, ReactNode } from "react";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";

type IconComponent = ComponentType<{
  size?: number;
  className?: string;
  "aria-hidden"?: boolean;
}>;

/** Restrained skeleton rows for data-driven admin panels. */
export function PanelLoading({ rows = 4, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div className="admin-card p-4 sm:p-5" role="status" aria-label={label}>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="skeleton h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-1/3" />
              <div className="skeleton h-2.5 w-1/2" />
            </div>
            <div className="skeleton hidden h-8 w-20 rounded-lg sm:block" />
          </div>
        ))}
      </div>
      <span className="sr-only">{label}…</span>
    </div>
  );
}

/** A failed request is never rendered as an empty state. */
export function PanelError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="admin-card p-5" role="alert">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
          <AlertCircle size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[hsl(var(--color-content))]">
            This section could not load
          </p>
          <p className="mt-1 text-sm leading-6 text-[hsl(var(--color-content-muted))]">
            {message}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="admin-btn admin-btn-secondary mt-3 text-xs"
            >
              <RefreshCw size={14} aria-hidden="true" /> Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PanelEmpty({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: IconComponent;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-card px-5 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--admin-surface-muted))] text-[hsl(var(--color-content-faint))]">
        <Icon size={24} aria-hidden />
      </span>
      <h3 className="mt-3 text-base font-bold text-[hsl(var(--color-content))]">{title}</h3>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[hsl(var(--color-content-muted))]">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Compact metric strip used inside an operational panel. */
export function PanelMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[hsl(var(--color-content-muted))]">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-[hsl(var(--color-content))]">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-[hsl(var(--color-content-muted))]">{hint}</p>}
    </div>
  );
}
