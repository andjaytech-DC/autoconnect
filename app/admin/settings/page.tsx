import AdminToolShell from "@/app/components/admin/tools/AdminToolShell";
import SettingsTool from "@/app/components/admin/tools/SettingsTool";
import { requireAdminPage } from "@/app/server/admin-page";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdminPage("/admin/settings");
  return (
    <AdminToolShell
      title="Settings"
      description="Platform configuration and operational preferences."
      breadcrumb={["Management"]}
    >
      <SettingsTool />
    </AdminToolShell>
  );
}
