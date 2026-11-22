/**
 * Shapes shared by the account BFF routes and the dashboard server component.
 *
 * NestJS rows are mapped to the UI contract in exactly one place, so the
 * dashboard (which reads NestJS directly) and the `/api/orders`,
 * `/api/bookings` routes can never disagree about what a status or a car id
 * means.
 */

export interface BackendOrder {
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

export interface BackendFinanceApplication {
  id: number;
  referenceNo?: string;
  vehicleId?: number | null;
  loanAmount: number;
  status:
    | "DRAFT"
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "DOCUMENTS_REQUIRED"
    | "APPROVED"
    | "REJECTED"
    | "DISBURSED";
  createdAt: string;
}

export type UiOrderType = "PURCHASE" | "FINANCE" | "INSURANCE";
export type UiOrderStatus = "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED";

export interface UiOrder {
  id: string;
  carId: number;
  type: UiOrderType;
  amount: number;
  status: UiOrderStatus;
  createdAt: string;
}

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

const FINANCE_STATUS_MAP: Record<BackendFinanceApplication["status"], UiOrderStatus> = {
  DRAFT: "PENDING",
  SUBMITTED: "PENDING",
  UNDER_REVIEW: "PENDING",
  DOCUMENTS_REQUIRED: "PENDING",
  APPROVED: "APPROVED",
  DISBURSED: "COMPLETED",
  REJECTED: "CANCELLED",
};

/** Map a backend order to the UI order shape. */
export function mapOrder(o: BackendOrder): UiOrder {
  return {
    id: String(o.id),
    carId: o.itemType === "VEHICLE" ? o.itemId : 0,
    type: TYPE_MAP[o.itemType] ?? "PURCHASE",
    amount: o.totalPrice,
    status: STATUS_MAP[o.status] ?? "PENDING",
    createdAt: o.createdAt,
  };
}

/** A loan application is shown in the same list as the customer's orders. */
export function mapFinance(a: BackendFinanceApplication): UiOrder {
  return {
    id: a.referenceNo ?? `FA${String(a.id).padStart(6, "0")}`,
    carId: a.vehicleId ?? 0,
    type: "FINANCE",
    amount: a.loanAmount,
    status: FINANCE_STATUS_MAP[a.status] ?? "PENDING",
    createdAt: a.createdAt,
  };
}

export interface BackendBooking {
  id: number;
  bookingDate: string;
  status: string;
  notes?: string | null;
  vehicleId: number;
  customerId: number;
  dealerId: number;
  createdAt: string;
  vehicle?: { title?: string } | null;
}

/**
 * ISO datetime → "10:30 AM" for the UI slot display.
 *
 * `slotToIso` writes the wall-clock slot as UTC, so it must be read back as UTC.
 * Reading it with local-time getters shifted every slot by the server's offset.
 */
export function isoToSlot(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  let hh = d.getUTCHours();
  const mm = d.getUTCMinutes();
  const ap = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${ap}`;
}

/** Map a backend booking row to the UI booking shape. */
export function mapBooking(b: BackendBooking) {
  return {
    id: String(b.id),
    carId: b.vehicleId,
    date: (b.bookingDate ?? "").slice(0, 10),
    slot: isoToSlot(b.bookingDate),
    status: b.status,
    createdAt: b.createdAt,
    vehicleName: b.vehicle?.title ?? null,
  };
}

export interface BackendWishlistRow {
  id: number;
  vehicleId: number;
  createdAt: string;
}
