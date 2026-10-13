import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/app/server/authz";
import { enforceRateLimit } from "@/app/lib/rate-limit";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin Security surface: role → permission matrix.
 *
 * Proxies the NestJS roles/permissions APIs. The backend is authoritative.
 *
 * POST actions:
 *   assign -> POST   /roles/:role/permissions   { permissionIds: number[] }
 *   revoke -> DELETE /roles/:role/permissions/:permissionId
 *
 * `assign` replaces the role's full set, so the panel always submits the
 * complete desired list rather than a delta.
 */

const assignSchema = z.object({
  action: z.literal("assign"),
  role: z.enum(["ADMIN", "DEALER", "DEALER_EMPLOYEE", "CUSTOMER"]),
  permissionIds: z.array(z.coerce.number().int().positive()).max(500),
});

const revokeSchema = z.object({
  action: z.literal("revoke"),
  role: z.enum(["ADMIN", "DEALER", "DEALER_EMPLOYEE", "CUSTOMER"]),
  permissionId: z.coerce.number().int().positive(),
});

const anySchema = z.union([assignSchema, revokeSchema]);

export async function GET(request: Request) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  const session = auth.session;
  if (!session.token) {
    return NextResponse.json({ error: "Not linked to the API." }, { status: 401 });
  }

  try {
    const [roles, permissions] = await Promise.all([
      backendFetch<RoleWithPermissions[]>("/roles", { token: session.token }),
      backendFetch<Permission[]>("/permissions", { token: session.token }),
    ]);
    return NextResponse.json({ roles, permissions });
  } catch (err) {
    if (!isBackendUnreachable(err) && err instanceof BackendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Security data is temporarily unavailable." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, { limit: 30, key: "admin-security" })).ok) {
    return NextResponse.json(
      { error: "Too many requests, try again later" },
      { status: 429 },
    );
  }

  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  const session = auth.session;
  if (!session.token) {
    return NextResponse.json({ error: "Not linked to the API." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = anySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const token = session.token;

  try {
    if (parsed.data.action === "assign") {
      const res = await backendFetch(`/roles/${parsed.data.role}/permissions`, {
        method: "POST",
        token,
        body: { permissionIds: parsed.data.permissionIds },
      });
      return NextResponse.json(res);
    }

    const res = await backendFetch(
      `/roles/${parsed.data.role}/permissions/${parsed.data.permissionId}`,
      { method: "DELETE", token },
    );
    return NextResponse.json(res);
  } catch (err) {
    if (!isBackendUnreachable(err) && err instanceof BackendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "The security service is temporarily unavailable." },
      { status: 503 },
    );
  }
}

interface Permission {
  id: number;
  name: string;
  description?: string | null;
  module: string;
}

interface RoleWithPermissions {
  role: string;
  permissions: Permission[];
}
