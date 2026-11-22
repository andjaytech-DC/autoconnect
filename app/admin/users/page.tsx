import AdminToolShell from "@/app/components/admin/tools/AdminToolShell";
import UsersRolesTool from "@/app/components/admin/tools/UsersRolesTool";
import { requireAdminPage } from "@/app/server/admin-page";

export const dynamic = "force-dynamic";

export default async function AdminUsersRolesPage() {
  await requireAdminPage("/admin/users");
  return (
    <AdminToolShell
      title="Users & roles"
      description="Manage accounts, roles and access to the admin workspace."
      breadcrumb={["Management"]}
    >
      <UsersRolesTool />
    </AdminToolShell>
  );
}
