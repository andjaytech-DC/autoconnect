import { getDb, newId, updateDb } from "./db";
import type { Booking } from "./types";
import { backendFetch } from "@/app/lib/backend";

export async function listBookings(userId: string): Promise<Booking[]> {
  const db = await getDb();
  return db.bookings
    .filter((b) => b.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export class InvalidBookingError extends Error {}

export async function createBooking(
  userId: string,
  input: { carId: number; date: string; slot: string },
): Promise<Booking> {
  // Validate against a genuinely listed vehicle. This used to check a static
  // fixture, which meant a real car in the database could not be booked at all.
  let vehicleExists = false;
  try {
    const vehicle = await backendFetch<{ id: number }>(
      `/vehicles/${input.carId}`,
    );
    vehicleExists = vehicle?.id === input.carId;
  } catch {
    // Backend unreachable: fail closed rather than accept an unverified car.
    throw new InvalidBookingError("Could not verify that vehicle. Try again.");
  }
  if (!vehicleExists) throw new InvalidBookingError("Unknown vehicle");

  const date = input.date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new InvalidBookingError("Date must be in yyyy-mm-dd format");
  }
  const today = new Date().toISOString().slice(0, 10);
  if (date < today) {
    throw new InvalidBookingError("Choose a date from today onwards");
  }
  const slot = input.slot.trim();
  if (slot.length < 2 || slot.length > 20) {
    throw new InvalidBookingError("Choose a valid time slot");
  }

  const { result } = await updateDb((db) => {
    const booking: Booking = {
      id: newId("bkg"),
      userId,
      carId: input.carId,
      date,
      slot,
      status: "CONFIRMED",
      createdAt: new Date().toISOString(),
    };
    db.bookings.push(booking);
    return booking;
  });
  return result;
}

export async function cancelBooking(
  userId: string,
  bookingId: string,
): Promise<Booking | null> {
  const { result } = await updateDb((db) => {
    const booking = db.bookings.find(
      (b) => b.id === bookingId && b.userId === userId,
    );
    if (!booking || booking.status !== "CONFIRMED") return null;
    booking.status = "CANCELLED";
    return booking;
  });
  return result;
}