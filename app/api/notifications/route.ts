import { NextResponse } from "next/server";

import { requireUser } from "@/app/server/authz";
import { readSessionCookie, verifySession } from "@/app/lib/auth";
import { backendFetch, isBackendUnreachable, BackendError } from "@/app/lib/backend";
import {
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/server/notifications";

export const runtime = "nodejs";

/**
 * The UI contract is identical whether the row came from the NestJS backend or
 * the local Prisma store. The backend knows nothing about delivery tracking, so
 * its rows are reported as DELIVERED in-app and with no per-channel detail.
 */

interface BackendNotification {
  id: number;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface UiNotification {
  id: string;
  title: string;
  /** `body` and `message` are the same text — both are consumed by the UI. */
  body: string;
  message: string;
  type: string;
  eventType: string;
  link: string | null;
  priority: string;
  status: string;
  read: boolean;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  deliveries: Array<{
    channel: string;
    status: string;
    attemptCount: number;
    maxAttempts: number;
    errorCode: string | null;
  }>;
}

/** Map a backend notification to the local shape. */
function mapBackendNotification(n: BackendNotification): UiNotification {
  return {
    id: String(n.id),
    title: n.title,
    body: n.body,
    message: n.body,
    type: n.type,
    eventType: n.type,
    link: null,
    priority: "NORMAL",
    status: "DELIVERED",
    read: n.isRead,
    isRead: n.isRead,
    readAt: null,
    createdAt: n.createdAt,
    deliveries: [
      { channel: "IN_APP", status: "DELIVERED", attemptCount: 0, maxAttempts: 0, errorCode: null },
    ],
  };
}

/** Map a local notification + its delivery rows to the UI shape. */
function mapLocalNotification(n: {
  id: string;
  title: string;
  message: string;
  type: string;
  eventType: string;
  link: string | null;
  priority: string;
  status: string;
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
  deliveries: Array<{
    channel: string;
    status: string;
    attemptCount: number;
    maxAttempts: number;
    errorCode: string | null;
  }>;
}): UiNotification {
  return {
    id: n.id,
    title: n.title,
    body: n.message,
    message: n.message,
    type: n.type,
    eventType: n.eventType,
    link: n.link,
    priority: n.priority,
    status: n.status,
    read: n.read,
    isRead: n.read,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
    deliveries: n.deliveries.map((d) => ({
      channel: d.channel,
      status: d.status,
      attemptCount: d.attemptCount,
      maxAttempts: d.maxAttempts,
      errorCode: d.errorCode,
    })),
  };
}

/**
 * GET /api/notifications — list the current user's notifications (backend first).
 * Accepts: unread=1, limit, skip.
 */
export async function GET(request: Request) {
  const session = await verifySession(readSessionCookie(request));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "1";
  const limit = Number(searchParams.get("limit")) || 50;
  const skip = Number(searchParams.get("skip")) || 0;

  if (session.token) {
    try {
      const notifications = await backendFetch<BackendNotification[]>(
        "/notifications",
        { token: session.token },
      );
      const rows = (notifications ?? []).map(mapBackendNotification);
      return NextResponse.json({
        notifications: unreadOnly ? rows.filter((n) => !n.read) : rows,
        unreadCount: rows.filter((n) => !n.read).length,
        source: "backend",
      });
    } catch (err) {
      if (!isBackendUnreachable(err) && err instanceof BackendError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
    }
  }

  // Local fallback
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  const { notifications, unreadCount } = await listNotificationsForUser(auth.session.id, {
    unreadOnly,
    take: limit,
    skip,
  });
  return NextResponse.json({
    notifications: notifications.map(mapLocalNotification),
    unreadCount,
    source: "local",
  });
}

/**
 * PATCH /api/notifications — mark notifications read.
 * Body `{ id }` marks one notification; an empty body marks them all.
 */
export async function PATCH(request: Request) {
  const session = await verifySession(readSessionCookie(request));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let id: string | undefined;
  try {
    const body = (await request.json()) as { id?: unknown };
    if (typeof body?.id === "string" && body.id.trim()) id = body.id.trim();
  } catch {
    // No body — treat as "mark all read".
  }

  if (!id && session.token) {
    try {
      await backendFetch("/notifications/read-all", {
        method: "PATCH",
        token: session.token,
      });
      return NextResponse.json({ ok: true, source: "backend" });
    } catch (err) {
      if (!isBackendUnreachable(err) && err instanceof BackendError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
    }
  }

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const updated = id
    ? await markNotificationRead(auth.session.id, id)
    : await markAllNotificationsRead(auth.session.id);

  if (id && !updated) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, updated, source: "local" });
}
