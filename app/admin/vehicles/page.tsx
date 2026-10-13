import Link from "next/link";
import { redirect } from "next/navigation";
import { Car } from "lucide-react";

import { prisma } from "@/app/server/prisma";
import { getSession } from "@/app/server/session";

/**
 * Admin — Vehicle inventory  (app/admin/vehicles)
 * Links every vehicle to its edit route (app/admin/vehicles/[id]/edit).
 */
export default async function AdminVehiclesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/portal");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let vehicles: any[] = [];
  try {
    vehicles = await prisma.vehicle.findMany({
      include: { brand: true },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
  } catch (err) {
    console.error("Database connection failed:", err);
    vehicles = [];
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-content">Vehicle Inventory</h1>
        <span className="text-sm text-content-muted">{vehicles.length} vehicle(s)</span>
      </div>
      {vehicles.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
          <Car size={32} className="mx-auto text-content-muted mb-2" />
          <p className="text-content-muted text-sm">No vehicles yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <div key={v.id} className="rounded-2xl border border-line bg-card p-4 flex flex-col">
              <p className="font-bold text-content text-sm truncate">{v.title}</p>
              <p className="text-xs text-content-muted mt-1">
                {v.brand?.name ?? "—"} · {v.year} · ₹{v.price.toLocaleString("en-IN")}
              </p>
              <div className="flex gap-2 mt-3">
                <span className={"inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full " + (v.listingStatus === "PUBLISHED" ? "bg-emerald-500/10 text-emerald-400" : "bg-[#161b21] text-slate-400")}>
                  {v.listingStatus}
                </span>
                <span className="inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-surface text-content-muted">
                  {v.status}
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-line flex justify-end">
                <Link
                  href={`/admin/vehicles/${v.id}/edit`}
                  className="px-4 py-2 bg-[#FFC700] text-[#15130a] rounded-lg text-xs font-bold hover:brightness-110"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
