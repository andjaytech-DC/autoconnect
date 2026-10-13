import type { UserRole } from "@/app/lib/auth";

/** Persisted user record (never returned to clients with `passwordHash`). */
export interface StoredUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
}

/** Public shape returned to clients. */
export type PublicUser = Omit<StoredUser, "passwordHash">;

export interface WishlistItem {
  id: string;
  userId: string;
  carId: number;
  addedAt: string;
}

export type BookingStatus = "CONFIRMED" | "COMPLETED" | "CANCELLED";

export interface Booking {
  id: string;
  userId: string;
  carId: number;
  date: string; // ISO date (yyyy-mm-dd)
  slot: string; // e.g. "10:30 AM"
  status: BookingStatus;
  createdAt: string;
}

export type OrderType = "PURCHASE" | "FINANCE" | "INSURANCE";
export type OrderStatus = "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED";

export interface Order {
  id: string;
  userId: string;
  carId: number;
  type: OrderType;
  amount: number; // INR
  status: OrderStatus;
  createdAt: string;
}

/** Mutable collections owned by the app. */
export interface Db {
  users: StoredUser[];
  wishlist: WishlistItem[];
  bookings: Booking[];
  orders: Order[];
}

/* ── Static reference data (not user-mutable) ── */

export interface ChallanItem {
  id: string;
  date: string;
  violation: string;
  location: string;
  amount: number;
  status: "PENDING" | "PAID";
}

export interface ChallanRecord {
  rc: string;
  ownerName: string;
  vehicle: string;
  fuel: string;
  challans: ChallanItem[];
}

export interface InspectionSection {
  name: string;
  score: number; // 0-100
  notes: string[];
}

export interface InspectionReport {
  rc: string;
  vehicle: string;
  year: number;
  odometer: string;
  overallScore: number;
  checkedAt: string;
  sections: InspectionSection[];
}
