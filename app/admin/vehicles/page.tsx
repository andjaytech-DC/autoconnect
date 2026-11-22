import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Car } from "lucide-react";

import { getSession } from "@/app/server/session";
import { backendFetch } from "@/app/lib/backend";
import AdminPanel, { type AdminVehicle } from "@/app/components/admin/AdminPanel";
import AdminRouteShell from "@/app/components/admin/ui/AdminRouteShell";
import { formatIndianNumber } from "@/app/lib/currency";

/**
 * Admin — Vehicle inventory  (app/admin/vehicles)
 * Links every vehicle to its edit route (app/admin/vehicles/[id]/edit).
 */

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
  isCertified?: boolean;
  registrationNumber?: string | null;
  createdAt?: string;
}

export const dynamic = "force-dynamic";

export default async function AdminVehiclesPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/vehicles");
  if (session.role !== "ADMIN") redirect("/portal");

  // The staff feed from NestJS includes drafts. If it cannot be read the page
  // says so — an empty grid would read as "no inventory".
  let vehicles: AdminVehicle[] = [];
  let loadFailed = !session.token;
  let loadError = "";

  if (session.token) {
    try {
      const data = await backendFetch<{ items?: BackendAdminVehicle[] }>(
        "/vehicles/admin/all?limit=200",
        { token: session.token },
      );
      vehicles = (data.items ?? []).map((v) => ({
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
      }));
    } catch (error) {
      loadFailed = true;
      loadError =
        error instanceof Error ? error.message : "The vehicle service is unavailable.";
    }
  }

  return (
    <AdminRouteShell
      title="Vehicle inventory"
      description="Search, filter and manage every vehicle in the marketplace, including drafts that are hidden from the storefront."
      breadcrumb={["Marketplace"]}
      width="7xl"
      actions={
        <Link href="/admin/vehicles/new" className="admin-btn admin-btn-primary">
          <Car size={16} aria-hidden="true" />
          Add vehicle
        </Link>
      }
    >
      {loadFailed ? (
        <div className="admin-card p-5" role="alert">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
              <AlertCircle size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[hsl(var(--color-content))]">
                Could not load the vehicle list
              </p>
              <p className="mt-1 text-sm leading-6 text-[hsl(var(--color-content-muted))]">
                {loadError ||
                  "The backend did not answer. This is not an empty inventory — reload in a moment."}
              </p>
              <Link href="/admin/vehicles" className="admin-btn admin-btn-secondary mt-3 text-xs">
                Reload
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-[hsl(var(--color-content-muted))]" aria-live="polite">
            {formatIndianNumber(vehicles.length)} vehicle
            {vehicles.length === 1 ? "" : "s"} in the staff feed, including drafts.
          </p>
          <AdminPanel initialVehicles={vehicles} />
        </>
      )}
    </AdminRouteShell>
  );
}
