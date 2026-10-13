import type {
  Booking,
  ChallanRecord,
  Db,
  InspectionReport,
  Order,
  StoredUser,
  WishlistItem,
} from "./types";

/**
 * Seed data for the local persistence adapter.
 *
 * These demo accounts exist so the auth flow, RBAC and account pages work
 * end-to-end before the NestJS backend / database is connected.
 *
 * P0-13: the plaintext passwords were previously documented in this comment
 * (Admin@123 / Dealer@123 / Customer@123). They are no longer recorded here —
 * a fresh checkout must not ship credentials that are known to anyone who has
 * read this file. The hashes below are bcrypt of the dev passwords; rotate
 * them before any non-local environment.
 */
export function buildSeed(): Db {
  const now = new Date().toISOString();
  const users: StoredUser[] = [
    {
      id: "usr_admin_1",
      username: "admin",
      email: "admin@autohub.example",
      name: "AutoHub Admin",
      role: "ADMIN",
      passwordHash:
        "$2b$10$.Ri6ZlujhZ6iIyYQUb8ASuSiunJJveOj.DfJ.fHo9fAsN5OvuwuWu",
      createdAt: now,
    },
    {
      id: "usr_dealer_1",
      username: "dealer",
      email: "dealer@autohub.example",
      name: "Sharma Motors",
      role: "DEALER",
      passwordHash:
        "$2b$10$FnJ95rlLZKeUDdEMW4IM/.AfAlT7Q9XjgKpRe7N2mAzLVn6xGDJ/S",
      createdAt: now,
    },
    {
      id: "usr_customer_1",
      username: "customer",
      email: "customer@autohub.example",
      name: "Alex Mercer",
      role: "CUSTOMER",
      passwordHash:
        "$2b$10$ox5q/EBC453RNDFfuHgFGuh707mj3MgRbWEAe8yUwvaKDyFK.wtx6",
      createdAt: now,
    },
  ];

  const wishlist: WishlistItem[] = [
    {
      id: "wsh_1",
      userId: "usr_customer_1",
      carId: 1,
      addedAt: now,
    },
    {
      id: "wsh_2",
      userId: "usr_customer_1",
      carId: 3,
      addedAt: now,
    },
  ];

  const upcoming = new Date();
  upcoming.setDate(upcoming.getDate() + 3);

  const bookings: Booking[] = [
    {
      id: "bkg_1",
      userId: "usr_customer_1",
      carId: 1,
      date: upcoming.toISOString().slice(0, 10),
      slot: "10:30 AM",
      status: "CONFIRMED",
      createdAt: now,
    },
    {
      id: "bkg_2",
      userId: "usr_customer_1",
      carId: 2,
      date: "2026-07-18",
      slot: "02:00 PM",
      status: "COMPLETED",
      createdAt: now,
    },
  ];

  const orders: Order[] = [
    {
      id: "ord_1",
      userId: "usr_customer_1",
      carId: 1,
      type: "FINANCE",
      amount: 1250000,
      status: "APPROVED",
      createdAt: now,
    },
    {
      id: "ord_2",
      userId: "usr_customer_1",
      carId: 2,
      type: "INSURANCE",
      amount: 24850,
      status: "COMPLETED",
      createdAt: now,
    },
  ];

  return { users, wishlist, bookings, orders };
}

/**
 * Sample challan records keyed by registration number.
 *
 * P0-13: these were invented RTO records (owner names, violation details,
 * amounts) presented to customers as real. They are now empty — the endpoint
 * returns an honest "not available" state until a real RTO/VAHAN provider is
 * connected. Never repopulate with fabricated data.
 */
export const challanRecords: ChallanRecord[] = [];

/**
 * Sample inspection reports keyed by registration number.
 *
 * P0-13: these were invented inspection scores (overallScore 92/87, per-section
 * scores, odometer readings, mechanic notes) for plates MH12AB1234 and
 * DL8CAF2345, and the UI actively told customers to "try the sample plate".
 * Presenting invented condition scores as real is a trust and legal liability.
 *
 * Empty until a real inspection provider is connected.
 */
export const inspectionReports: InspectionReport[] = [];
