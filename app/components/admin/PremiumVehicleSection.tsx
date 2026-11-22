'use client';

import { Crown } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Admin "Premium / Special Vehicle" panel inside the vehicle edit form.
 *
 * Presentational: VehicleForm owns the state and sends it with the normal save
 * (PATCH /api/vehicles/[id]), which forwards it to the NestJS admin API.
 * Tag options come from the database, so adding a tag needs no code change.
 */

export interface PremiumTagOption {
  id: number;
  name: string;
  slug: string;
  isActive?: boolean;
}

export interface PremiumFormValue {
  isPremium: boolean;
  tagIds: number[];
  premiumBadge: string;
  premiumPriority: string;
  showOnHomepagePremium: boolean;
  showOnPremiumPage: boolean;
  /** YYYY-MM-DD in the admin's local time, or ''. */
  featuredUntil: string;
}

interface StoredPremium {
  isPremium?: boolean;
  tagIds?: number[];
  premiumBadge?: string | null;
  premiumPriority?: number;
  showOnHomepagePremium?: boolean;
  showOnPremiumPage?: boolean;
  featuredUntil?: string | null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO instant → local YYYY-MM-DD for <input type="date">. */
export function isoToLocalDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function premiumFromStored(p?: StoredPremium | null): PremiumFormValue {
  return {
    isPremium: Boolean(p?.isPremium),
    tagIds: p?.tagIds ?? [],
    premiumBadge: p?.premiumBadge ?? '',
    premiumPriority: String(p?.premiumPriority ?? 0),
    showOnHomepagePremium: Boolean(p?.showOnHomepagePremium),
    showOnPremiumPage: p?.showOnPremiumPage ?? true,
    featuredUntil: isoToLocalDate(p?.featuredUntil),
  };
}

/**
 * Body for the backend. `featuredUntil` is only sent when the admin changed it:
 * the API rejects past dates, and re-sending an already-expired value would
 * block every unrelated save of that vehicle.
 */
export function premiumToPayload(value: PremiumFormValue, initial: PremiumFormValue) {
  const priority = Math.min(10000, Math.max(0, Math.floor(Number(value.premiumPriority) || 0)));
  const payload: Record<string, unknown> = {
    isPremium: value.isPremium,
    tagIds: value.tagIds,
    premiumBadge: value.premiumBadge.trim() ? value.premiumBadge.trim() : null,
    premiumPriority: priority,
    showOnHomepagePremium: value.showOnHomepagePremium,
    showOnPremiumPage: value.showOnPremiumPage,
  };
  if (value.featuredUntil !== initial.featuredUntil) {
    payload.featuredUntil = value.featuredUntil
      ? new Date(`${value.featuredUntil}T23:59:59`).toISOString()
      : null;
  }
  return payload;
}

const GENERIC_BADGES = ['PREMIUM', 'EXCLUSIVE', 'RARE', 'LIMITED EDITION'];
const inputCls = 'admin-input';
const labelCls = 'admin-label';

function Check({
  id,
  label,
  checked,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[hsl(var(--color-primary))]"
      />
      <span>
        <span className="text-sm font-medium text-content">{label}</span>
        {hint && <span className="block text-xs text-content-muted">{hint}</span>}
      </span>
    </label>
  );
}

export default function PremiumVehicleSection({
  value,
  onChange,
  tags,
  storedFeaturedUntil,
}: {
  value: PremiumFormValue;
  onChange: (next: PremiumFormValue) => void;
  tags: PremiumTagOption[];
  /** Original ISO value, used to flag an expired date. */
  storedFeaturedUntil?: string | null;
}) {
  const set = <K extends keyof PremiumFormValue>(k: K, v: PremiumFormValue[K]) =>
    onChange({ ...value, [k]: v });

  const toggleTag = (id: number) =>
    set('tagIds', value.tagIds.includes(id) ? value.tagIds.filter((t) => t !== id) : [...value.tagIds, id]);

  const selectedNames = tags.filter((t) => value.tagIds.includes(t.id)).map((t) => t.name.toUpperCase());
  const badgeOptions = Array.from(new Set([...selectedNames, ...GENERIC_BADGES]));
  // Keep a previously saved custom badge selectable.
  if (value.premiumBadge && !badgeOptions.includes(value.premiumBadge)) badgeOptions.unshift(value.premiumBadge);

  // Read the clock in an effect, not during render, so the component stays
  // pure (and hydration-safe).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setNow(Date.now());
    });
    return () => {
      active = false;
    };
  }, []);

  const expired =
    now !== null &&
    !!storedFeaturedUntil &&
    value.featuredUntil === isoToLocalDate(storedFeaturedUntil) &&
    new Date(storedFeaturedUntil).getTime() < now;

  return (
    <section
      aria-labelledby="premium-section-title"
      className="admin-card overflow-hidden border-amber-300/70"
    >
      <div className="flex items-start gap-3 border-b border-amber-200/80 bg-amber-50/60 px-4 py-4 sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
          <Crown size={17} aria-hidden="true" />
        </span>
        <div>
          <h2
            id="premium-section-title"
            className="text-base font-bold tracking-tight text-[hsl(var(--color-content))]"
          >
            Premium / special vehicle
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
            Admin-only. Decides whether this vehicle appears in the Exclusive Collection — independent of its brand or price.
          </p>
        </div>
      </div>
      <div className="p-4 sm:p-5">

      <Check
        id="pv-is-premium"
        label="Show in Premium Collection"
        checked={value.isPremium}
        onChange={(v) => set('isPremium', v)}
      />

      <fieldset className="mt-5" disabled={!value.isPremium}>
        <legend className={labelCls}>Premium Categories</legend>
        {tags.length === 0 ? (
          <p className="text-xs text-content-muted">No categories exist yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
            {tags.map((t) => (
              <Check
                key={t.id}
                id={`pv-tag-${t.id}`}
                label={t.isActive === false ? `${t.name} (hidden)` : t.name}
                checked={value.tagIds.includes(t.id)}
                onChange={() => toggleTag(t.id)}
              />
            ))}
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="pv-badge" className={labelCls}>Premium Badge</label>
            <select id="pv-badge" value={value.premiumBadge} onChange={(e) => set('premiumBadge', e.target.value)} className={inputCls}>
              <option value="">Automatic (first category)</option>
              {badgeOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pv-priority" className={labelCls}>Display Priority</label>
            <input
              id="pv-priority"
              type="number"
              min={0}
              max={10000}
              step={1}
              value={value.premiumPriority}
              onChange={(e) => set('premiumPriority', e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-content-muted">Higher number shows first.</p>
          </div>
          <div>
            <label htmlFor="pv-until" className={labelCls}>Featured Until (optional)</label>
            <input
              id="pv-until"
              type="date"
              value={value.featuredUntil}
              onChange={(e) => set('featuredUntil', e.target.value)}
              className={inputCls}
            />
            <p className={'mt-1 text-xs ' + (expired ? 'text-red-700' : 'text-[hsl(var(--color-content-muted))]')}>
              {expired ? 'This date has passed — the vehicle is hidden from the collection. Clear or change it.' : 'Leave empty to keep it listed indefinitely.'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Check
            id="pv-homepage"
            label="Homepage"
            hint="Show in the Exclusive Collection on the homepage"
            checked={value.showOnHomepagePremium}
            onChange={(v) => set('showOnHomepagePremium', v)}
          />
          <Check
            id="pv-page"
            label="Premium Page"
            hint="Show on the Premium Cars page"
            checked={value.showOnPremiumPage}
            onChange={(v) => set('showOnPremiumPage', v)}
          />
        </div>
      </fieldset>
      </div>
    </section>
  );
}
