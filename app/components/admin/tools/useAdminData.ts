"use client";

import { useCallback, useEffect, useState } from "react";

export interface AdminData<T> {
  data: T | null;
  loading: boolean;
  /** Set when the request failed; an empty list is NOT shown in that case. */
  error: string | null;
  reload: () => void;
}

/** GET an /api/admin/* route and surface failure instead of an empty screen. */
export function useAdminData<T>(url: string): AdminData<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    // Deferred so the effect body itself never sets state synchronously.
    void (async () => {
      await Promise.resolve();
      if (!live) return;
      setLoading(true);
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`);
        if (!live) return;
        setData(json as T);
        setError(null);
      } catch (e: unknown) {
        if (live) setError(e instanceof Error ? e.message : "Could not load");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [url, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data, loading, error, reload };
}

export async function sendAdmin(
  url: string,
  method: "PATCH" | "POST",
  body: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    const json = await res.json().catch(() => ({}));
    return { ok: false, error: json?.error ?? `Request failed (${res.status})` };
  } catch {
    return { ok: false, error: "Network error" };
  }
}
