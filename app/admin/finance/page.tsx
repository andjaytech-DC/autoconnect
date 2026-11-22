import AdminToolShell from "@/app/components/admin/tools/AdminToolShell";
import FinanceTool from "@/app/components/admin/tools/FinanceTool";
import { requireAdminPage } from "@/app/server/admin-page";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage() {
  await requireAdminPage("/admin/finance");
  return (
    <AdminToolShell
      title="Finance applications"
      description="Loan applications, review status and the disbursement pipeline."
      breadcrumb={["Operations"]}
    >
      <FinanceTool />
    </AdminToolShell>
  );
}
