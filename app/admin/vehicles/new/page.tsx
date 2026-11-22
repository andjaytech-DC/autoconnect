import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireAdminPage } from "@/app/server/admin-page";
import AdminRouteShell from "@/app/components/admin/ui/AdminRouteShell";
import NewVehicleClient from "./NewVehicleClient";

export const dynamic = "force-dynamic";

export default async function NewVehiclePage() {
  await requireAdminPage("/admin/vehicles/new");

  return (
    <AdminRouteShell
      title="Add vehicle"
      description="Create a marketplace listing. Required fields are marked, and drafts stay hidden from the storefront until published."
      breadcrumb={["Marketplace", "Vehicles"]}
      width="5xl"
      actions={
        <Link href="/admin/vehicles" className="admin-btn admin-btn-secondary">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to inventory
        </Link>
      }
    >
      <NewVehicleClient />
    </AdminRouteShell>
  );
}
