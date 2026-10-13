"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, ShieldCheck, RefreshCw } from "lucide-react";

interface Permission {
  id: number;
  name: string;
  description?: string | null;
  module: string;
}

interface RoleRow {
  role: string;
  permissions: Permission[];
}

const ROLES = ["ADMIN", "DEALER", "DEALER_EMPLOYEE", "CUSTOMER"] as const;

/**
 * Permissions a customer must never hold, whatever the seed data says.
 *
 * The current CUSTOMER role in the database was seeded with vehicles:delete,
 * reviews:delete and reviews:update. This panel flags that rather than quietly
 * rendering a checkbox as if it were fine.
 */
const DANGEROUS_FOR_CUSTOMER = [
  "vehicles:delete",
  "vehicles:update",
  "vehicles:create",
  "reviews:delete",
  "reviews:update",
  "dealers:delete",
  "users:delete",
  "roles:assign-permissions",
];

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/security", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      Array.isArray(json?.message)
        ? json.message.join(" ")
        : json?.error || json?.message || "Request failed",
    );
  }
  return json;
}

export default function SecurityPanel() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [active, setActive] = useState<string>(ROLES[1]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchSecurity = useCallback(async () => {
    const res = await fetch("/api/admin/security");
    if (!res.ok) throw new Error("Could not load the permission matrix.");
    const json = await res.json();
    setRoles(Array.isArray(json.roles) ? json.roles : []);
    setPermissions(Array.isArray(json.permissions) ? json.permissions : []);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/security");
        if (!res.ok) throw new Error("Could not load the permission matrix.");
        const json = await res.json();
        if (!alive) return;
        setRoles(Array.isArray(json.roles) ? json.roles : []);
        setPermissions(Array.isArray(json.permissions) ? json.permissions : []);
      } catch (err) {
        if (alive) setError((err as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const byModule = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions) {
      const list = map.get(p.module) ?? [];
      list.push(p);
      map.set(p.module, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [permissions]);

  const current = roles.find((r) => r.role === active);
  const granted = useMemo(
    () => new Set((current?.permissions ?? []).map((p) => p.id)),
    [current],
  );

  const risky = useMemo(() => {
    if (active !== "CUSTOMER") return [];
    return (current?.permissions ?? [])
      .map((p) => p.name)
      .filter((n) => DANGEROUS_FOR_CUSTOMER.includes(n));
  }, [active, current]);

  async function toggle(permissionId: number) {
    if (saving) return;
    const next = new Set(granted);
    if (next.has(permissionId)) next.delete(permissionId);
    else next.add(permissionId);

    setSaving(true);
    setError("");
    setNotice("");
    try {
      await post({ action: "assign", role: active, permissionIds: [...next] });
      await fetchSecurity();
      setNotice("Permissions updated.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-content-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading permission matrix
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setActive(r);
                setNotice("");
                setError("");
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                active === r
                  ? "bg-[#FFC700] text-black"
                  : "text-content-muted hover:text-content"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void fetchSecurity()
              .catch((e) => setError((e as Error).message))
              .finally(() => setLoading(false));
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <p className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      {risky.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">
            CUSTOMER currently holds {risky.length} permission
            {risky.length === 1 ? "" : "s"} it should never have:
          </p>
          <p className="mt-1 font-mono text-xs">{risky.join(", ")}</p>
          <p className="mt-2">
            Untick them below. A signed-in customer must not be able to delete
            vehicles or edit other people&apos;s reviews.
          </p>
        </div>
      )}

      {permissions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-content-muted">
          No permissions are defined in the database.
        </p>
      ) : (
        byModule.map(([module, perms]) => (
          <div key={module} className="rounded-xl border border-border bg-card p-5">
            <h4 className="text-sm font-bold uppercase tracking-wider text-content-muted">
              {module}
            </h4>
            <ul className="mt-3 space-y-1.5">
              {perms.map((p) => {
                const on = granted.has(p.id);
                const isRisky =
                  active === "CUSTOMER" &&
                  DANGEROUS_FOR_CUSTOMER.includes(p.name);
                return (
                  <li key={p.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-muted ${
                        isRisky && on ? "bg-red-50" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={saving}
                        onChange={() => void toggle(p.id)}
                        className="h-4 w-4 shrink-0 accent-[#FFC700]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-sm text-content">
                          {p.name}
                        </span>
                        {p.description && (
                          <span className="block text-xs text-content-muted">
                            {p.description}
                          </span>
                        )}
                      </span>
                      {isRisky && (
                        <span className="shrink-0 rounded border border-red-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                          risky for customer
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}

      <p className="flex items-center gap-1.5 text-xs text-content-muted">
        <ShieldCheck className="h-3.5 w-3.5" />
        Saving replaces this role&apos;s entire permission set.
      </p>
    </div>
  );
}
