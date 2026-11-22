import { adminCall } from "@/app/server/admin-proxy";

export const runtime = "nodejs";

/** GET /api/insurance/report — admin: totals by status, cover type and partner, plus weekly volume. */
export async function GET(request: Request) {
  return adminCall({
    request,
    path: "/insurance-enquiries/report",
    shape: (report: unknown) => ({ report }),
  });
}
