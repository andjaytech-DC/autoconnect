import { NextResponse } from "next/server";

import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";
import { listOrders } from "@/app/server/orders";

export const runtime = "nodejs";

interface BackendOrder {
  id: number;
  itemType: "VEHICLE" | "ACCESSORY" | "SERVICE" | "INSURANCE";
  itemId: number;
  itemName: string;
  itemImage?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status:
    | "PLACED"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "RETURNED";
  createdAt: string;
}

type UiOrderType = "PURCHASE" | "FINANCE" | "INSURANCE";
type UiOrderStatus = "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED";

const TYPE_MAP: Record<BackendOrder["itemType"], UiOrderType> = {
  VEHICLE: "PURCHASE",
  ACCESSORY: "PURCHASE",
  SERVICE: "PURCHASE",
  INSURANCE: "INSURANCE",
};

const STATUS_MAP: Record<BackendOrder["status"], UiOrderStatus> = {
  PLACED: "PENDING",
  CONFIRMED: "PENDING",
  PROCESSING: "APPROVED",
  SHIPPED: "APPROVED",
  DELIVERED: "COMPLETED",
  CANCELLED: "CANCELLED",
  RETURNED: "CANCELLED",
};

/** Map a backend order to the UI order shape. */
function mapOrder(o: BackendOrder) {
  return {
    id: String(o.id),
    carId: o.itemType === "VEHICLE" ? o.itemId : 0,
    type: TYPE_MAP[o.itemType] ?? "PURCHASE",
    amount: o.totalPrice,
    status: STATUS_MAP[o.status] ?? "PENDING",
    createdAt: o.createdAt,
  };
}

export async function GET(request: Request) {
  const session = await verifySession(readSessionCookie(request));
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 1) NestJS backend (authoritative)
  if (session.token) {
    try {
      const orders = await backendFetch<BackendOrder[]>("/orders", {
        token: session.token,
      });
      return NextResponse.json({
        orders: (orders ?? []).map(mapOrder),
        source: "backend",
      });
    } catch (err) {
      if (!isBackendUnreachable(err) && err instanceof BackendError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
    }
  }

  // 2) Local fallback
  return NextResponse.json({
    orders: await listOrders(session.id),
    source: "local",
  });
}