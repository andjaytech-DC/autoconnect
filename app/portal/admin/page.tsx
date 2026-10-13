import { formatIndianNumber } from "@/app/lib/currency";
import { redirect } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  Car,
  Users,
  Store,
  MessageSquare,
  Package,
  Search,
  Shield,
  Wrench,
  TrendingUp,
  ArrowUpRight,
  Clock,
  BarChart3,
  Zap,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

import AdminPanel, {
  type AdminVehicle,
} from "@/app/components/admin/AdminPanel";
import {
  ADMIN_DOMAINS,
  isDraft,
  isPublished,
} from "@/app/components/admin/adminNav";
import LeadManager from "@/app/components/admin/LeadManager";
import AdminDealerPanel from "@/app/components/admin/AdminDealerPanel";
import AdminSellerListingsPanel from "@/app/components/admin/AdminSellerListingsPanel";
import AdminInspectionsPanel from "@/app/components/admin/AdminInspectionsPanel";
import AdminServicesPanel from "@/app/components/admin/AdminServicesPanel";
import AdminInsurancePanel from "@/app/components/admin/AdminInsurancePanel";
import AdminNewCarsPanel from "@/app/components/admin/AdminNewCarsPanel";
import TrustPanel from "@/app/components/admin/TrustPanel";
import SecurityPanel from "@/app/components/admin/SecurityPanel";
import { getSession } from "@/app/server/session";
import { prisma } from "@/app/server/prisma";
import {
  backendFetch,
  BackendError,
} from "@/app/lib/backend";

export const dynamic = "force-dynamic";

/* ============================================================
   BACKEND TYPES
   ============================================================ */

interface BackendAdminVehicle {
  id: number;
  title: string;
  year: number;
  price: number;
  mileage: number;
  fuel: string;
  transmission: string;
  color?: string | null;
  images?: string[] | null;
  status: string;
  listingStatus?: string | null;
  city?: string | null;
  state?: string | null;
  brandId: number;
  categoryId: number;
  dealerId: number;
  description?: string | null;
  isCertified: boolean;
  registrationNumber?: string | null;
  createdAt: string;
}

interface AdminStatsResult {
  totalVehicles: number;
  available: number;
  sold: number;
  customers: number;
  dealers: number;
  pendingDealers: number;
  leads: number;
  testDrives: number;
  finance: number;
  sellerListings: number;
}

/* ============================================================
   VEHICLES — Prisma-first, ONE dataset.

   Prisma is canonical: it owns `listingStatus` (DRAFT/PUBLISHED) AND it is
   the store the admin edit route reads, so every card rendered from this
   list is editable. The NestJS backend is only consulted when the local
   store is empty (its rows carry no visibility flag and are not editable
   from the admin UI).

   Headline counts, the vehicle buckets and the cards all read THIS array,
   so the dashboard cannot show two different totals.
   ============================================================ */

function mapBackendRow(v: BackendAdminVehicle): AdminVehicle {
  return {
    id: v.id,
    title: v.title,
    year: v.year,
    price: v.price,
    mileage: v.mileage,
    fuel: v.fuel,
    transmission: v.transmission,
    color: v.color ?? "",
    images: v.images ?? [],
    status: v.status,
    // The backend now owns listing visibility, so read it rather than assuming.
    listingStatus: v.listingStatus ?? "PUBLISHED",
    city: v.city ?? "",
    state: v.state ?? undefined,
    brandId: v.brandId,
    categoryId: v.categoryId,
    dealerId: v.dealerId,
    description: v.description ?? undefined,
    isCertified: v.isCertified,
    registrationNumber: v.registrationNumber ?? null,
    createdAt: v.createdAt,
  };
}

async function fetchVehicles(token?: string): Promise<AdminVehicle[]> {
  const merged = new Map<number, AdminVehicle>();
  let prismaOk = false;
  let backendError: string | null = null;

  // 1) NestJS staff feed — canonical. It includes DRAFT rows so the Draft
  //    bucket is populated, and every row it returns is editable here.
  if (token) {
    try {
      const data = await backendFetch<{
        items?: BackendAdminVehicle[];
      }>("/vehicles/admin/all?limit=200", { token });
      for (const v of data.items ?? []) merged.set(v.id, mapBackendRow(v));
    } catch (error) {
      backendError =
        error instanceof BackendError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown error";
    }
  }

  // 2) Local Prisma — only when the backend produced nothing, so the admin
  //    still has inventory to manage during a backend outage.
  if (merged.size === 0) {
    try {
      const rows = await prisma.vehicle.findMany({
        include: { brand: true },
        orderBy: { updatedAt: "desc" },
        take: 200,
      });
      prismaOk = true;
      for (const v of rows) {
        merged.set(v.id, {
          id: v.id,
          title: v.title,
          year: v.year,
          price: v.price,
          mileage: v.mileage,
          fuel: v.fuel,
          transmission: v.transmission,
          color: v.color ?? "",
          images: v.images,
          status: v.status,
          listingStatus: v.listingStatus,
          city: v.city ?? "",
          state: v.state ?? undefined,
          brandId: v.brandId,
          categoryId: v.categoryId,
          dealerId: v.dealerId,
          description: v.description ?? undefined,
          isCertified: v.isCertified,
          // The local fallback store predates this column; only the backend
          // knows the plate, so report none rather than guessing.
          registrationNumber: null,
          createdAt: v.createdAt.toISOString(),
        });
      }
    } catch {
      // Prisma unreachable too.
    }
  }

  // Nothing at all → surface a real error rather than a fake zero.
  if (!prismaOk && merged.size === 0) {
    throw new Error(
      token
        ? `Failed to load vehicles: ${backendError ?? "no data source reachable"}`
        : "Authentication required — no session token available.",
    );
  }

  return [...merged.values()].sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
}

/* ============================================================
   ADMIN STATISTICS
   The NestJS backend is preferred, but the dashboard must never
   blank out: when the backend is unreachable — or the session
   has no backend token at all (local-auth sessions) — every
   stat is computed from the local Prisma store instead.
   ============================================================ */

async function localStats(): Promise<AdminStatsResult> {
  const [
    customers,
    dealers,
    pendingDealers,
    leads,
    testDrives,
    finance,
    sellerListings,
    sold,
    available,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.dealer.count({ where: { status: "APPROVED" } }),
    prisma.dealer.count({ where: { status: "PENDING" } }),
    prisma.lead.count(),
    prisma.testDrive.count(),
    prisma.financeApplication.count(),
    prisma.sellerListing.count(),
    prisma.vehicle.count({ where: { status: "SOLD" } }),
    prisma.vehicle.count({ where: { listingStatus: "PUBLISHED", status: "AVAILABLE" } }),
  ]);
  return {
    totalVehicles: 0, // headline total always comes from the vehicles array
    available,
    sold,
    customers,
    dealers,
    pendingDealers,
    leads,
    testDrives,
    finance,
    sellerListings,
  };
}

async function getStats(token?: string): Promise<AdminStatsResult> {
  if (token) {
    try {
      const stats = await backendFetch<Record<string, number>>("/admin/stats", {
        token,
      });
      return {
        totalVehicles: stats.totalVehicles ?? 0,
        available: stats.availableVehicles ?? 0,
        sold: stats.soldVehicles ?? 0,
        customers: stats.customers ?? 0,
        dealers: stats.dealers ?? 0,
        pendingDealers: stats.pendingDealers ?? 0,
        leads: stats.leads ?? 0,
        testDrives: stats.testDrives ?? 0,
        finance: stats.financeApplications ?? 0,
        sellerListings: stats.sellerListings ?? 0,
      };
    } catch {
      // Backend down / errored → local fallback below (never blank).
    }
  }
  return localStats();
}

/* ============================================================
   SIDEBAR NAVIGATION
   ============================================================ */

const DOMAIN_ICONS = {
  dashboard: LayoutDashboard,
  vehicles: Car,
  dealers: Store,
  listings: Package,
  leads: MessageSquare,
  inspections: Search,
  services: Wrench,
  insurance: Shield,
  security: ShieldCheck,
  "new-cars": Sparkles,
  trust: ShieldCheck,
} as const;

/* Domains come from the ONE canonical admin nav definition, so this rail and
   the AdminPanel sub-menu can never disagree about structure or wording.
   Leads is a top-level domain — never a vehicle sub-item. */
const sidebarItems = ADMIN_DOMAINS.map((d) => ({
  key: d.key,
  label: d.label,
  icon: DOMAIN_ICONS[d.key],
}));

/* ============================================================
   ADMIN PORTAL
   ============================================================ */

export default async function AdminPortalPage() {
  const session = await getSession();

  /* Authentication */
  if (!session) {
    redirect("/login?next=/portal/admin");
  }

  /* Authorization */
  if (session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  /*
   * Load backend data in parallel.
   *
   * IMPORTANT:
   * There is intentionally NO Prisma fallback here. When the backend is
   * unreachable we render a clear notice instead of surfacing a 500 error.
   */
  let vehicles: AdminVehicle[] = [];
  let stats: AdminStatsResult = {
    totalVehicles: 0,
    available: 0,
    sold: 0,
    customers: 0,
    dealers: 0,
    pendingDealers: 0,
    leads: 0,
    testDrives: 0,
    finance: 0,
    sellerListings: 0,
  };

  try {
    const [v, s] = await Promise.all([
      fetchVehicles(session.token),
      getStats(session.token),
    ]);
    vehicles = v;
    stats = s;
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Backend unavailable";

    return (
      <div className="min-h-screen bg-[var(--color-bg)] font-sans text-[var(--color-text-primary)] flex flex-col items-center justify-center px-6 text-center">
        <ShieldCheck size={40} className="mx-auto text-[#FFC700]" />
        <h1 className="mt-6 text-2xl font-extrabold text-content">
          Admin workspace unavailable
        </h1>
        <p className="mt-2 max-w-md text-sm text-content-muted">
          Could not connect to the backend service that powers this dashboard.
          Please make sure the backend is running, then reload the page.
        </p>
        <p className="mt-1 text-xs text-content-faint">{detail}</p>
        <a
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white text-sm font-bold px-5 py-2.5 hover:bg-emerald-700 transition-colors"
        >
          Back to Dashboard
        </a>
      </div>
    );
  }

  const conversionRate =
    stats.leads > 0
      ? Math.round((stats.sold / stats.leads) * 100)
      : 0;

  /* All vehicle numbers come from the ONE reconciled `vehicles` array — the
     same array the grid renders — so headline counts cannot contradict it. */
  const publishedCount = vehicles.filter((v) => isPublished(v)).length;
  const draftCount = vehicles.filter((v) => isDraft(v)).length;
  const leadsSubtext =
    stats.leads > 0 ? `Lead conversion ${conversionRate}%` : "No leads yet";

  return (
    <div className="min-h-screen bg-[var(--color-bg)] font-sans text-[var(--color-text-primary)]">
      {/* ========================================================
          HERO
          ======================================================== */}

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white">
        {/* Background effects */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl animate-pulse-slow" />

          <div
            className="absolute right-0 top-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl animate-pulse-slow"
            style={{ animationDelay: "1s" }}
          />

          <div
            className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-purple-500/8 blur-3xl animate-pulse-slow"
            style={{ animationDelay: "2s" }}
          />

          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:px-12 lg:py-16">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            {/* Hero content */}
            <div className="animate-fade-in-up">
              <div className="mb-4 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck size={20} />
                </span>

                <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                  Admin Control Center
                </span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                Welcome back,{" "}
                <span className="text-emerald-400">
                  Admin
                </span>
              </h1>

              <p className="mt-3 max-w-xl text-base leading-7 text-slate-300">
                Manage your automotive marketplace —
                vehicles, dealers, leads, and operations —
                all from one powerful dashboard.
              </p>
            </div>

            {/* Quick actions */}
            <div
              className="flex flex-wrap gap-3 animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <a
                href="#vehicles"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:border-emerald-400/30 hover:bg-emerald-500/25"
              >
                <Car size={16} />
                Manage Inventory
                <ArrowUpRight size={14} />
              </a>

              <a
                href="#leads"
                className="inline-flex items-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/15 px-4 py-2.5 text-sm font-semibold text-blue-300 transition hover:border-blue-400/30 hover:bg-blue-500/25"
              >
                <MessageSquare size={16} />
                Review Leads
                <ArrowUpRight size={14} />
              </a>

              {stats.pendingDealers > 0 && (
                <span className="inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-amber-300">
                  <AlertTriangle size={16} />

                  {stats.pendingDealers} Pending Dealer
                  {stats.pendingDealers !== 1
                    ? "s"
                    : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          MAIN
          ======================================================== */}

      <main
        id="dashboard"
        className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-12"
      >
        {/* ======================================================
            PRIMARY STATISTICS
            ====================================================== */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total Vehicles",
              value: vehicles.length,
              icon: Car,
              gradient: "from-[#FFC700] to-teal-600",
              bgLight: "bg-emerald-500/15",
              textColor: "text-emerald-400",
              change: `${publishedCount} published · ${draftCount} drafts`,
            },
            {
              label: "Active Customers",
              value: stats.customers,
              icon: Users,
              gradient: "from-blue-500 to-indigo-600",
              bgLight: "bg-blue-500/15",
              textColor: "text-blue-400",
              change: "Registered users",
            },
            {
              label: "Total Leads",
              value: stats.leads,
              icon: TrendingUp,
              gradient: "from-violet-500 to-purple-600",
              bgLight: "bg-violet-500/15",
              textColor: "text-violet-400",
              change: leadsSubtext,
            },
            {
              label: "Revenue Vehicles",
              value: stats.sold,
              icon: BarChart3,
              gradient: "from-amber-500 to-orange-600",
              bgLight: "bg-amber-500/15",
              textColor: "text-amber-400",
              change: "Successfully sold",
            },
          ].map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-2xl border border-line bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.gradient}`}
                />

                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                      {stat.label}
                    </p>

                    <p className="mt-2 text-3xl font-extrabold text-content">
                      {formatIndianNumber(stat.value)}
                    </p>

                    <p className="mt-1 text-xs text-content-muted">
                      {stat.change}
                    </p>
                  </div>

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.bgLight}`}
                  >
                    <Icon
                      size={20}
                      className={stat.textColor}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ======================================================
            SECONDARY STATISTICS
            ====================================================== */}

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              label: "Approved Dealers",
              value: stats.dealers,
              icon: Store,
              accent:
                "text-emerald-400 bg-emerald-500/15",
            },
            {
              label: "Pending Dealers",
              value: stats.pendingDealers,
              icon: AlertTriangle,
              accent:
                "text-amber-400 bg-amber-500/15",
            },
            {
              label: "Test Drives",
              value: stats.testDrives,
              icon: Clock,
              accent:
                "text-blue-400 bg-blue-500/15",
            },
            {
              label: "Finance Apps",
              value: stats.finance,
              icon: Zap,
              accent:
                "text-violet-400 bg-violet-500/15",
            },
            {
              label: "Seller Listings",
              value: stats.sellerListings,
              icon: Package,
              accent:
                "text-rose-400 bg-rose-500/15",
            },
          ].map((item) => {
            const Icon = item.icon;
            const [iconColor, iconBackground] =
              item.accent.split(" ");

            return (
              <div
                key={item.label}
                className="rounded-2xl border border-line bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBackground}`}
                  >
                    <Icon
                      size={17}
                      className={iconColor}
                    />
                  </div>

                  <div>
                    <p className="text-2xl font-extrabold text-content">
                      {formatIndianNumber(item.value)}
                    </p>

                    <p className="text-xs text-content-muted">
                      {item.label}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ======================================================
            SIDEBAR + CONTENT
            ====================================================== */}

        <div className="mt-10 grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* Sidebar */}
          <nav
            aria-label="Admin navigation"
            className="flex gap-1 overflow-x-auto lg:sticky lg:top-24 lg:flex-col lg:overflow-visible lg:self-start"
          >
            {sidebarItems.map((item) => {
              const Icon = item.icon;

              return (
                <a
                  key={item.key}
                  href={`#${item.key}`}
                  className="group flex items-center gap-2.5 whitespace-nowrap rounded-xl border border-line bg-card px-4 py-3 text-sm font-semibold text-content transition-all duration-200 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300 hover:shadow-sm"
                >
                  <Icon
                    size={16}
                    className="text-content-muted transition-colors group-hover:text-emerald-400"
                  />

                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Content */}
          <div className="min-w-0 space-y-10">
            {/* ==================================================
                VEHICLES
                ================================================== */}

            <section id="vehicles">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                  <Car
                    size={16}
                    className="text-emerald-400"
                  />
                </div>

                <h2 className="text-xl font-extrabold text-content">
                  Vehicle Inventory
                </h2>
              </div>

              <AdminPanel
                initialVehicles={vehicles}
              />
            </section>

            {/* ==================================================
                LEADS
                ================================================== */}

            <section id="leads">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15">
                  <MessageSquare
                    size={16}
                    className="text-blue-400"
                  />
                </div>

                <h2 className="text-xl font-extrabold text-content">
                  Lead Management
                </h2>
              </div>

              <LeadManager />
            </section>

            {/* ==================================================
                DEALERS
                ================================================== */}

            <section id="dealers">
              <div className="rounded-2xl border border-line bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                    <Store size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-content">Dealer Approvals</h2>
                    <p className="mt-1 text-sm text-content-muted">
                      {stats.pendingDealers} pending · {stats.dealers} approved
                    </p>
                  </div>
                </div>
                <AdminDealerPanel />
              </div>
            </section>

            {/* ==================================================
                SELLER LISTINGS
                ================================================== */}

            <section id="listings">
              <div className="rounded-2xl border border-line bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15">
                    <Package size={18} className="text-rose-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-content">Seller Listings</h2>
                    <p className="mt-1 text-sm text-content-muted">{stats.sellerListings} pending reviews</p>
                  </div>
                </div>
                <AdminSellerListingsPanel />
              </div>
            </section>

            {/* ==================================================
                SECURITY — ROLE / PERMISSION MATRIX
                ================================================== */}

            <section id="security">
              <div className="rounded-2xl border border-line bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
                    <Shield size={18} className="text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-content">Security</h2>
                    <p className="mt-1 text-sm text-content-muted">
                      Which role can do what
                    </p>
                  </div>
                </div>
                <SecurityPanel />
              </div>
            </section>

            {/* ==================================================
                TRUST &amp; SAFETY
                ================================================== */}

            <section id="trust">
              <div className="rounded-2xl border border-line bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                    <ShieldCheck size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-content">Trust &amp; Safety</h2>
                    <p className="mt-1 text-sm text-content-muted">
                      Vehicle history checks, warranty plans and return requests
                    </p>
                  </div>
                </div>
                <TrustPanel
                  vehicles={vehicles.map((v) => ({
                    id: v.id,
                    title: v.title,
                    registrationNumber: v.registrationNumber ?? null,
                  }))}
                />
              </div>
            </section>

            {/* ==================================================
                INSPECTIONS
                ================================================== */}

            <section id="inspections">
              <div className="rounded-2xl border border-line bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
                    <Search size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-content">Inspections</h2>
                    <p className="mt-1 text-sm text-content-muted">Inspection management workspace</p>
                  </div>
                </div>
                <AdminInspectionsPanel />
              </div>
            </section>

            {/* ==================================================
                SERVICES
                ================================================== */}

            <section id="services">
              <div className="rounded-2xl border border-line bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
                    <Wrench size={18} className="text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-content">Services</h2>
                    <p className="mt-1 text-sm text-content-muted">Automotive service operations</p>
                  </div>
                </div>
                <AdminServicesPanel />
              </div>
            </section>

            {/* ==================================================
                INSURANCE
                ================================================== */}

            <section id="insurance">
              <div className="rounded-2xl border border-line bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
                    <Shield size={18} className="text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-content">Insurance</h2>
                    <p className="mt-1 text-sm text-content-muted">Insurance enquiries and applications</p>
                  </div>
                </div>
                <AdminInsurancePanel />
              </div>
            </section>

            {/* ==================================================
                NEW CARS
                ================================================== */}

            <section id="new-cars">
              <AdminNewCarsPanel />
            </section>
          </div>
        </div>

        {/* ======================================================
            SECURITY NOTICE
            ====================================================== */}

        <div className="mt-10 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
          <ShieldCheck
            size={18}
            className="mt-0.5 shrink-0 text-emerald-400"
          />

          <p className="text-sm leading-6 text-emerald-200">
            <span className="font-semibold">
              Admin-only workspace.
            </span>{" "}
            {/* P0-13: both claims were false. Audit logging covered only 4 routes, and the
                session lifetime is 7 days, not 8 hours. Removed rather than
                corrected in place until the audit trail actually exists. */}
          </p>
        </div>
      </main>
    </div>
  );
}