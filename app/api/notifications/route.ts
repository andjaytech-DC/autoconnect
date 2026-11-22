import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/backend";
import { backendErrorResponse } from "@/app/lib/bff-errors";
import { requireUser } from "@/app/server/authz";

export const runtime = "nodejs";

/**
 * Notifications live in NestJS (one `Notification` row per message, in-app read
 * flag). There is no local store: when the backend is down this answers 503.
 * The backend has no delivery tracking, so rows are reported as DELIVERED in
 * app with a single IN_APP delivery to keep the UI contract unchanged.
 */

interface BackendNotification {
  id: number;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

function mapNotification(n: BackendNotification) {
  return {
    id: String(n.id),
    title: n.title,
    /** `body` and `message` are the same text — both are consumed by the UI. */
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

type Who = { response: Response } | { token: string };

async function authenticate(request: Request): Promise<Who> {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return { response: auth };
  if (!auth.session.token) {
    return { response: NextResponse.json({ error: "Please sign in again" }, { status: 401 }) };
  }
  return { token: auth.session.token };
}

/**
 * GET /api/notifications — the caller's notifications, newest first.
 * Accepts: unread=1, limit (1–200), skip.
 */
export async function GET(request: Request) {
  const who = await authenticate(request);
  if ("response" in who) return who.response;

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "1";
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 200);
  const skip = Math.max(Number(searchParams.get("skip")) || 0, 0);

  try {
    const data = await backendFetch<BackendNotification[]>("/notifications", { token: who.token });
    const rows = (data ?? []).map(mapNotification);
    const visible = (unreadOnly ? rows.filter((n) => !n.read) : rows).slice(skip, skip + limit);
    return NextResponse.json({
      notifications: visible,
      unreadCount: rows.filter((n) => !n.read).length,
      source: "backend",
    });
  } catch (err) {
    return backendErrorResponse(err);
  }
}

/**
 * PATCH /api/notifications — mark notifications read.
 * Body `{ id }` marks one; an empty body marks them all.
 */
export async function PATCH(request: Request) {
  const who = await authenticate(request);
  if ("response" in who) return who.response;

  let id: string | undefined;
  try {
    const body = (await request.json()) as { id?: unknown };
    if (typeof body?.id === "string" && body.id.trim()) id = body.id.trim();
    else if (typeof body?.id === "number") id = String(body.id);
  } catch {
    // No body — treat as "mark all read".
  }

  if (id !== undefined && !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
  }

  try {
    await backendFetch(id ? `/notifications/${Number(id)}/read` : "/notifications/read-all", {
      method: "PATCH",
      token: who.token,
    });
    return NextResponse.json({ ok: true, source: "backend" });
  } catch (err) {
    const res = backendErrorResponse(err);
    return res.status === 404
      ? NextResponse.json({ error: "Notification not found" }, { status: 404 })
      : res;
  }
}
