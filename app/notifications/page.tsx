"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
}

type Filter = "all" | "unread";

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);

  /** Pure fetch — no state, so effects can await it before updating the UI. */
  const fetchNotifications = useCallback(async (f: Filter) => {
    const res = await fetch(`/api/notifications?limit=100${f === "unread" ? "&unread=1" : ""}`, {
      cache: "no-store",
    });
    if (res.status === 401) return "signed-out" as const;
    if (!res.ok) throw new Error();
    const data = (await res.json()) as { notifications: Notification[]; unreadCount: number };
    return data;
  }, []);

  const load = useCallback(async (f: Filter) => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchNotifications(f);
      if (result === "signed-out") {
        setSignedOut(true);
        return;
      }
      setItems(result.notifications);
      setUnread(result.unreadCount);
    } catch {
      setError("Could not load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications]);

  useEffect(() => {
    let active = true;
    (async () => {
      // Yield once so the mount/filter effect does not set state synchronously.
      await Promise.resolve();
      if (!active) return;
      try {
        const result = await fetchNotifications(filter);
        if (!active) return;
        if (result === "signed-out") {
          setSignedOut(true);
          return;
        }
        setItems(result.notifications);
        setUnread(result.unreadCount);
      } catch {
        if (active) setError("Could not load notifications. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [filter, fetchNotifications]);

  async function markRead(id?: string) {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: id ? JSON.stringify({ id }) : undefined,
    });
    if (res.ok) await load(filter);
    else setError("Could not update notifications.");
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--color-bg))] font-sans text-[hsl(var(--color-content))]">
      <div className="mx-auto max-w-3xl px-6 py-12 lg:px-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-yellow-500 text-[#15130a]">
              <Bell size={20} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-content">Notifications</h1>
              <p className="text-sm text-content-muted">{unread} unread</p>
            </div>
          </div>
          {!signedOut && unread > 0 && (
            <button
              type="button"
              onClick={() => void markRead()}
              className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-content hover:bg-surface"
            >
              <CheckCheck size={16} aria-hidden="true" /> Mark all read
            </button>
          )}
        </div>

        {signedOut ? (
          <div className="rounded-2xl border border-dashed border-line bg-card py-16 text-center">
            <p className="font-semibold text-content">Sign in to see your notifications</p>
            <Link href="/login" className="mt-3 inline-block font-semibold text-[hsl(var(--color-primary-strong))]">
              Go to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex gap-2" role="tablist" aria-label="Filter notifications">
              {(["all", "unread"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-semibold capitalize",
                    filter === f ? "bg-[hsl(var(--color-primary))] text-[#15130a]" : "bg-surface text-content-muted",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24 text-content-muted">
                <Loader2 size={22} className="animate-spin" aria-hidden="true" />
                <span className="ml-2">Loading…</span>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-300">
                {error}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-card py-20 text-center">
                <Bell size={40} className="mx-auto text-content-faint" aria-hidden="true" />
                <p className="mt-4 font-semibold text-content">
                  {filter === "unread" ? "You're all caught up" : "No notifications yet"}
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "flex items-start justify-between gap-4 rounded-2xl border bg-card p-5",
                      n.read ? "border-line" : "border-[hsl(var(--color-primary))]/50",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {!n.read && (
                          <span className="h-2 w-2 rounded-full bg-[hsl(var(--color-primary))]" aria-label="Unread" />
                        )}
                        <span className="font-bold text-content">{n.title}</span>
                      </div>
                      <p className="mt-1 text-sm text-content-muted">{n.body}</p>
                      <p className="mt-2 text-xs text-content-faint">
                        {new Date(n.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => void markRead(n.id)}
                        className="shrink-0 text-xs font-semibold text-[hsl(var(--color-primary-strong))]"
                      >
                        Mark read
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
