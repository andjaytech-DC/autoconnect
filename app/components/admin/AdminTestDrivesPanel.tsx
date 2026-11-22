"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  Car,
  Clock,
  Phone,
  Search,
  UserRound,
} from "lucide-react";

import { PanelEmpty, PanelError, PanelLoading, PanelMetric } from "./ui/AdminPanelState";
import { formatIndianNumber } from "@/app/lib/currency";

interface TestDrive {
  id: number;
  vehicleId: number;
  userId?: number | null;
  customerName: string;
  customerPhone: string;
  preferredDate: string;
  preferredTime: string;
  createdAt: string;
  vehicle?: { id?: number; title?: string } | null;
}

type DriveFilter = "UPCOMING" | "PAST" | "ALL";

const FILTERS: { key: DriveFilter; label: string }[] = [
  { key: "UPCOMING", label: "Upcoming" },
  { key: "PAST", label: "Past" },
  { key: "ALL", label: "All requests" },
];

export default function AdminTestDrivesPanel() {
  const [items, setItems] = useState<TestDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<DriveFilter>("UPCOMING");
  const [query, setQuery] = useState("");

  /** Pure fetch — no state, so mount effects can await it first. */
  const fetchItems = useCallback(async () => {
    const response = await fetch("/api/test-drives", { cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as {
      testDrives?: TestDrive[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error ?? `Request failed (${response.status})`);
    }
    return data.testDrives ?? [];
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await fetchItems());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load test drive requests.",
      );
    } finally {
      setLoading(false);
    }
  }, [fetchItems]);

  useEffect(() => {
    let active = true;
    (async () => {
      // Yield once so the mount effect does not set state synchronously.
      await Promise.resolve();
      if (!active) return;
      try {
        const next = await fetchItems();
        if (active) setItems(next);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load test drive requests.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchItems]);

  const startOfToday = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }, []);

  const upcoming = items.filter((item) => driveDate(item.preferredDate) >= startOfToday);
  const linked = items.filter((item) => Boolean(item.userId)).length;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter((item) => {
        const datetime = driveDate(item.preferredDate);
        if (filter === "UPCOMING" && datetime < startOfToday) return false;
        if (filter === "PAST" && datetime >= startOfToday) return false;
        if (!needle) return true;
        return [item.customerName, item.customerPhone, item.vehicle?.title, item.preferredTime]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      })
      .sort((a, b) => {
        if (filter === "PAST") return driveDate(b.preferredDate) - driveDate(a.preferredDate);
        return driveDate(a.preferredDate) - driveDate(b.preferredDate);
      });
  }, [filter, items, query, startOfToday]);

  if (loading) return <PanelLoading rows={4} label="Loading test drive requests" />;
  if (error) return <PanelError message={error} onRetry={() => void load()} />;
  if (items.length === 0) {
    return (
      <PanelEmpty
        icon={CalendarCheck}
        title="No test drive requests yet"
        description="Requests submitted from a vehicle page will appear here with the customer's preferred date and time."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <PanelMetric
          label="Total requests"
          value={formatIndianNumber(items.length)}
          hint="All recorded test drives"
        />
        <PanelMetric
          label="Upcoming"
          value={formatIndianNumber(upcoming.length)}
          hint="Preferred date is today or later"
        />
        <PanelMetric
          label="Linked to accounts"
          value={formatIndianNumber(linked)}
          hint={`${formatIndianNumber(items.length - linked)} guest requests`}
        />
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[hsl(var(--color-line))] p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-[hsl(var(--color-content))]">
                Test drive schedule
              </h2>
              <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
                Bookings come from the public vehicle pages. The backend does not
                expose a request status, so none is shown.
              </p>
            </div>
            <label className="relative block w-full lg:max-w-xs">
              <span className="sr-only">Search test drive requests</span>
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--color-content-faint))]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search customer, phone or vehicle…"
                className="admin-input pl-9"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter test drives">
            {FILTERS.map((option) => {
              const active = filter === option.key;
              const count =
                option.key === "UPCOMING"
                  ? upcoming.length
                  : option.key === "PAST"
                    ? items.length - upcoming.length
                    : items.length;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFilter(option.key)}
                  aria-pressed={active}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] ${
                    active
                      ? "border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]"
                      : "border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] text-[hsl(var(--color-content-muted))] hover:border-[hsl(var(--color-line-hover))] hover:text-[hsl(var(--color-content))]"
                  }`}
                >
                  {option.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                      active ? "bg-black/10" : "bg-[hsl(var(--admin-surface-muted))]"
                    }`}
                  >
                    {formatIndianNumber(count)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-semibold text-[hsl(var(--color-content))]">
              {query ? `No requests match “${query}”` : `No ${filter.toLowerCase()} test drives`}
            </p>
            {(query || filter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilter("ALL");
                }}
                className="admin-btn admin-btn-secondary mt-3 text-xs"
              >
                Show all requests
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-[hsl(var(--color-line))]">
            {filtered.map((item) => {
              const preferred = new Date(item.preferredDate);
              const isPast = driveDate(item.preferredDate) < startOfToday;
              return (
                <li key={item.id} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface-muted))] py-2">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-[hsl(var(--color-content-muted))]">
                          {Number.isNaN(preferred.getTime())
                            ? "—"
                            : preferred.toLocaleString("en-IN", { month: "short" })}
                        </span>
                        <span className="text-lg font-bold leading-6 tabular-nums text-[hsl(var(--color-content))]">
                          {Number.isNaN(preferred.getTime()) ? "—" : preferred.getDate()}
                        </span>
                      </span>

                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[hsl(var(--color-content))]">
                          {item.customerName}
                          <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--color-line))] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--color-content-muted))]">
                            <UserRound size={10} aria-hidden="true" />
                            {item.userId ? "Account" : "Guest"}
                          </span>
                          {isPast && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                              Past
                            </span>
                          )}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[hsl(var(--color-content-muted))]">
                          <span className="inline-flex items-center gap-1">
                            <Phone size={12} aria-hidden="true" /> {item.customerPhone}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} aria-hidden="true" /> {item.preferredTime}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock size={12} aria-hidden="true" /> Requested {formatDate(item.createdAt)}
                          </span>
                        </p>
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[hsl(var(--color-content-muted))]">
                          <Car size={12} className="shrink-0" aria-hidden="true" />
                          {item.vehicle?.title ? (
                            <Link
                              href={`/admin/vehicles/${item.vehicle.id ?? item.vehicleId}/edit`}
                              className="truncate font-medium text-[hsl(var(--color-primary-strong))] hover:underline"
                            >
                              {item.vehicle.title}
                            </Link>
                          ) : (
                            <span>Vehicle #{item.vehicleId}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/cars/${item.vehicle?.id ?? item.vehicleId}`}
                      className="admin-btn admin-btn-secondary shrink-0 self-start text-xs sm:self-auto"
                    >
                      Open vehicle
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function driveDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
