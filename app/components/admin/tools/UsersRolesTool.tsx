"use client";

import { useMemo, useState } from "react";
import { Search, ShieldCheck, UserRound } from "lucide-react";

import { Notice, StatCard } from "./AdminToolShell";
import { sendAdmin, useAdminData } from "./useAdminData";
import StatusBadge from "../ui/StatusBadge";
import { formatIndianNumber } from "@/app/lib/currency";

interface UserRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
}

const ROLES = ["CUSTOMER", "DEALER", "DEALER_EMPLOYEE", "ADMIN"];

export default function UsersRolesTool() {
  const { data, loading, error } = useAdminData<{ users: UserRow[] }>("/api/admin/users");
  // Optimistic patches live here instead of a copy of the server list, so a
  // reload from the backend is always the source of truth.
  const [overrides, setOverrides] = useState<Record<number, Partial<UserRow>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const users = useMemo(() => {
    const base = data?.users ?? [];
    return base.map((user) =>
      overrides[user.id] ? { ...user, ...overrides[user.id] } : user,
    );
  }, [data, overrides]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) =>
      [user.firstName, user.lastName, user.email, user.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [query, users]);

  if (loading) return <Notice kind="loading">Loading users…</Notice>;
  if (error || !data) return <Notice kind="error">{error ?? "Could not load users"}</Notice>;

  const patch = (id: number, change: Partial<UserRow>) =>
    setOverrides((current) => ({
      ...current,
      [id]: { ...current[id], ...change },
    }));

  async function changeRole(u: UserRow, role: string) {
    if (role === u.role) return;
    // Granting ADMIN is the one change that cannot be taken lightly.
    if (role === "ADMIN" && !window.confirm(`Make ${u.email} an administrator?`)) return;
    const r = await sendAdmin(`/api/admin/users/${u.id}/assign-role`, "PATCH", { role });
    if (r.ok) {
      patch(u.id, { role });
      setMessage(null);
    } else setMessage(`Role not changed: ${r.error}`);
  }

  async function toggleActive(u: UserRow) {
    const r = await sendAdmin(`/api/admin/users/${u.id}`, "PATCH", { isActive: !u.isActive });
    if (r.ok) {
      patch(u.id, { isActive: !u.isActive });
      setMessage(null);
    } else setMessage(`Update failed: ${r.error}`);
  }

  const count = (role: string) => users.filter((u) => u.role === role).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={formatIndianNumber(users.length)} />
        <StatCard label="Admins" value={formatIndianNumber(count("ADMIN"))} />
        <StatCard label="Dealers" value={formatIndianNumber(count("DEALER"))} />
        <StatCard label="Customers" value={formatIndianNumber(count("CUSTOMER"))} />
      </div>

      {message && <Notice kind="error">{message}</Notice>}

      <div className="admin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[hsl(var(--color-line))] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-base font-bold tracking-tight text-[hsl(var(--color-content))]">
              Accounts & access
            </h2>
            <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
              {formatIndianNumber(filtered.length)} of {formatIndianNumber(users.length)} accounts.
              Role changes take effect immediately.
            </p>
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <span className="sr-only">Search users</span>
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--color-content-faint))]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email or role…"
              className="admin-input pl-9"
            />
          </label>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <UserRound size={26} className="mx-auto text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-[hsl(var(--color-content))]">
              No users match “{query}”
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="admin-btn admin-btn-secondary mt-3 text-xs"
            >
              Clear search
            </button>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[820px] border-collapse text-left">
              <caption className="sr-only">User accounts and roles</caption>
              <thead>
                <tr className="border-b border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface-muted))]">
                  {["User", "Role", "Status", "Access"].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--color-content-muted))] first:pl-5 last:pr-5"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--color-line))]">
                {filtered.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-[hsl(var(--admin-surface-muted))]">
                    <td className="px-4 py-3 pl-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--admin-surface-muted))] text-xs font-bold text-[hsl(var(--color-content-muted))]">
                          {(u.firstName?.[0] ?? "") + (u.lastName?.[0] ?? "")}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[hsl(var(--color-content))]">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="max-w-[240px] truncate text-xs text-[hsl(var(--color-content-muted))]">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2">
                        <span className="sr-only">Role for {u.email}</span>
                        <select
                          value={u.role}
                          onChange={(e) => void changeRole(u, e.target.value)}
                          className="admin-input min-h-9 w-auto py-0 text-xs"
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role.replace(/_/g, " ").toLowerCase()}
                            </option>
                          ))}
                        </select>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.isActive ? "ACTIVE" : "INACTIVE"} />
                    </td>
                    <td className="px-4 py-3 pr-5">
                      <button
                        type="button"
                        onClick={() => void toggleActive(u)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] px-3 text-xs font-semibold text-[hsl(var(--color-content))] transition-colors hover:bg-[hsl(var(--admin-surface-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
                      >
                        <ShieldCheck size={13} aria-hidden="true" />
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>

            {/* Mobile: the four-column table does not fit a phone, so each
                account becomes a compact card with the same controls. */}
            <ul className="divide-y divide-[hsl(var(--color-line))] sm:hidden">
              {filtered.map((u) => (
                <li key={u.id} className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--admin-surface-muted))] text-xs font-bold text-[hsl(var(--color-content-muted))]">
                      {(u.firstName?.[0] ?? "") + (u.lastName?.[0] ?? "")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[hsl(var(--color-content))]">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="truncate text-xs text-[hsl(var(--color-content-muted))]">{u.email}</p>
                    </div>
                    <StatusBadge status={u.isActive ? "ACTIVE" : "INACTIVE"} />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">Role for {u.email}</span>
                      <select
                        value={u.role}
                        onChange={(e) => void changeRole(u, e.target.value)}
                        className="admin-input min-h-10 w-full py-0 text-xs"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role.replace(/_/g, " ").toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => void toggleActive(u)}
                      className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] px-3 text-xs font-semibold text-[hsl(var(--color-content))] transition-colors hover:bg-[hsl(var(--admin-surface-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
                    >
                      <ShieldCheck size={13} aria-hidden="true" />
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
