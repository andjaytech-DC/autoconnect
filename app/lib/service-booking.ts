/**
 * Client-side shapes and display labels for the services module.
 *
 * Workflow RULES (which move is allowed, who may cancel) are NOT duplicated here:
 * NestJS returns `nextStatuses`, `canCancel` and `canReassign` on every booking,
 * so the UI can never disagree with the server. Only wording lives here.
 */

export const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
] as const;

export const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Assigned",
  VEHICLE_RECEIVED: "Vehicle received",
  IN_PROGRESS: "In progress",
  AWAITING_APPROVAL: "Awaiting approval",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** Plain-language "what happens next" for the customer. */
export const STATUS_HINT: Record<string, string> = {
  REQUESTED: "We have your request. A person will confirm it against the provider's availability.",
  CONFIRMED: "Your booking is confirmed. A provider will be assigned.",
  ASSIGNED: "A provider is assigned. Take your vehicle at the booked time.",
  VEHICLE_RECEIVED: "The provider has your vehicle.",
  IN_PROGRESS: "Work is under way.",
  AWAITING_APPROVAL: "The provider needs your approval before continuing. They will contact you.",
  COMPLETED: "The service is complete.",
  CANCELLED: "This booking was cancelled.",
};

export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s;

export interface ServiceCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  providerCount: number;
  cities: string[];
  /** True only when at least one ACTIVE provider offers it. */
  bookable: boolean;
}

export interface ServiceProviderLite {
  id: number;
  name: string;
  description?: string | null;
  city: string;
  services: string[];
  phone?: string | null;
  address?: string | null;
}

export interface TimelineEvent {
  at: string;
  kind: "REQUESTED" | "STATUS" | "ASSIGNED";
  status?: string;
  label: string;
}

export interface ServiceBookingDto {
  id: number;
  providerId: number;
  /** Verified owner; null for a guest or pre-account booking. */
  userId?: number | null;
  service: string;
  categoryCode: string | null;
  customerName: string;
  customerPhone: string;
  vehicleReg: string | null;
  vehicleDetails: string | null;
  notes: string | null;
  preferredDate: string;
  preferredTime: string;
  status: string;
  createdAt: string;
  provider: { id: number; name: string; phone: string; city: string } | null;
  nextStatuses: string[];
  canCancel: boolean;
  canReassign: boolean;
  timeline?: TimelineEvent[];
}

export function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(d);
}

/** YYYY-MM-DD in India time, for <input type="date"> min/max. */
export function istDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}
