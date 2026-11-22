import AdminToolShell from "@/app/components/admin/tools/AdminToolShell";
import ReportsTool from "@/app/components/admin/tools/ReportsTool";
import { requireAdminPage } from "@/app/server/admin-page";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireAdminPage("/admin/reports");
  return (
    <AdminToolShell
      title="Reports"
      description="Marketplace performance and operational reporting, read live from the backend."
      breadcrumb={["Management"]}
    >
      <ReportsTool />
    </AdminToolShell>
  );
}
