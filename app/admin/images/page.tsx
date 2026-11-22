import AdminToolShell from "@/app/components/admin/tools/AdminToolShell";
import ImagesTool from "@/app/components/admin/tools/ImagesTool";
import { requireAdminPage } from "@/app/server/admin-page";

export const dynamic = "force-dynamic";

export default async function AdminImagesPage() {
  await requireAdminPage("/admin/images");
  return (
    <AdminToolShell
      title="Images"
      description="Vehicle media library, uploads and image hygiene."
      breadcrumb={["Management"]}
    >
      <ImagesTool />
    </AdminToolShell>
  );
}
