"use client";

import { MapPin } from "lucide-react";

import { Notice } from "./AdminToolShell";
import { useAdminData } from "./useAdminData";
import StatusBadge from "../ui/StatusBadge";
import { formatIndianNumber } from "@/app/lib/currency";

interface Location {
  id: number;
  name: string;
  city: string;
  state: string;
  pincode: string;
  active: boolean;
}

export default function LocationsTool() {
  const { data, loading, error } = useAdminData<{ locations: Location[] }>("/api/admin/locations");

  if (loading) return <Notice kind="loading">Loading locations…</Notice>;
  if (error || !data) return <Notice kind="error">{error ?? "Could not load locations"}</Notice>;

  const locations = data.locations;
  const active = locations.filter((location) => location.active).length;

  if (locations.length === 0) {
    return <Notice kind="empty">No locations configured yet</Notice>;
  }

  return (
    <div className="space-y-4">
      <div className="admin-card flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div>
          <h2 className="text-base font-bold tracking-tight text-[hsl(var(--color-content))]">
            Marketplace locations
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
            Cities and service locations available across the storefront.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-emerald-800">
            {formatIndianNumber(active)} active
          </span>
          <span className="rounded-full border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface-muted))] px-2.5 py-1 text-xs font-semibold tabular-nums text-[hsl(var(--color-content-muted))]">
            {formatIndianNumber(locations.length)} total
          </span>
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {locations.map((location) => (
          <li key={location.id} className="admin-card admin-card-hover flex items-start justify-between gap-3 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--admin-surface-muted))] text-[hsl(var(--color-primary-strong))]">
                <MapPin size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[hsl(var(--color-content))]">
                  {location.name}
                </p>
                <p className="mt-0.5 text-xs text-[hsl(var(--color-content-muted))]">
                  {[location.city, location.state].filter(Boolean).join(", ")}
                </p>
                {location.pincode && (
                  <p className="text-xs text-[hsl(var(--color-content-faint))]">{location.pincode}</p>
                )}
              </div>
            </div>
            <StatusBadge status={location.active ? "ACTIVE" : "INACTIVE"} />
          </li>
        ))}
      </ul>
    </div>
  );
}
