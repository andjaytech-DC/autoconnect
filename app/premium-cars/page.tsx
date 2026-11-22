"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Loader2, SearchX } from "lucide-react";

import PremiumVehicleCard from "@/app/components/vehicle/PremiumVehicleCard";
import { getPremiumTags, getPremiumVehicles, type PremiumVehicleQuery } from "@/app/lib/nest-catalog";
import { mapVehicle } from "@/app/lib/nest-mappers";
import { errorMessage } from "@/app/lib/nest";
import type { PremiumTag, UiVehicle } from "@/app/lib/nest-types";

const PAGE_SIZE = 12;

const SORTS: { value: NonNullable<PremiumVehicleQuery["sort"]>; label: string }[] = [
  { value: "priority", label: "Featured first" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export default function PremiumCarsPage() {
  return (
    <Suspense fallback={<PageShell><Spinner /></PageShell>}>
      <PremiumCarsInner />
    </Suspense>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="premium-scope min-h-screen font-sans">{children}</div>;
}

function Spinner() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center py-16" role="status">
      <Loader2 size={34} className="mb-4 animate-spin text-[var(--pc-gold)]" aria-hidden="true" />
      <p className="text-sm text-[var(--pc-text-2)]">Loading the collection…</p>
    </div>
  );
}

function PremiumCarsInner() {
  // Router state, not window.location: server and client render the same
  // params, so there is no hydration mismatch.
  const searchParams = useSearchParams();
  const router = useRouter();

  const tag = searchParams.get("tag") || "";
  const sortParam = searchParams.get("sort") || "priority";
  const sort = SORTS.some((s) => s.value === sortParam)
    ? (sortParam as NonNullable<PremiumVehicleQuery["sort"]>)
    : "priority";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const [tags, setTags] = useState<PremiumTag[]>([]);
  const [vehicles, setVehicles] = useState<UiVehicle[]>([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Tags drive the filter chips; they come from the admin, never from code.
  useEffect(() => {
    let cancelled = false;
    getPremiumTags()
      .then((t) => !cancelled && setTags(t))
      .catch(() => !cancelled && setTags([]));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Yield once so the effect body does not set state synchronously.
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getPremiumVehicles({ tag: tag || undefined, sort, page, limit: PAGE_SIZE });
        if (cancelled) return;
        setVehicles((res.items ?? []).map(mapVehicle));
        setMeta({ total: res.meta?.total ?? 0, totalPages: res.meta?.totalPages ?? 1 });
      } catch (err: unknown) {
        if (cancelled) return;
        setVehicles([]);
        setError(errorMessage(err, "Unable to load the collection. Please retry."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tag, sort, page, attempt]);

  const href = useCallback(
    (next: { tag?: string; sort?: string; page?: number }) => {
      const q = new URLSearchParams();
      const t = next.tag ?? tag;
      const s = next.sort ?? sort;
      if (t) q.set("tag", t);
      if (s && s !== "priority") q.set("sort", s);
      if (next.page && next.page > 1) q.set("page", String(next.page));
      const qs = q.toString();
      return `/premium-cars${qs ? `?${qs}` : ""}`;
    },
    [tag, sort],
  );

  const activeTag = tags.find((t) => t.slug === tag);

  return (
    <PageShell>
      <header className="relative isolate overflow-hidden border-b border-[var(--pc-line)] pb-10 pt-14 sm:pt-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/3 -z-10 h-[380px] w-[760px] rounded-full bg-[radial-gradient(closest-side,rgb(212_175_55/0.13),transparent)]"
        />
        <div className="container">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[var(--pc-gold)]">
            Progressive AutoHub
          </p>
          <h1 className="pc-gold-text mt-3 text-4xl font-black uppercase leading-[1.02] tracking-tight sm:text-6xl">
            {activeTag ? activeTag.name : "The Exclusive Collection"}
          </h1>
          <div className="pc-gold-rule mt-6 w-40" />
          <p className="mt-5 max-w-xl text-lg text-[var(--pc-text-2)]">
            Discover rare, powerful and exceptional vehicles.
          </p>

          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <nav aria-label="Collection categories" className="flex flex-wrap gap-2">
              <FilterChip href={href({ tag: "", page: 1 })} active={!tag} label="All" />
              {tags.map((t) => (
                <FilterChip
                  key={t.id}
                  href={href({ tag: t.slug, page: 1 })}
                  active={tag === t.slug}
                  label={t.name}
                  count={t.vehicleCount}
                />
              ))}
            </nav>

            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--pc-text-2)]">
              Sort
              <select
                value={sort}
                onChange={(e) => router.push(href({ sort: e.target.value, page: 1 }))}
                className="rounded-lg border border-[var(--pc-line)] bg-[var(--pc-card)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--pc-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pc-gold-hi)]"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>

      <div className="container py-10">
        {loading ? (
          <Spinner />
        ) : error ? (
          <StatusBox title="We couldn't load the collection" body={error}>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="rounded-full border border-[var(--pc-line-strong)] px-5 py-2 text-sm font-bold uppercase tracking-wider text-[var(--pc-gold-hi)] hover:bg-[var(--pc-gold)] hover:text-[#1a1405]"
            >
              Try again
            </button>
          </StatusBox>
        ) : vehicles.length === 0 ? (
          <StatusBox
            title={tag ? "Nothing in this category right now" : "The collection is being curated"}
            body={
              tag
                ? "No vehicles currently match this category. Explore the full collection instead."
                : "New exceptional vehicles are added regularly. Please check back soon."
            }
          >
            {tag && (
              <Link
                href={href({ tag: "", page: 1 })}
                className="rounded-full bg-[var(--pc-gold)] px-5 py-2 text-sm font-bold uppercase tracking-wider text-[#080D26]"
              >
                View all
              </Link>
            )}
          </StatusBox>
        ) : (
          <>
            <p className="mb-6 text-sm text-[var(--pc-text-2)]" aria-live="polite">
              {meta.total} vehicle{meta.total === 1 ? "" : "s"}
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
              {vehicles.map((v, i) => (
                <PremiumVehicleCard key={v.id} vehicle={v} priority={i < 4} />
              ))}
            </div>

            {meta.totalPages > 1 && (
              <nav
                className="mt-12 flex flex-wrap items-center justify-center gap-3 border-t border-[var(--pc-line)] pt-8"
                aria-label="Pagination"
              >
                <PagerLink href={href({ page: page - 1 })} disabled={page <= 1} label="Previous" />
                <span className="text-sm text-[var(--pc-text-2)]">
                  Page {page} of {meta.totalPages}
                </span>
                <PagerLink href={href({ page: page + 1 })} disabled={page >= meta.totalPages} label="Next" primary />
              </nav>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}

function FilterChip({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pc-gold-hi)] " +
        (active
          ? "border-[var(--pc-gold)] bg-[var(--pc-gold)] text-[#1a1405]"
          : "border-[var(--pc-line)] text-[var(--pc-text-2)] hover:border-[var(--pc-line-strong)] hover:text-[var(--pc-gold-hi)]")
      }
    >
      {label}
      {typeof count === "number" && count > 0 && (
        <span className={active ? "ml-1.5 opacity-70" : "ml-1.5 text-[var(--pc-muted)]"}>{count}</span>
      )}
    </Link>
  );
}

function PagerLink({
  href,
  disabled,
  label,
  primary,
}: {
  href: string;
  disabled: boolean;
  label: string;
  primary?: boolean;
}) {
  const base = "rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wider ";
  if (disabled) {
    return (
      <span aria-disabled="true" className={base + "border border-[var(--pc-line)] text-[var(--pc-muted)]"}>
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={
        base +
        (primary
          ? "bg-[var(--pc-gold)] text-[#080D26]"
          : "border border-[var(--pc-line-strong)] text-[var(--pc-gold-hi)] hover:bg-[var(--pc-gold)] hover:text-[#1a1405]")
      }
    >
      {label}
    </Link>
  );
}

function StatusBox({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-[var(--pc-line)] bg-[var(--pc-card)] px-6 py-14 text-center">
      <SearchX size={38} className="mx-auto mb-4 text-[var(--pc-muted)]" aria-hidden="true" />
      <h2 className="text-xl font-bold text-[var(--pc-text)]">{title}</h2>
      <p className="mt-2 text-sm text-[var(--pc-text-2)]">{body}</p>
      {children && <div className="mt-6 flex justify-center">{children}</div>}
    </div>
  );
}
