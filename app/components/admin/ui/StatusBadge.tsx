import type { ReactNode } from "react";

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "gold";

const TONE_CLASS: Record<Tone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  gold: "border-amber-300 bg-amber-100 text-amber-900",
};

const DOT_CLASS: Record<Tone, string> = {
  success: "bg-emerald-700",
  warning: "bg-amber-500",
  danger: "bg-red-600",
  info: "bg-blue-600",
  neutral: "bg-slate-400",
  gold: "bg-amber-500",
};

const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: "success",
  AVAILABLE: "success",
  PUBLISHED: "success",
  APPROVED: "success",
  CONFIRMED: "success",
  COMPLETED: "success",
  CONVERTED: "success",
  DISBURSED: "success",
  PAID: "success",

  PENDING: "warning",
  REQUESTED: "warning",
  DRAFT: "warning",
  RESERVED: "warning",
  CONTACTED: "warning",
  SUBMITTED: "warning",
  UNDER_REVIEW: "warning",
  DOCUMENTS_REQUIRED: "warning",
  ASSIGNED: "info",
  VEHICLE_RECEIVED: "info",
  IN_PROGRESS: "info",
  AWAITING_APPROVAL: "warning",
  SCHEDULED: "info",
  NEGOTIATING: "info",
  QUALIFIED: "info",
  NEW: "info",

  REJECTED: "danger",
  CANCELLED: "danger",
  INACTIVE: "danger",
  FAILED: "danger",
  REFUNDED: "info",

  SOLD: "gold",
  ARCHIVED: "neutral",
  CLOSED: "neutral",
  UNKNOWN: "neutral",
};

export function statusTone(status: string | null | undefined): Tone {
  return STATUS_TONE[String(status ?? "").toUpperCase()] ?? "neutral";
}

export function statusBadgeClass(status: string | null | undefined): string {
  return badgeClass(statusTone(status));
}

export function badgeClass(tone: Tone): string {
  return `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${TONE_CLASS[tone]}`;
}

interface StatusBadgeProps {
  status: string | null | undefined;
  /** Optional human label; defaults to the status value. */
  label?: ReactNode;
  className?: string;
}

/**
 * The one status badge used across the admin. The label is always rendered as
 * text, so meaning never depends on colour alone.
 */
export default function StatusBadge({ status, label, className = "" }: StatusBadgeProps) {
  const value = String(status ?? "UNKNOWN");
  const tone = statusTone(value);
  return (
    <span className={`${badgeClass(tone)} ${className}`.trim()}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[tone]}`} aria-hidden="true" />
      {label ?? value.replaceAll("_", " ")}
    </span>
  );
}
