"use client";

import { BarChart3 } from "lucide-react";

import { Notice } from "./AdminToolShell";
import { useAdminData } from "./useAdminData";
import { formatINR, formatIndianNumber } from "@/app/lib/currency";

type Stats = Record<string, number | undefined>;

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Inventory",
    items: [
      ["Total vehicles", "totalVehicles"],
      ["Available", "availableVehicles"],
      ["Sold", "soldVehicles"],
    ],
  },
  {
    title: "Marketplace",
    items: [
      ["Customers", "totalCustomers"],
      ["Dealers", "totalDealers"],
      ["Pending dealers", "pendingDealers"],
    ],
  },
  {
    title: "Demand",
    items: [
      ["Leads", "totalLeads"],
      ["New leads", "newLeads"],
      ["Orders", "totalOrders"],
    ],
  },
  {
    title: "Operations",
    items: [
      ["Finance applications", "totalFinanceApps"],
      ["Inspections", "totalInspections"],
      ["Service bookings", "totalServiceBookings"],
    ],
  },
];

export default function ReportsTool() {
  const { data, loading, error } = useAdminData<{ stats: Stats | null }>("/api/admin/reports");

  if (loading) return <Notice kind="loading">Loading reports…</Notice>;
  if (error || !data) return <Notice kind="error">{error ?? "Could not load reports"}</Notice>;
  const stats = data.stats;
  if (!stats) return <Notice kind="empty">No reporting data available</Notice>;

  return (
    <div className="space-y-4">
      <div className="admin-card flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div>
          <h2 className="text-base font-bold tracking-tight text-[hsl(var(--color-content))]">
            Revenue this month
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
            Sum of completed order value recorded since the first of the month.
          </p>
        </div>
        <p className="text-2xl font-bold tabular-nums tracking-tight text-[hsl(var(--color-content))]">
          {formatINR(stats.revenue ?? 0)}
        </p>
      </div>

      {GROUPS.map((group) => (
        <section key={group.title} aria-labelledby={`reports-${group.title}`}>
          <h3
            id={`reports-${group.title}`}
            className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--color-content-muted))]"
          >
            {group.title}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map(([label, key]) => (
              <div key={key} className="admin-card p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[hsl(var(--color-content-muted))]">
                  {label}
                </p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-[hsl(var(--color-content))]">
                  {formatIndianNumber(stats[key] ?? 0)}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <p className="flex items-center gap-1.5 text-xs text-[hsl(var(--color-content-muted))]">
        <BarChart3 size={13} aria-hidden="true" />
        All figures are read live from the backend reporting service.
      </p>
    </div>
  );
}
