import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getSession } from "@/app/server/session";
import { backendFetch, BackendError } from "@/app/lib/backend";
import AdminRouteShell from "@/app/components/admin/ui/AdminRouteShell";
import EditVehicleClient from "./EditVehicleClient";

/**
 * Admin — Edit Vehicle  (app/admin/vehicles/[id]/edit)
 *
 * Server component: verifies the ADMIN session, loads the vehicle from
 * NestJS with its relations, and pre-fills the shared VehicleForm with the current details.
 * The form switches to PATCH /api/vehicles/[id] when initialData has an id.
 */
export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/portal");

  const vehicleId = Number((await params).id);
  if (!Number.isInteger(vehicleId) || vehicleId <= 0) notFound();

  // NestJS serves the full record (drafts included) to an ADMIN token. A
  // missing vehicle is a 404; an outage must not look like one.
  if (!session.token) redirect("/login");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let v: any;
  try {
    v = await backendFetch(`/vehicles/${vehicleId}`, { token: session.token });
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) notFound();
    throw new Error("The vehicle service is unavailable. Please try again shortly.");
  }
  if (!v) notFound();

  // Premium classification is owned by NestJS. Read it with the admin's own
  // token; if the backend is down (or the migration is not applied yet) the
  // section is simply hidden rather than shown with invented defaults.
  let premium: unknown = null;
  let premiumTagOptions: unknown = null;
  if (session.token) {
    try {
      [premium, premiumTagOptions] = await Promise.all([
        backendFetch(`/premium-vehicles/admin/vehicles/${vehicleId}`, { token: session.token }),
        backendFetch(`/premium-vehicles/admin/tags`, { token: session.token }),
      ]);
    } catch {
      premium = null;
      premiumTagOptions = null;
    }
  }

  // The form edits model/variant fields while the DB stores a single title
  // ("Brand Model Variant") — split the brand name back off to pre-fill.
  const brandName = v.brand?.name ?? "";
  const rest = brandName && v.title.startsWith(brandName + " ")
    ? v.title.slice(brandName.length + 1)
    : v.title;
  const [model, ...variantParts] = rest.split(" ");

  const initialData: Record<string, unknown> = {
    id: v.id,
    title: v.title,
    model,
    variant: variantParts.join(" "),
    year: String(v.year),
    price: String(v.price),
    mileage: String(v.mileage),
    fuel: v.fuel,
    transmission: v.transmission,
    bodyType: v.bodyType ?? "SUV",
    color: v.color ?? "",
    description: v.description ?? "",
    // `features` is a String[] column, not a relation.
    features: (v.features ?? []).join(", "),
    city: v.city ?? "",
    state: v.state ?? "",
    // P0-11: was hardcoded to "", which forced the operator to retype the plate
    // on every single edit. Pre-fill the stored value.
    registrationNumber: v.registrationNumber ?? "",
    registrationState: v.registrationState ?? v.state ?? "",
    status: v.status,
    listingStatus: v.listingStatus,
    isFeatured: v.isFeatured,
    isCertified: v.isCertified,
    availableForFinance: true,
    brandId: v.brandId,
    categoryId: v.categoryId,
    dealerId: v.dealerId,
    images:
      (v.vehicleImages ?? []).length > 0
        ? v.vehicleImages.map((g: { imageUrl: string }) => g.imageUrl)
        : v.images,
    ...(premium && premiumTagOptions ? { premium, premiumTagOptions } : {}),
  };

  return (
    <AdminRouteShell
      title="Edit vehicle"
      description={`Update the listing details for ${v.title}. Changes are saved to the live marketplace record.`}
      breadcrumb={["Marketplace", "Vehicles"]}
      width="5xl"
      actions={
        <Link href="/admin/vehicles" className="admin-btn admin-btn-secondary">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to inventory
        </Link>
      }
    >
      <EditVehicleClient initialData={initialData} />
    </AdminRouteShell>
  );
}
