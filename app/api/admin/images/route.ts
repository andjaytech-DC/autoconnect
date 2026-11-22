import { adminCall } from "@/app/server/admin-proxy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return adminCall({ request, path: "/admin/images", shape: (images) => ({ images: images ?? [] }) });
}
