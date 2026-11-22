"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarCheck,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  Landmark,
  MessageSquare,
  Package,
  RefreshCw,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";

import { useAdminSection } from "./ui/AdminWorkspace";
import StatusBadge from "./ui/StatusBadge";
import { isDraft, isPublished } from "./adminNav";
import type { AdminVehicle } from "./AdminPanel";
import { formatINR, formatIndianNumber } from "@/app/lib/currency";

export interface AdminStats {
  totalVehicles: number;
  available: number;
  sold: number;
  customers: number;
  dealers: number;
  pendingDealers: number;
  leads: number;
  newLeads: number;
  testDrives: number;
  finance: number;
  sellerListings: number;
  inspections: number;
  insuranceEnquiries: number;
}

interface AdminDashboardProps {
  stats: AdminStats;
  vehicles: AdminVehicle[];
}

interface LeadPreview {
  id: number;
  customerName: string;
  status: string;
  createdAt: string;
  vehicle?: { title?: string };
}

export default function AdminDashboard({ stats, vehicles }: AdminDashboardProps) {
  const workspace = useAdminSection();
  const navigate = useCallback(
    (key: string) => {
      if (workspace) workspace.navigate(key);
      else window.location.hash = key;
    },
    [workspace],
  );

  const published = useMemo(() => vehicles.filter((vehicle) => isPublished(vehicle)), [vehicles]);
  const draft = useMemo(() => vehicles.filter((vehicle) => isDraft(vehicle)), [vehicles]);
  const sold = useMemo(() => published.filter((vehicle) => vehicle.status === "SOLD"), [published]);
  const reserved = useMemo(() => published.filter((vehicle) => vehicle.status === "RESERVED"), [published]);
  const available = useMemo(() => published.filter((vehicle) => vehicle.status === "AVAILABLE"), [published]);
  const inactive = useMemo(() => published.filter((vehicle) => vehicle.status === "INACTIVE"), [published]);
  const otherPublished = Math.max(
    published.length - sold.length - reserved.length - available.length - inactive.length,
    0,
  );

  const conversion = stats.leads > 0 ? Math.round((stats.sold / stats.leads) * 100) : 0;

  const kpis = [
    {
      label: "Total vehicles",
      value: vehicles.length,
      hint: `${published.length} published · ${draft.length} drafts`,
      icon: Car,
      tone: "bg-slate-100 text-slate-700",
      onClick: () => navigate("vehicles"),
    },
    {
      label: "Active listings",
      value: published.length,
      hint: `${draft.length} draft${draft.length === 1 ? "" : "s"} awaiting publication`,
      icon: CheckCircle2,
      tone: "bg-emerald-100 text-emerald-800",
      onClick: () => navigate("vehicles"),
    },
    {
      label: "Total leads",
      value: stats.leads,
      hint: stats.leads > 0 ? `${conversion}% lead-to-sale conversion` : "No leads yet",
      icon: MessageSquare,
      tone: "bg-blue-100 text-blue-800",
      onClick: () => navigate("leads"),
    },
    {
      label: "Vehicles sold",
      value: stats.sold,
      hint: "Completed sales recorded by the backend",
      icon: TrendingUp,
      tone: "bg-amber-100 text-amber-800",
      onClick: () => navigate("vehicles"),
    },
  ];

  const queues: Array<{
    label: string;
    description: string;
    value: number;
    icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
    onClick?: () => void;
    href?: string;
  }> = [
    {
      label: "Dealer approvals",
      description: "Applications waiting for a decision",
      value: stats.pendingDealers,
      icon: Store,
      onClick: () => navigate("dealers"),
    },
    {
      label: "Seller listings",
      description: "Seller submissions awaiting review",
      value: stats.sellerListings,
      icon: Package,
      onClick: () => navigate("listings"),
    },
    {
      label: "Test drive requests",
      description: "Requests submitted from vehicle pages",
      value: stats.testDrives,
      icon: CalendarCheck,
      onClick: () => navigate("test-drives"),
    },
    {
      label: "Finance applications",
      description: "Loan applications in the pipeline",
      value: stats.finance,
      icon: Landmark,
      href: "/admin/finance",
    },
    {
      label: "New leads",
      description: "Enquiries that still need a first response",
      value: stats.newLeads ?? stats.leads,
      icon: MessageSquare,
      onClick: () => navigate("leads"),
    },
  ];

  const segments = [
    { label: "Available", count: available.length, color: "bg-emerald-700" },
    { label: "Reserved", count: reserved.length, color: "bg-amber-500" },
    { label: "Sold", count: sold.length, color: "bg-blue-600" },
    { label: "Draft", count: draft.length, color: "bg-slate-300" },
    { label: "Archived", count: inactive.length, color: "bg-slate-500" },
    { label: "Other published", count: otherPublished, color: "bg-slate-400" },
  ].filter((segment) => segment.count > 0);
  const totalSegments = segments.reduce((sum, segment) => sum + segment.count, 0);

  const recentVehicles = useMemo(
    () =>
      [...vehicles]
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .slice(0, 5),
    [vehicles],
  );

  return (
    <div className="space-y-6">
      {/* KPI overview */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Bento operations grid */}
      <div className="grid gap-4 lg:grid-cols-12">
        <section className="admin-card min-w-0 lg:col-span-7" aria-labelledby="operations-heading">
          <CardHeader
            id="operations-heading"
            title="Operations queue"
            description="Live requests and approvals that need attention."
            action={
              <button type="button" onClick={() => navigate("leads")} className="inline-flex min-h-8 items-center text-xs font-semibold text-[hsl(var(--color-primary-strong))] hover:underline">
                Open leads
              </button>
            }
          />
          <ul className="divide-y divide-[hsl(var(--color-line))]">
            {queues.map((queue) => {
              const Icon = queue.icon;
              const content = (
                <>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--admin-surface-muted))] text-[hsl(var(--color-content-muted))]">
                    <Icon size={18} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[hsl(var(--color-content))]">
                      {queue.label}
                    </span>
                    <span className="block truncate text-xs text-[hsl(var(--color-content-muted))]">
                      {queue.description}
                    </span>
                  </span>
                  <span className={`min-w-9 rounded-lg px-2 py-1 text-center text-sm font-bold tabular-nums ${queue.value > 0 ? "bg-amber-50 text-amber-900" : "bg-slate-100 text-slate-600"}`}>
                    {formatIndianNumber(queue.value)}
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
                </>
              );

              return (
                <li key={queue.label}>
                  {queue.href ? (
                    <Link href={queue.href} className="flex min-h-16 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[hsl(var(--admin-surface-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--color-focus))] sm:px-5">
                      {content}
                    </Link>
                  ) : (
                    <button type="button" onClick={queue.onClick} className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[hsl(var(--admin-surface-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--color-focus))] sm:px-5">
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="admin-card min-w-0 lg:col-span-5" aria-labelledby="inventory-health-heading">
          <CardHeader
            id="inventory-health-heading"
            title="Inventory health"
            description="Visibility and lifecycle across the current inventory."
            action={
              <button type="button" onClick={() => navigate("vehicles")} className="inline-flex min-h-8 items-center text-xs font-semibold text-[hsl(var(--color-primary-strong))] hover:underline">
                Manage
              </button>
            }
          />
          <div className="px-4 pb-5 sm:px-5">
            <div className="flex h-3 overflow-hidden rounded-full bg-[hsl(var(--admin-surface-muted))]" role="img" aria-label={`Inventory mix: ${segments.map((segment) => `${segment.label} ${segment.count}`).join(", ")}`}>
              {segments.map((segment) => (
                <span
                  key={segment.label}
                  className={segment.color}
                  style={{ width: `${(segment.count / Math.max(totalSegments, 1)) * 100}%` }}
                />
              ))}
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
              {segments.map((segment) => (
                <div key={segment.label} className="flex items-center justify-between gap-2">
                  <dt className="flex min-w-0 items-center gap-2 text-xs text-[hsl(var(--color-content-muted))]">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${segment.color}`} aria-hidden="true" />
                    <span className="truncate">{segment.label}</span>
                  </dt>
                  <dd className="text-sm font-bold tabular-nums text-[hsl(var(--color-content))]">
                    {formatIndianNumber(segment.count)}
                  </dd>
                </div>
              ))}
            </dl>

            {totalSegments === 0 && (
              <p className="mt-4 rounded-xl bg-[hsl(var(--admin-surface-muted))] p-3 text-xs text-[hsl(var(--color-content-muted))]">
                No inventory has been added yet.
              </p>
            )}

            <div className="mt-5 flex items-center justify-between rounded-xl bg-[hsl(var(--admin-surface-muted))] px-3 py-2.5">
              <span className="text-xs font-medium text-[hsl(var(--color-content-muted))]">Published share</span>
              <span className="text-sm font-bold text-[hsl(var(--color-content))]">
                {vehicles.length > 0 ? `${Math.round((published.length / vehicles.length) * 100)}%` : "—"}
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="admin-card min-w-0 lg:col-span-7" aria-labelledby="recent-inventory-heading">
          <CardHeader
            id="recent-inventory-heading"
            title="Recent inventory"
            description="The newest vehicles added to the marketplace."
            action={
              <button type="button" onClick={() => navigate("vehicles")} className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-[hsl(var(--color-primary-strong))] hover:underline">
                View all <ArrowUpRight size={13} aria-hidden="true" />
              </button>
            }
          />
          {recentVehicles.length === 0 ? (
            <EmptyBlock
              icon={Car}
              title="No vehicles yet"
              description="Add your first vehicle to begin managing inventory."
              href="/admin/vehicles/new"
              action="Add vehicle"
            />
          ) : (
            <ul className="divide-y divide-[hsl(var(--color-line))]">
              {recentVehicles.map((vehicle) => (
                <li key={vehicle.id}>
                  <Link href={`/admin/vehicles/${vehicle.id}/edit`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[hsl(var(--admin-surface-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--color-focus))] sm:px-5">
                    <VehicleThumb vehicle={vehicle} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[hsl(var(--color-content))]">
                        {vehicle.title || "Untitled vehicle"}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[hsl(var(--color-content-muted))]">
                        {vehicle.year} · {vehicle.mileage ? `${formatIndianNumber(vehicle.mileage)} km` : "Mileage not set"} · {vehicle.fuel || "Fuel not set"}
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-sm font-bold tabular-nums text-[hsl(var(--color-content))] sm:block">
                      {vehicle.price != null ? formatINR(vehicle.price) : "—"}
                    </span>
                    <StatusBadge status={vehicle.listingStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-card min-w-0 lg:col-span-5" aria-labelledby="recent-leads-heading">
          <CardHeader
            id="recent-leads-heading"
            title="Recent leads"
            description="The latest enquiries from vehicle pages."
            action={
              <button type="button" onClick={() => navigate("leads")} className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-[hsl(var(--color-primary-strong))] hover:underline">
                View all <ArrowUpRight size={13} aria-hidden="true" />
              </button>
            }
          />
          <RecentLeads onViewAll={() => navigate("leads")} />
        </section>
      </div>

      <section className="admin-card" aria-labelledby="quick-actions-heading">
        <CardHeader
          id="quick-actions-heading"
          title="Admin shortcuts"
          description="Jump straight into the most-used operational workspaces."
        />
        <div className="grid gap-3 px-4 pb-5 sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
          <ShortcutLink href="/admin/finance" icon={Landmark} label="Finance" description="Review loan applications" />
          <ShortcutLink href="/admin/reports" icon={TrendingUp} label="Reports" description="Marketplace performance" />
          <ShortcutLink href="/admin/users" icon={Users} label="Users & roles" description="Accounts and permissions" />
          <ShortcutLink href="/admin/settings" icon={Store} label="Settings" description="Platform configuration" />
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Building blocks                                                    */
/* ------------------------------------------------------------------ */

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="admin-kpi group">
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-wide text-[hsl(var(--color-content-muted))]">
            {label}
          </span>
          <span className="mt-2 block text-3xl font-bold tracking-tight tabular-nums text-[hsl(var(--color-content))] sm:text-4xl">
            {formatIndianNumber(value)}
          </span>
        </span>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={19} aria-hidden />
        </span>
      </span>
      <span className="mt-2 block text-xs leading-5 text-[hsl(var(--color-content-muted))]">{hint}</span>
    </button>
  );
}

function CardHeader({
  id,
  title,
  description,
  action,
}: {
  id?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
      <div className="min-w-0">
        <h2 id={id} className="text-base font-bold tracking-tight text-[hsl(var(--color-content))]">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 pt-0.5">{action}</div>}
    </div>
  );
}

function VehicleThumb({ vehicle }: { vehicle: AdminVehicle }) {
  const src = vehicle.images?.[0];
  return (
    <span className="relative flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[hsl(var(--admin-surface-muted))]">
      {src ? (
        // Backend media can be local or remote; a plain img keeps both working.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <Car size={18} className="text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
      )}
    </span>
  );
}

function ShortcutLink({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] p-3 transition-colors hover:border-[hsl(var(--color-line-hover))] hover:bg-[hsl(var(--admin-surface-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--admin-surface-muted))] text-[hsl(var(--color-content-muted))] group-hover:text-[hsl(var(--color-primary-strong))]">
        <Icon size={18} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[hsl(var(--color-content))]">{label}</span>
        <span className="block truncate text-xs text-[hsl(var(--color-content-muted))]">{description}</span>
      </span>
      <ChevronRight size={15} className="ml-auto shrink-0 text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
    </Link>
  );
}

function EmptyBlock({
  icon: Icon,
  title,
  description,
  href,
  action,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="px-4 pb-5 sm:px-5">
      <div className="rounded-xl border border-dashed border-[hsl(var(--color-line-hover))] bg-[hsl(var(--admin-surface-muted))] px-4 py-8 text-center">
        <Icon size={26} className="mx-auto text-[hsl(var(--color-content-faint))]" aria-hidden />
        <p className="mt-2 text-sm font-semibold text-[hsl(var(--color-content))]">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[hsl(var(--color-content-muted))]">{description}</p>
        <Link href={href} className="admin-btn admin-btn-primary mt-4">
          {action}
        </Link>
      </div>
    </div>
  );
}

function RecentLeads({ onViewAll }: { onViewAll: () => void }) {
  const [leads, setLeads] = useState<LeadPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /** Pure fetch — no state, so the mount effect can await it first. */
  const fetchLeads = useCallback(async () => {
    const response = await fetch("/api/leads");
    if (!response.ok) throw new Error("Could not load leads");
    const data = (await response.json()) as { leads?: LeadPreview[] };
    return [...(data.leads ?? [])]
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, 4);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setLeads(await fetchLeads());
    } catch {
      setError("Could not load recent leads.");
    } finally {
      setLoading(false);
    }
  }, [fetchLeads]);

  useEffect(() => {
    let active = true;
    (async () => {
      // Yield once so the mount effect does not set state synchronously.
      await Promise.resolve();
      if (!active) return;
      try {
        const next = await fetchLeads();
        if (active) setLeads(next);
      } catch {
        if (active) setError("Could not load recent leads.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchLeads]);

  if (loading) {
    return (
      <div className="space-y-3 px-4 pb-5 sm:px-5" aria-label="Loading recent leads" role="status">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3 motion-reduce:animate-none">
            <div className="skeleton h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-2/3" />
              <div className="skeleton h-2.5 w-1/2" />
            </div>
          </div>
        ))}
        <span className="sr-only">Loading recent leads…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 pb-5 sm:px-5" role="alert">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="flex items-center gap-2 font-semibold">
            <AlertCircle size={16} aria-hidden="true" /> {error}
          </p>
          <button type="button" onClick={() => void load()} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-800 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700">
            <RefreshCw size={14} aria-hidden="true" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="px-4 pb-5 sm:px-5">
        <div className="rounded-xl border border-dashed border-[hsl(var(--color-line-hover))] bg-[hsl(var(--admin-surface-muted))] px-4 py-8 text-center">
          <MessageSquare size={24} className="mx-auto text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-[hsl(var(--color-content))]">No leads yet</p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[hsl(var(--color-content-muted))]">
            Enquiries submitted from vehicle pages will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-[hsl(var(--color-line))]">
        {leads.map((lead) => (
          <li key={lead.id}>
            <button type="button" onClick={onViewAll} className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[hsl(var(--admin-surface-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--color-focus))] sm:px-5">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-800">
                <MessageSquare size={16} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-[hsl(var(--color-content))]">{lead.customerName}</span>
                  <StatusBadge status={lead.status} />
                </span>
                <span className="mt-0.5 block truncate text-xs text-[hsl(var(--color-content-muted))]">
                  {lead.vehicle?.title ?? "General enquiry"}
                </span>
                <span className="mt-1 flex items-center gap-1 text-[11px] text-[hsl(var(--color-content-faint))]">
                  <Clock size={11} aria-hidden="true" />
                  {formatDate(lead.createdAt)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="px-4 pb-4 pt-2 sm:px-5">
        <button type="button" onClick={onViewAll} className="inline-flex min-h-8 items-center text-xs font-semibold text-[hsl(var(--color-primary-strong))] hover:underline">
          View the full lead pipeline
        </button>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
