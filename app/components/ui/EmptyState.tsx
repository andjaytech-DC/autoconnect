import type { ComponentType, ReactNode } from "react";
import { AlertCircle, Inbox } from "lucide-react";

type IconComponent = ComponentType<{
  size?: number;
  className?: string;
  "aria-hidden"?: boolean;
}>;

interface EmptyStateProps {
  icon?: IconComponent;
  title: string;
  description?: ReactNode;
  /** A <Link> or button. Prefer one clear next step. */
  action?: ReactNode;
  /**
   * `empty` is for "nothing here yet". `error` is for a failed request, which
   * must never look like an empty list; it is announced to screen readers.
   */
  tone?: "empty" | "error";
  /** Heading level to render so the page outline stays valid. */
  as?: "h2" | "h3";
  className?: string;
}

/**
 * Shared empty / failed state for public (light-surface) pages. The admin
 * workspace keeps its own `PanelEmpty` because it sits on admin surfaces.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "empty",
  as: Heading = "h2",
  className = "",
}: EmptyStateProps) {
  const isError = tone === "error";
  const Icon = icon ?? (isError ? AlertCircle : Inbox);
  return (
    <div
      role={isError ? "alert" : undefined}
      className={`rounded-card border border-dashed border-line bg-card px-6 py-14 text-center ${className}`}
    >
      <span
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
          isError ? "bg-red-50 text-red-700" : "bg-surface-strong text-content-muted"
        }`}
      >
        <Icon size={26} aria-hidden />
      </span>
      <Heading className="mt-4 text-lg font-bold text-content">{title}</Heading>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-content-muted">{description}</p>
      )}
      {action && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{action}</div>}
    </div>
  );
}
