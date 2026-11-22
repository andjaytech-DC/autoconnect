"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

import { PanelError } from "./ui/AdminPanelState";

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
    const res = await fetch("/api/admin/security", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load the permission matrix.");
    const json = await res.json();
    setRoles(Array.isArray(json.roles) ? json.roles : []);
    setPermissions(Array.isArray(json.permissions) ? json.permissions : []);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/security", { cache: "no-store" });
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
      <div className="admin-card flex items-center gap-2 p-5 text-sm text-[hsl(var(--color-content-muted))]" role="status">
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Loading permission matrix…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap gap-1 rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] p-1"
          role="group"
          aria-label="Select a role"
        >
          {ROLES.map((role) => {
            const isActive = active === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setActive(role);
                  setNotice("");
                  setError("");
                }}
                aria-pressed={isActive}
                className={`inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] ${
                  isActive
                    ? "bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]"
                    : "text-[hsl(var(--color-content-muted))] hover:bg-[hsl(var(--admin-surface-muted))] hover:text-[hsl(var(--color-content))]"
                }`}
              >
                {role.replace(/_/g, " ").toLowerCase()}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void fetchSecurity()
              .catch((e) => setError((e as Error).message))
              .finally(() => setLoading(false));
          }}
          className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] px-3.5 text-sm text-[hsl(var(--color-content-muted))] transition-colors hover:text-[hsl(var(--color-content))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
        </button>
      </div>

      {error && <PanelError message={error} onRetry={() => void fetchSecurity()} />}
      {notice && (
        <p
          className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {notice}
        </p>
      )}

      {risky.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900" role="alert">
          <p className="font-semibold">
            Customer accounts currently hold {risky.length} permission
            {risky.length === 1 ? "" : "s"} they should never have:
          </p>
          <p className="mt-1 break-words font-mono text-xs">{risky.join(", ")}</p>
          <p className="mt-2 leading-6">
            Untick them below. A signed-in customer must not be able to delete
            vehicles or edit other people&apos;s reviews.
          </p>
        </div>
      )}

      {permissions.length === 0 ? (
        <div className="admin-card px-5 py-10 text-center">
          <p className="text-sm font-semibold text-[hsl(var(--color-content))]">
            No permissions are defined
          </p>
          <p className="mt-1 text-sm text-[hsl(var(--color-content-muted))]">
            Seed the permission table before assigning role access.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {byModule.map(([module, perms]) => (
            <div key={module} className="admin-card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--color-content-muted))]">
                  {module.replace(/_/g, " ")}
                </h4>
                <span className="rounded-full bg-[hsl(var(--admin-surface-muted))] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[hsl(var(--color-content-muted))]">
                  {perms.filter((p) => granted.has(p.id)).length}/{perms.length}
                </span>
              </div>
              <ul className="mt-3 space-y-1">
                {perms.map((p) => {
                  const on = granted.has(p.id);
                  const isRisky =
                    active === "CUSTOMER" &&
                    DANGEROUS_FOR_CUSTOMER.includes(p.name);
                  return (
                    <li key={p.id}>
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[hsl(var(--admin-surface-muted))] ${
                          isRisky && on ? "bg-red-50" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={saving}
                          onChange={() => void toggle(p.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--color-primary-strong))]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-xs text-[hsl(var(--color-content))]">
                            {p.name}
                          </span>
                          {p.description && (
                            <span className="mt-0.5 block text-xs leading-5 text-[hsl(var(--color-content-muted))]">
                              {p.description}
                            </span>
                          )}
                        </span>
                        {isRisky && (
                          <span className="shrink-0 rounded border border-red-300 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-700">
                            risky
                          </span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-[hsl(var(--color-content-muted))]">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Saving replaces this role&apos;s entire permission set.
      </p>
    </div>
  );
}
