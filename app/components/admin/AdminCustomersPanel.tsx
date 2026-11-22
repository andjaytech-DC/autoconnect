"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, Phone, Search, Users } from "lucide-react";

import StatusBadge from "./ui/StatusBadge";
import { PanelEmpty, PanelError, PanelLoading, PanelMetric } from "./ui/AdminPanelState";
import { formatIndianNumber } from "@/app/lib/currency";

interface UserRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  createdAt?: string;
}

export default function AdminCustomersPanel() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  /** Pure fetch — no state, so mount effects can await it first. */
  const fetchRows = useCallback(async () => {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as {
      users?: UserRow[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error ?? `Request failed (${response.status})`);
    }
    return (data.users ?? []).filter((user) => user.role === "CUSTOMER");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await fetchRows());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load the customer directory.",
      );
    } finally {
      setLoading(false);
    }
  }, [fetchRows]);

  useEffect(() => {
    let active = true;
    (async () => {
      // Yield once so the mount effect does not set state synchronously.
      await Promise.resolve();
      if (!active) return;
      try {
        const next = await fetchRows();
        if (active) setRows(next);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load the customer directory.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchRows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((user) =>
      [user.firstName, user.lastName, user.email, user.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [query, rows]);

  const active = rows.filter((user) => user.isActive).length;
  const joinedThisMonth = rows.filter((user) => {
    if (!user.createdAt) return false;
    const created = new Date(user.createdAt);
    if (Number.isNaN(created.getTime())) return false;
    const now = new Date();
    return (
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear()
    );
  }).length;

  if (loading) return <PanelLoading rows={5} label="Loading customers" />;
  if (error) return <PanelError message={error} onRetry={() => void load()} />;
  if (rows.length === 0) {
    return (
      <PanelEmpty
        icon={Users}
        title="No customer accounts yet"
        description="Customers appear here after they create an account on the storefront."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <PanelMetric
          label="Total customers"
          value={formatIndianNumber(rows.length)}
          hint="Accounts with the customer role"
        />
        <PanelMetric
          label="Active accounts"
          value={formatIndianNumber(active)}
          hint={`${formatIndianNumber(rows.length - active)} inactive`}
        />
        <PanelMetric
          label="Joined this month"
          value={formatIndianNumber(joinedThisMonth)}
          hint="New customer registrations"
        />
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[hsl(var(--color-line))] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-base font-bold tracking-tight text-[hsl(var(--color-content))]">
              Customer directory
            </h2>
            <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
              {formatIndianNumber(filtered.length)} of {formatIndianNumber(rows.length)} accounts
            </p>
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <span className="sr-only">Search customers</span>
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--color-content-faint))]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email or phone…"
              className="admin-input pl-9"
            />
          </label>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-semibold text-[hsl(var(--color-content))]">
              No customers match “{query}”
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="admin-btn admin-btn-secondary mt-3 text-xs"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <caption className="sr-only">Customer accounts</caption>
              <thead>
                <tr className="border-b border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface-muted))]">
                  <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--color-content-muted))] sm:px-5">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--color-content-muted))]">
                    Contact
                  </th>
                  <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--color-content-muted))]">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--color-content-muted))] sm:px-5">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--color-line))]">
                {filtered.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-[hsl(var(--admin-surface-muted))]">
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--admin-surface-muted))] text-xs font-bold text-[hsl(var(--color-content-muted))]">
                          {initials(user)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[hsl(var(--color-content))]">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-[hsl(var(--color-content-muted))]">
                            Account #{user.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-1.5 text-xs text-[hsl(var(--color-content))]">
                        <Mail size={12} className="shrink-0 text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
                        <span className="max-w-[220px] truncate">{user.email}</span>
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-[hsl(var(--color-content-muted))]">
                        <Phone size={12} className="shrink-0 text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
                        {user.phone || "Phone not provided"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.isActive ? "ACTIVE" : "INACTIVE"} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--color-content-muted))] sm:px-5">
                      {formatDate(user.createdAt)}
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

function initials(user: UserRow) {
  return [user.firstName, user.lastName]
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
