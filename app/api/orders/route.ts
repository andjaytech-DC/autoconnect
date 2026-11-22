import { NextResponse } from "next/server";

import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import {
  mapFinance,
  mapOrder,
  type BackendFinanceApplication,
  type BackendOrder,
} from "@/app/lib/account-mappers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await verifySession(readSessionCookie(request));
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!session.token) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }

  try {
    const [orders, applications] = await Promise.all([
      backendFetch<BackendOrder[]>("/orders", { token: session.token }),
      backendFetch<BackendFinanceApplication[]>("/finance/applications", {
        token: session.token,
      }),
    ]);
    const merged = [
      ...(orders ?? []).map(mapOrder),
      ...(applications ?? []).map(mapFinance),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return NextResponse.json({ orders: merged, source: "backend" });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
