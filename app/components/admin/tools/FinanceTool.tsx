"use client";

import { useMemo, useState } from "react";

import { Notice, StatCard } from "./AdminToolShell";
import { useAdminData } from "./useAdminData";
import StatusBadge from "../ui/StatusBadge";
import { formatINR, formatIndianNumber } from "@/app/lib/currency";

interface FinanceApp {
  id: number;
  status: string;
  loanAmount?: number;
  tenureMonths?: number;
  emi?: number;
  user?: { firstName: string; lastName: string };
  vehicle?: { title: string };
}

const STATUSES = ["ALL", "DRAFT", "SUBMITTED", "UNDER_REVIEW", "DOCUMENTS_REQUIRED", "APPROVED", "REJECTED", "DISBURSED"];

const label = (status: string) =>
  status === "ALL" ? "All" : status.replace(/_/g, " ").toLowerCase();

export default function FinanceTool() {
  const { data, loading, error } = useAdminData<{ finance: FinanceApp[] }>("/api/admin/finance");
  const [filter, setFilter] = useState("ALL");

  const apps = useMemo(() => data?.finance ?? [], [data]);

  if (loading) return <Notice kind="loading">Loading finance applications…</Notice>;
  if (error || !data) return <Notice kind="error">{error ?? "Could not load finance applications"}</Notice>;

  const count = (s: string) => apps.filter((a) => a.status === s).length;
  const visible = filter === "ALL" ? apps : apps.filter((a) => a.status === filter);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total" value={formatIndianNumber(apps.length)} />
        <StatCard label="Submitted" value={formatIndianNumber(count("SUBMITTED"))} />
        <StatCard label="Under review" value={formatIndianNumber(count("UNDER_REVIEW"))} />
        <StatCard label="Approved" value={formatIndianNumber(count("APPROVED"))} />
        <StatCard label="Rejected" value={formatIndianNumber(count("REJECTED"))} />
        <StatCard label="Disbursed" value={formatIndianNumber(count("DISBURSED"))} />
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[hsl(var(--color-line))] p-4 sm:p-5">
          <div>
            <h2 className="text-base font-bold tracking-tight text-[hsl(var(--color-content))]">
              Loan applications
            </h2>
            <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
              {formatIndianNumber(visible.length)} of {formatIndianNumber(apps.length)} applications
              in this view.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter finance applications">
            {STATUSES.map((status) => {
              const active = filter === status;
              const total = status === "ALL" ? apps.length : count(status);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilter(status)}
                  aria-pressed={active}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] ${
                    active
                      ? "border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]"
                      : "border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] text-[hsl(var(--color-content-muted))] hover:border-[hsl(var(--color-line-hover))] hover:text-[hsl(var(--color-content))]"
                  }`}
                >
                  {label(status)}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                      active ? "bg-black/10" : "bg-[hsl(var(--admin-surface-muted))]"
                    }`}
                  >
                    {formatIndianNumber(total)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold text-[hsl(var(--color-content))]">
              No applications in this view
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[hsl(var(--color-content-muted))]">
              Finance applications submitted from a vehicle page appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <caption className="sr-only">Finance applications</caption>
              <thead>
                <tr className="border-b border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface-muted))]">
                  {["Applicant", "Vehicle", "Loan amount", "EMI", "Status"].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--color-content-muted))] first:pl-5 last:pr-5"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--color-line))]">
                {visible.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-[hsl(var(--admin-surface-muted))]">
                    <td className="px-4 py-3 pl-5">
                      <p className="text-sm font-semibold text-[hsl(var(--color-content))]">
                        {a.user?.firstName} {a.user?.lastName}
                      </p>
                      <p className="text-xs text-[hsl(var(--color-content-muted))]">Application #{a.id}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-[hsl(var(--color-content))]">
                      {a.vehicle?.title ?? "No vehicle"}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-[hsl(var(--color-content))]">
                      {a.loanAmount != null ? formatINR(a.loanAmount) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-[hsl(var(--color-content-muted))]">
                      {a.emi != null ? `${formatINR(a.emi)} / mo` : "—"}
                      {a.tenureMonths != null && (
                        <span className="block text-xs">{a.tenureMonths} months</span>
                      )}
                    </td>
                    <td className="px-4 py-3 pr-5">
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
