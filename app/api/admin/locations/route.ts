import { adminCall } from "@/app/server/admin-proxy";

export const runtime = "nodejs";

interface DealerRow {
  id: number;
  businessName: string;
  city: string;
  state: string;
  pincode: string;
  status: string;
}

/** One location per dealership; APPROVED dealers are "active". */
export async function GET(request: Request) {
  return adminCall<DealerRow[]>({
    request,
    path: "/admin/locations",
    shape: (rows) => ({
      locations: (rows ?? []).map((d) => ({
        id: d.id,
        name: d.businessName,
        city: d.city,
        state: d.state,
        pincode: d.pincode,
        active: d.status === "APPROVED",
      })),
    }),
  });
}
