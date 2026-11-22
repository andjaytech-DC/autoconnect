import AdminToolShell from "@/app/components/admin/tools/AdminToolShell";
import LocationsTool from "@/app/components/admin/tools/LocationsTool";
import { requireAdminPage } from "@/app/server/admin-page";

export const dynamic = "force-dynamic";

export default async function AdminLocationsPage() {
  await requireAdminPage("/admin/locations");
  return (
    <AdminToolShell
      title="Locations"
      description="Cities and service locations available to the marketplace."
      breadcrumb={["Management"]}
    >
      <LocationsTool />
    </AdminToolShell>
  );
}
