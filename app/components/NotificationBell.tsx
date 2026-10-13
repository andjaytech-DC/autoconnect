"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Check, Loader2, X } from "lucide-react";
import { UI_COOKIE } from "@/app/lib/auth";

/**
 * Notification centre.
 *
 * Reads the existing GET/PATCH /api/notifications contract, so it works against
 * whichever source that route resolves (NestJS first, local Prisma fallback).
 * Nothing here is fabricated — an empty list renders as an empty state rather
 * than placeholder rows.
 */

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  type: string;
  eventType: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const POLL_MS = 60_000;

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  /**
   * `null` = unknown (pre-hydration), `true`/`false` = a session role cookie
   * exists. The bell renders nothing and never polls until we know one does, so
   * anonymous visitors don't generate a guaranteed 401 on every page load.
   */
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const sync = () => {
      // `pah_session` is HttpOnly on purpose, so presence is detected from the
      // non-sensitive `pah_ui` role cookie instead. This only decides whether
      // to render the bell — it authorizes nothing; /api/notifications still
      // re-verifies the signed session.
      const present = document.cookie
        .split("; ")
        .some((c) => c.startsWith(`${UI_COOKIE}=`));
      setHasSession(present);
    };
    sync();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, []);

  /**
   * Pure fetch — no state. Kept separate so the mount effect can await it
   * before touching state, instead of setting state synchronously inside the
   * effect body (which cascades a re-render on every mount).
   */
  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications?limit=25", {
      cache: "no-store",
    });
    if (res.status === 401) return { rows: [] as NotificationRow[], unread: 0 };
    if (!res.ok) throw new Error("Could not load notifications");
    const data = (await res.json()) as {
      notifications?: NotificationRow[];
      unreadCount?: number;
    };
    return {
      rows: Array.isArray(data.notifications) ? data.notifications : [],
      unread: Number(data.unreadCount) || 0,
    };
  }, []);

  const applyNotifications = useCallback(
    (data: { rows: NotificationRow[]; unread: number }) => {
      setRows(data.rows);
      setUnread(data.unread);
      setError("");
    },
    [],
  );

  /** Manual/poll refresh, where a spinner is wanted. */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      applyNotifications(await fetchNotifications());
    } catch {
      // Surface the failure rather than pretending the list is empty.
      setError("Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, [applyNotifications, fetchNotifications]);

  useEffect(() => {
    if (hasSession !== true) return;
    let active = true;
    const run = async () => {
      try {
        const data = await fetchNotifications();
        if (!active) return;
        applyNotifications(data);
      } catch {
        if (active) setError("Could not load notifications.");
      }
    };
    void run();
    const id = setInterval(() => {
      if (!document.hidden) void run();
    }, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [applyNotifications, fetchNotifications, hasSession]);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        panelRef.current?.contains(e.target as Node) ||
        buttonRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const markAll = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await load();
    } catch {
      setError("Could not update notifications.");
    }
  };

  const openOne = async (n: NotificationRow) => {
    if (!n.read) {
      // Optimistic: flip locally, then reconcile with the server.
      setRows((prev) =>
        prev.map((r) => (r.id === n.id ? { ...r, read: true } : r)),
      );
      setUnread((c) => Math.max(0, c - 1));
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: n.id }),
        });
      } catch {
        void load();
      }
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  };

  // Nothing to show (or poll for) until we know a session cookie exists.
  if (hasSession !== true) return null;

  return (
    <div className="relative hidden lg:block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-card text-content-muted transition hover:border-line-hover hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--color-bg))]"
      >
        <Bell size={17} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--color-primary))] px-1 text-[10px] font-bold text-[hsl(var(--color-primary-foreground))]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-line bg-card shadow-[var(--shadow-elevated)]"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-bold text-content">Notifications</p>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-content-muted transition hover:bg-surface hover:text-content"
                >
                  <Check size={12} aria-hidden="true" />
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="rounded-lg p-1 text-content-muted transition hover:bg-surface hover:text-content"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && rows.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={18} className="animate-spin text-content-muted" />
              </div>
            ) : error ? (
              <p className="px-4 py-8 text-center text-sm text-[hsl(var(--color-error))]">
                {error}
              </p>
            ) : rows.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell
                  size={24}
                  className="mx-auto mb-2 text-content-faint"
                  aria-hidden="true"
                />
                <p className="text-sm text-content-muted">No notifications yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {rows.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => void openOne(n)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-surface ${
                        n.read ? "opacity-70" : ""
                      }`}
                    >
                      {!n.read && (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--color-primary))]"
                          aria-label="Unread"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-content">
                          {n.title}
                        </span>
                        <span className="mt-0.5 block line-clamp-2 text-xs text-content-muted">
                          {n.message}
                        </span>
                        <span className="mt-1 block text-[10px] text-content-faint">
                          {relativeTime(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-line px-4 py-2">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block text-center text-[11px] font-semibold text-content-muted transition hover:text-[hsl(var(--color-primary-strong))]"
            >
              View account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
