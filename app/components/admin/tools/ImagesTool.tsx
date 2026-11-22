"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

import { Notice } from "./AdminToolShell";
import { useAdminData } from "./useAdminData";

interface Img {
  id: string;
  url: string;
  vehicleId?: number;
  createdAt: string;
}

const PAGE_SIZE = 12;

export default function ImagesTool() {
  const { data, loading, error } = useAdminData<{ images: Img[] }>("/api/admin/images");
  const [limit, setLimit] = useState(PAGE_SIZE);

  if (loading) return <Notice kind="loading">Loading images…</Notice>;
  if (error || !data) return <Notice kind="error">{error ?? "Could not load images"}</Notice>;
  if (data.images.length === 0) return <Notice kind="empty">No images uploaded yet</Notice>;

  const total = data.images.length;
  const shown = data.images.slice(0, limit);
  const remaining = total - shown.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[hsl(var(--color-content-muted))]">
          <span className="font-semibold text-[hsl(var(--color-content))]">{shown.length}</span> of{" "}
          {total} images
        </p>
        <p className="text-xs text-[hsl(var(--color-content-faint))]">Vehicle media library</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {shown.map((img) => (
          <figure key={img.id} className="admin-card overflow-hidden">
            <div className="relative aspect-[4/3] bg-[hsl(var(--admin-surface-muted))]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.vehicleId ? `Vehicle ${img.vehicleId} image` : "Vehicle image"}
                loading="lazy"
                className="h-full w-full object-cover"
                onError={(e) => {
                  const imgEl = e.currentTarget;
                  imgEl.style.display = 'none';
                  const fallback = imgEl.parentElement?.querySelector('.img-fallback');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[hsl(var(--admin-surface-muted))] to-[hsl(var(--color-line))] img-fallback hidden">
                <ImageIcon size={34} className="text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
              </div>
            </div>
            <figcaption className="flex flex-col items-start gap-1 p-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:p-4">
              <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-[hsl(var(--color-content-muted))] sm:gap-2 sm:text-xs">
                <ImageIcon size={13} className="shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {img.vehicleId ? `Vehicle #${img.vehicleId}` : "Unassigned"}
                </span>
              </div>
              <span className="text-[11px] text-[hsl(var(--color-content-faint))] sm:text-xs">
                {formatDate(img.createdAt)}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      {remaining > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setLimit((current) => current + PAGE_SIZE)}
            className="admin-btn admin-btn-secondary"
          >
            Load {Math.min(PAGE_SIZE, remaining)} more
          </button>
        </div>
      )}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
