import { adminCall } from "@/app/server/admin-proxy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return adminCall<{ stats?: unknown }>({
    request,
    path: "/admin/reports",
    shape: (r) => ({ stats: r?.stats ?? null }),
  });
}
