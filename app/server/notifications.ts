import { prisma } from "@/app/server/prisma";
import type { NotificationType } from "@/app/generated/prisma/enums";

/**
 * Local notification access for the Prisma fallback path.
 *
 * The database is owned by progressive-autohub-backend and its `Notification`
 * table is intentionally small: one row per logical message with an in-app read
 * flag. There is no per-channel delivery table, no retry queue and no provider
 * state — FCM/SMS/email dispatch belongs to the backend, and `/api/notifications`
 * already prefers the backend when a session token is present.
 *
 * So this module does exactly three things: list, mark one read, mark all read.
 * It deliberately reports a single synthetic IN_APP/DELIVERED delivery so the
 * existing UI contract stays unchanged.
 */

/** Row shape consumed by `mapLocalNotification` in app/api/notifications/route.ts. */
export interface LocalNotification {
  id: string;
  title: string;
  /** The stored column is `body`; the UI calls it `message`. */
  message: string;
  type: string;
  eventType: string;
  link: string | null;
  priority: string;
  status: string;
  read: boolean;
  /** The table has no read timestamp, only the boolean flag. */
  readAt: Date | null;
  createdAt: Date;
  deliveries: Array<{
    channel: string;
    status: string;
    attemptCount: number;
    maxAttempts: number;
    errorCode: string | null;
  }>;
}

type NotificationRow = {
  id: number;
  title: string;
  body: string;
  type: NotificationType | string;
  isRead: boolean;
  createdAt: Date;
};

/** The single in-app delivery row every local notification reports. */
function inAppDelivery(): LocalNotification["deliveries"] {
  return [
    {
      channel: "IN_APP",
      status: "DELIVERED",
      attemptCount: 0,
      maxAttempts: 0,
      errorCode: null,
    },
  ];
}

function toLocalNotification(row: NotificationRow): LocalNotification {
  const type = String(row.type);
  return {
    id: String(row.id),
    title: row.title,
    message: row.body,
    type,
    eventType: type,
    link: null,
    priority: "NORMAL",
    status: "DELIVERED",
    read: row.isRead,
    readAt: null,
    createdAt: row.createdAt,
    deliveries: inAppDelivery(),
  };
}

/**
 * Coerce a caller-supplied identifier to the integer the column expects.
 * Session ids arrive as strings from cookies, so a non-numeric id is a mismatch
 * rather than a value to pass through.
 */
function toUserId(userId: number | string): number | null {
  const n = typeof userId === "number" ? userId : Number.parseInt(userId, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * GET helper — the caller's notifications, newest first.
 * `unreadOnly` filters on the boolean flag; `take`/`skip` page the result.
 */
export async function listNotificationsForUser(
  userId: number | string,
  options: { unreadOnly?: boolean; take?: number; skip?: number } = {},
): Promise<{ notifications: LocalNotification[]; unreadCount: number }> {
  const id = toUserId(userId);
  if (id === null) return { notifications: [], unreadCount: 0 };

  const take = Math.min(Math.max(options.take ?? 50, 1), 200);
  const skip = Math.max(options.skip ?? 0, 0);
  const where = { userId: id, ...(options.unreadOnly ? { isRead: false } : {}) };

  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.notification.count({ where: { userId: id, isRead: false } }),
  ]);

  return { notifications: rows.map(toLocalNotification), unreadCount };
}

/**
 * PATCH helper — mark one notification read.
 * Returns false when the id is malformed or belongs to another user, so the
 * caller can answer 404 instead of leaking the existence of a foreign row.
 */
export async function markNotificationRead(
  userId: number | string,
  notificationId: number | string,
): Promise<boolean> {
  const id = toUserId(userId);
  const target =
    typeof notificationId === "number"
      ? notificationId
      : Number.parseInt(notificationId, 10);
  if (id === null || !Number.isInteger(target)) return false;

  const result = await prisma.notification.updateMany({
    where: { id: target, userId: id },
    data: { isRead: true },
  });
  return result.count > 0;
}

/** PATCH helper — mark every notification read. Returns the number updated. */
export async function markAllNotificationsRead(userId: number | string): Promise<number> {
  const id = toUserId(userId);
  if (id === null) return 0;

  const result = await prisma.notification.updateMany({
    where: { userId: id, isRead: false },
    data: { isRead: true },
  });
  return result.count;
}
