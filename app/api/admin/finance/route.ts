import { adminCall } from "@/app/server/admin-proxy";

export const runtime = "nodejs";

/** GET /api/admin/finance: every finance application (PAN excluded by NestJS). */
export async function GET(request: Request) {
  return adminCall({ request, path: "/admin/finance", shape: (finance) => ({ finance: finance ?? [] }) });
}
