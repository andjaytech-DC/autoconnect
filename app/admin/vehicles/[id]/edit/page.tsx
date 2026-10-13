import { notFound, redirect } from "next/navigation";

import { prisma } from "@/app/server/prisma";
import { getSession } from "@/app/server/session";
import EditVehicleClient from "./EditVehicleClient";

/**
 * Admin — Edit Vehicle  (app/admin/vehicles/[id]/edit)
 *
 * Server component: verifies the ADMIN session, loads the vehicle with its
 * relations, and pre-fills the shared VehicleForm with the current details.
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
  if (!Number.isInteger(vehicleId)) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let v: any = null;
  try {
v = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        include: {
          brand: true,
          category: true,
          dealer: true,
          vehicleImages: { orderBy: { sortOrder: "asc" } },
        },
      });
  } catch (err) {
    console.error("Database connection failed:", err);
    notFound();
  }
  if (!v) notFound();

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
    features: v.features.join(", "),
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
      v.vehicleImages.length > 0
        ? v.vehicleImages.map((g: { imageUrl: string }) => g.imageUrl)
        : v.images,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <EditVehicleClient initialData={initialData} />
    </div>
  );
}
