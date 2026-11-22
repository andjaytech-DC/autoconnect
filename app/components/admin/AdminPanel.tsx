'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Car,
  ChevronLeft,
  ChevronRight,
  Fuel,
  Gauge,
  LayoutGrid,
  List,
  MapPin,
  Pencil,
  Search,
  SlidersHorizontal,
} from 'lucide-react';

import {
  bucketCounts,
  bucketLabel,
  inBucket,
  type VehicleBucketKey,
} from './adminNav';
import StatusBadge from './ui/StatusBadge';
import { formatINR, formatIndianNumber } from '@/app/lib/currency';

export interface AdminVehicle {
  id: number;
  title: string;
  year: number;
  price: number;
  mileage: number;
  fuel: string;
  transmission: string;
  color: string;
  images: string[];
  status: string;
  /** Canonical visibility flag — DRAFT | PUBLISHED. Drives the Draft/Published buckets. */
  listingStatus: string;
  city: string;
  state?: string;
  brandId: number;
  categoryId: number;
  dealerId: number;
  description?: string;
  isCertified?: boolean;
  /** Vehicle registration number. Required for the RTO/VAHAN history check. */
  registrationNumber?: string | null;
  createdAt?: string;
}

interface AdminPanelProps {
  initialVehicles: AdminVehicle[];
}

type SortKey = 'newest' | 'price-desc' | 'price-asc' | 'year-desc';
type LayoutMode = 'grid' | 'table';

const PAGE_SIZE = 12;
const FILTERS: VehicleBucketKey[] = ['all', 'published', 'draft', 'reserved', 'sold', 'archived'];

export default function AdminPanel({ initialVehicles }: AdminPanelProps) {
  const [query, setQuery] = useState('');
  const [bucket, setBucket] = useState<VehicleBucketKey>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [layout, setLayout] = useState<LayoutMode>('grid');
  const [page, setPage] = useState(1);

  const counts = useMemo(() => bucketCounts(initialVehicles), [initialVehicles]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = initialVehicles.filter((vehicle) => {
      if (!inBucket(bucket, vehicle)) return false;
      if (!needle) return true;
      return [
        vehicle.title,
        vehicle.city,
        vehicle.state,
        vehicle.fuel,
        vehicle.transmission,
        vehicle.status,
        vehicle.listingStatus,
        String(vehicle.year),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });

    return rows.sort((a, b) => {
      switch (sort) {
        case 'price-desc':
          return Number(b.price) - Number(a.price);
        case 'price-asc':
          return Number(a.price) - Number(b.price);
        case 'year-desc':
          return Number(b.year) - Number(a.year);
        default:
          return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
      }
    });
  }, [bucket, initialVehicles, query, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const changeFilter = (next: VehicleBucketKey) => {
    setBucket(next);
    setPage(1);
  };

  const clearFilters = () => {
    setQuery('');
    setBucket('all');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="admin-card p-3 sm:p-4">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex min-w-max gap-1.5" role="group" aria-label="Filter vehicles by status">
            {FILTERS.map((key) => {
              const active = bucket === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => changeFilter(key)}
                  aria-pressed={active}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] ${
                    active
                      ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]'
                      : 'border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] text-[hsl(var(--color-content-muted))] hover:border-[hsl(var(--color-line-hover))] hover:text-[hsl(var(--color-content))]'
                  }`}
                >
                  {key === 'all' ? 'All vehicles' : bucketLabel(key)}
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${active ? 'bg-black/10' : 'bg-[hsl(var(--admin-surface-muted))]'}`}>
                    {formatIndianNumber(counts[key] ?? 0)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">Search vehicles</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search by make, model, city, fuel or status…"
              className="admin-input pl-9"
            />
          </label>

          <div className="flex items-center gap-2">
            <label className="relative flex-1 sm:flex-none">
              <span className="sr-only">Sort vehicles</span>
              <SlidersHorizontal size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as SortKey);
                  setPage(1);
                }}
                className="admin-input min-w-0 pl-9 pr-8 sm:w-48"
              >
                <option value="newest">Newest first</option>
                <option value="price-desc">Price: high to low</option>
                <option value="price-asc">Price: low to high</option>
                <option value="year-desc">Year: newest</option>
              </select>
            </label>

            <div className="flex shrink-0 items-center rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] p-1" role="group" aria-label="Vehicle layout">
              <button
                type="button"
                onClick={() => setLayout('grid')}
                aria-pressed={layout === 'grid'}
                aria-label="Grid view"
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] ${layout === 'grid' ? 'bg-[hsl(var(--admin-surface-muted))] text-[hsl(var(--color-content))]' : 'text-[hsl(var(--color-content-faint))] hover:text-[hsl(var(--color-content))]'}`}
              >
                <LayoutGrid size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setLayout('table')}
                aria-pressed={layout === 'table'}
                aria-label="Table view"
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] ${layout === 'table' ? 'bg-[hsl(var(--admin-surface-muted))] text-[hsl(var(--color-content))]' : 'text-[hsl(var(--color-content-faint))] hover:text-[hsl(var(--color-content))]'}`}
              >
                <List size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Result meta */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-sm text-[hsl(var(--color-content-muted))]" aria-live="polite">
          {filtered.length === initialVehicles.length
            ? `${formatIndianNumber(filtered.length)} vehicle${filtered.length === 1 ? '' : 's'}`
            : `${formatIndianNumber(filtered.length)} of ${formatIndianNumber(initialVehicles.length)} vehicles`}
          {bucket !== 'all' && <span className="text-[hsl(var(--color-content-faint))]"> · {bucketLabel(bucket)}</span>}
        </p>
        {pageCount > 1 && (
          <p className="text-xs text-[hsl(var(--color-content-faint))]">
            Page {safePage} of {pageCount}
          </p>
        )}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState hasInventory={initialVehicles.length > 0} onClear={clearFilters} />
      ) : layout === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      ) : (
        <VehicleTable vehicles={visible} />
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <nav className="flex items-center justify-between gap-3 px-1 pt-1" aria-label="Vehicle pagination">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className="admin-btn admin-btn-secondary disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronLeft size={16} aria-hidden="true" /> Previous
          </button>
          <span className="text-xs font-medium text-[hsl(var(--color-content-muted))]">
            {safePage} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(pageCount, safePage + 1))}
            disabled={safePage === pageCount}
            className="admin-btn admin-btn-secondary disabled:cursor-not-allowed disabled:opacity-45"
          >
            Next <ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Vehicle card                                                       */
/* ------------------------------------------------------------------ */

function VehicleCard({ vehicle }: { vehicle: AdminVehicle }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] shadow-[var(--admin-shadow)] transition-shadow hover:shadow-[var(--admin-shadow-hover)]">
      <div className="relative aspect-[16/10] min-h-0 overflow-hidden bg-[hsl(var(--admin-surface-muted))]">
        <VehicleImage vehicle={vehicle} />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <StatusBadge status={vehicle.listingStatus} />
          {vehicle.status && vehicle.status !== 'AVAILABLE' && vehicle.status !== vehicle.listingStatus && (
            <StatusBadge status={vehicle.status} />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-sm font-bold leading-5 text-[hsl(var(--color-content))]">
            {vehicle.title || 'Untitled vehicle'}
          </h3>
          <p className="shrink-0 text-sm font-bold tabular-nums text-[hsl(var(--color-content))]">
            {vehicle.price != null ? formatINR(vehicle.price) : '—'}
          </p>
        </div>

        <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-[hsl(var(--color-content-muted))]">
          <div className="flex min-w-0 items-center gap-1.5">
            <Gauge size={13} className="shrink-0 text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
            <dt className="sr-only">Mileage</dt>
            <dd className="truncate">{vehicle.mileage ? `${formatIndianNumber(vehicle.mileage)} km` : '—'}</dd>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <Fuel size={13} className="shrink-0 text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
            <dt className="sr-only">Fuel</dt>
            <dd className="truncate">{vehicle.fuel || '—'} · {vehicle.transmission || '—'}</dd>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <Car size={13} className="shrink-0 text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
            <dt className="sr-only">Year</dt>
            <dd className="truncate">{vehicle.year || '—'}</dd>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <MapPin size={13} className="shrink-0 text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
            <dt className="sr-only">Location</dt>
            <dd className="truncate">{vehicle.city ? `${vehicle.city}${vehicle.state ? `, ${vehicle.state}` : ''}` : 'Location not set'}</dd>
          </div>
        </dl>

        <div className="mt-auto flex items-center gap-2 pt-4">
          <Link
            href={`/cars/${vehicle.id}`}
            className="admin-btn admin-btn-secondary flex-1 text-xs"
            aria-label={`View ${vehicle.title || 'vehicle'} on the storefront`}
          >
            View <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
          <Link
            href={`/admin/vehicles/${vehicle.id}/edit`}
            className="admin-btn admin-btn-primary flex-1 text-xs"
            aria-label={`Edit ${vehicle.title || 'vehicle'}`}
          >
            <Pencil size={14} aria-hidden="true" /> Edit
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Table                                                              */
/* ------------------------------------------------------------------ */

function VehicleTable({ vehicles }: { vehicles: AdminVehicle[] }) {
  return (
    <div className="admin-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <caption className="sr-only">Vehicle inventory</caption>
          <thead>
            <tr className="border-b border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface-muted))]">
              <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--color-content-muted))]">Vehicle</th>
              <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--color-content-muted))]">Status</th>
              <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--color-content-muted))]">Price</th>
              <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--color-content-muted))]">Specs</th>
              <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--color-content-muted))]">Location</th>
              <th scope="col" className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--color-content-muted))]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--color-line))]">
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="transition-colors hover:bg-[hsl(var(--admin-surface-muted))]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[hsl(var(--admin-surface-muted))]">
                      <VehicleImage vehicle={vehicle} compact />
                    </span>
                    <div className="min-w-0">
                      <p className="max-w-[240px] truncate text-sm font-semibold text-[hsl(var(--color-content))]">{vehicle.title || 'Untitled vehicle'}</p>
                      <p className="text-xs text-[hsl(var(--color-content-muted))]">{vehicle.year} · {vehicle.color || 'Colour not set'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge status={vehicle.listingStatus} />
                    {vehicle.status && vehicle.status !== 'AVAILABLE' && vehicle.status !== vehicle.listingStatus && (
                      <StatusBadge status={vehicle.status} />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-bold tabular-nums text-[hsl(var(--color-content))]">
                  {vehicle.price != null ? formatINR(vehicle.price) : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--color-content-muted))]">
                  <p>{vehicle.mileage ? `${formatIndianNumber(vehicle.mileage)} km` : 'Mileage not set'}</p>
                  <p>{vehicle.fuel || '—'} · {vehicle.transmission || '—'}</p>
                </td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--color-content-muted))]">
                  {vehicle.city ? `${vehicle.city}${vehicle.state ? `, ${vehicle.state}` : ''}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/cars/${vehicle.id}`} aria-label={`View ${vehicle.title || 'vehicle'}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-[hsl(var(--color-content-muted))] hover:bg-[hsl(var(--admin-surface-muted))] hover:text-[hsl(var(--color-content))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]">
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                    <Link href={`/admin/vehicles/${vehicle.id}/edit`} aria-label={`Edit ${vehicle.title || 'vehicle'}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-[hsl(var(--color-primary-strong))] hover:bg-[hsl(var(--color-primary)/0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]">
                      <Pencil size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared image + empty state                                         */
/* ------------------------------------------------------------------ */

function VehicleImage({ vehicle, compact = false }: { vehicle: AdminVehicle; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = vehicle.images?.[0];

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[hsl(var(--admin-surface-muted))] to-[hsl(var(--color-line))]" aria-hidden="true">
        <Car size={compact ? 18 : 30} className="text-[hsl(var(--color-content-faint))]" />
      </div>
    );
  }

  return (
    // Backend media may be local or remote; a plain img keeps both working.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={vehicle.title ? `${vehicle.title} photo` : 'Vehicle photo'}
      loading="lazy"
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      onError={() => setFailed(true)}
    />
  );
}

function EmptyState({ hasInventory, onClear }: { hasInventory: boolean; onClear: () => void }) {
  return (
    <div className="admin-card px-5 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--admin-surface-muted))] text-[hsl(var(--color-content-faint))]">
        <Car size={24} aria-hidden="true" />
      </span>
      <h2 className="mt-3 text-base font-bold text-[hsl(var(--color-content))]">
        {hasInventory ? 'No vehicles match these filters' : 'No vehicles have been added yet'}
      </h2>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[hsl(var(--color-content-muted))]">
        {hasInventory
          ? 'Try a different search term or clear the status filter.'
          : 'Add your first vehicle to begin managing inventory.'}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {hasInventory && (
          <button type="button" onClick={onClear} className="admin-btn admin-btn-secondary">
            Clear filters
          </button>
        )}
        <Link href="/admin/vehicles/new" className="admin-btn admin-btn-primary">
          Add vehicle
        </Link>
      </div>
    </div>
  );
}
