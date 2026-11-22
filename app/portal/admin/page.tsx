import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import AdminPanel, {
  type AdminVehicle,
} from "@/app/components/admin/AdminPanel";
import AdminDashboard from "@/app/components/admin/AdminDashboard";
import AdminWorkspace from "@/app/components/admin/ui/AdminWorkspace";
import { isDraft, isPublished } from "@/app/components/admin/adminNav";
import LeadManager from "@/app/components/admin/LeadManager";
import AdminDealerPanel from "@/app/components/admin/AdminDealerPanel";
import AdminCustomersPanel from "@/app/components/admin/AdminCustomersPanel";
import AdminTestDrivesPanel from "@/app/components/admin/AdminTestDrivesPanel";
import AdminSellerListingsPanel from "@/app/components/admin/AdminSellerListingsPanel";
import AdminInspectionsPanel from "@/app/components/admin/AdminInspectionsPanel";
import AdminServicesPanel from "@/app/components/admin/AdminServicesPanel";
import AdminInsurancePanel from "@/app/components/admin/AdminInsurancePanel";
import AdminNewCarsPanel from "@/app/components/admin/AdminNewCarsPanel";
import TrustPanel from "@/app/components/admin/TrustPanel";
import SecurityPanel from "@/app/components/admin/SecurityPanel";
import { getSession } from "@/app/server/session";
import { backendFetch, BackendError } from "@/app/lib/backend";

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
  newLeads: number;
  testDrives: number;
  finance: number;
  sellerListings: number;
  inspections: number;
  insuranceEnquiries: number;
}

/* ============================================================
   VEHICLES — one dataset, owned by NestJS.

   The staff feed includes DRAFT rows and the same ids the admin edit route
   loads, so every card rendered from this list is editable. There is no local
   store: when NestJS cannot answer the page says so instead of showing a fake
   zero.

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
  if (!token) {
    throw new Error("Authentication required — no session token available.");
  }
  try {
    const data = await backendFetch<{ items?: BackendAdminVehicle[] }>(
      "/vehicles/admin/all?limit=200",
      { token },
    );
    return (data.items ?? [])
      .map(mapBackendRow)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  } catch (error) {
    throw new Error(
      `Failed to load vehicles: ${
        error instanceof BackendError || error instanceof Error
          ? error.message
          : "no data source reachable"
      }`,
    );
  }
}

/* ============================================================
   ADMIN STATISTICS — computed by NestJS (`/admin/stats`).
   ============================================================ */

async function getStats(token?: string): Promise<AdminStatsResult> {
  if (!token) {
    throw new Error("Authentication required — no session token available.");
  }
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
    newLeads: stats.newLeads ?? 0,
    testDrives: stats.testDrives ?? 0,
    finance: stats.financeApplications ?? 0,
    sellerListings: stats.sellerListings ?? 0,
    inspections: stats.inspections ?? 0,
    insuranceEnquiries: stats.insuranceEnquiries ?? 0,
  };
}

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
   * There is intentionally NO local fallback here. When the backend is
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
    newLeads: 0,
    testDrives: 0,
    finance: 0,
    sellerListings: 0,
    inspections: 0,
    insuranceEnquiries: 0,
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
      <div
        data-admin-shell
        className="admin-shell flex min-h-screen flex-col items-center justify-center px-6 text-center"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--admin-surface))] text-[hsl(var(--color-primary-strong))] shadow-[var(--admin-shadow)]">
          <ShieldCheck size={26} aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-[hsl(var(--color-content))]">
          Admin workspace unavailable
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-[hsl(var(--color-content-muted))]">
          Could not connect to the backend service that powers this dashboard.
          Make sure the backend is running, then reload the page.
        </p>
        <p className="mt-2 max-w-md break-words rounded-lg bg-[hsl(var(--admin-surface))] px-3 py-2 text-xs text-[hsl(var(--color-content-faint))]">
          {detail}
        </p>
        <a href="/portal/admin" className="admin-btn admin-btn-primary mt-6">
          Reload workspace
        </a>
      </div>
    );
  }

  /*
   * All vehicle numbers are derived from the ONE reconciled `vehicles` array —
   * the same array the inventory grid renders — so headline counts cannot
   * contradict the inventory.
   */
  const publishedCount = vehicles.filter((v) => isPublished(v)).length;
  const draftCount = vehicles.filter((v) => isDraft(v)).length;
  void publishedCount;
  void draftCount;

  const sections = [
    {
      key: "dashboard" as const,
      content: <AdminDashboard stats={stats} vehicles={vehicles} />,
    },
    {
      key: "vehicles" as const,
      content: <AdminPanel initialVehicles={vehicles} />,
    },
    {
      key: "dealers" as const,
      content: <AdminDealerPanel />,
    },
    {
      key: "customers" as const,
      content: <AdminCustomersPanel />,
    },
    {
      key: "listings" as const,
      content: <AdminSellerListingsPanel />,
    },
    {
      key: "new-cars" as const,
      content: <AdminNewCarsPanel />,
    },
    {
      key: "leads" as const,
      content: <LeadManager />,
    },
    {
      key: "test-drives" as const,
      content: <AdminTestDrivesPanel />,
    },
    {
      key: "inspections" as const,
      content: <AdminInspectionsPanel />,
    },
    {
      key: "services" as const,
      content: <AdminServicesPanel />,
    },
    {
      key: "insurance" as const,
      content: <AdminInsurancePanel />,
    },
    {
      key: "security" as const,
      content: <SecurityPanel />,
    },
    {
      key: "trust" as const,
      content: (
        <TrustPanel
          vehicles={vehicles.map((v) => ({
            id: v.id,
            title: v.title,
            registrationNumber: v.registrationNumber ?? null,
          }))}
        />
      ),
    },
  ];

  return (
    <AdminWorkspace
      sections={sections}
      userName={session.name ?? "Administrator"}
      roleLabel="Administrator"
    />
  );
}
