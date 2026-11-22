"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Loader2, Trash2 } from "lucide-react";
import { getCarRef, loadCarRefs } from "@/app/lib/account";
import { cn } from "@/app/lib/utils";
import EmptyState from "@/app/components/ui/EmptyState";

interface WishlistItem {
  id: string;
  carId: number;
  addedAt: string;
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  // Real listed vehicles offered as suggestions, not a static fixture.
  const [suggestions, setSuggestions] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/wishlist", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { items: WishlistItem[] };
        setItems(data.items);
        // Resolve real vehicle details; unknown ids render as a neutral label.
        await loadCarRefs(data.items.map((w) => w.carId));
        setItems((cur) => [...cur]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/vehicles?limit=8", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          vehicles?: { id: number; name: string }[];
        };
        if (!alive) return;
        setSuggestions((data.vehicles ?? []).slice(0, 6));
      } catch {
        // Leave the suggestion list empty rather than inventing cars.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function removeCar(carId: number) {
    setToggling(carId);
    try {
      const res = await fetch(`/api/wishlist?carId=${carId}`, { method: "DELETE" });
      if (res.ok) {
        setItems((cur) => cur.filter((w) => w.carId !== carId));
      }
    } finally {
      setToggling(null);
    }
  }

  async function addCar(carId: number) {
    setToggling(carId);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { item?: WishlistItem };
        if (data.item) setItems((cur) => [data.item!, ...cur]);
      }
    } finally {
      setToggling(null);
    }
  }

  const savedCarIds = new Set(items.map((w) => w.carId));

  return (
    <div className="min-h-screen bg-[hsl(var(--color-bg))] flex flex-col font-sans text-[hsl(var(--color-content))]">
      <div className="flex-1">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-yellow-500 text-primary-foreground">
          <Heart size={20} aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-content">Saved Cars</h1>
          <p className="text-sm text-content-muted">Your wishlist of vehicles you&apos;re watching.</p>
        </div>
      </div>
{loading ? (
        <div className="flex items-center justify-center py-24 text-content-muted">
          <Loader2 size={22} className="animate-spin" aria-hidden="true" />
          <span className="ml-2">Loading your saved cars…</span>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No saved cars yet"
          description="Tap the heart on any car to save it here for later."
          action={
            <Link href="/cars" className="btn btn-primary">
              Browse cars
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((w) => {
            const car = getCarRef(w.carId);
            return (
              <div
                key={w.id}
                className="rounded-2xl border border-line bg-card p-5 transition-all hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-primary-strong">
                      {[car.brand, car.type].filter(Boolean).join(" · ")}
                    </p>
                    <h3 className="mt-1 font-bold text-content">{car.name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCar(car.id)}
                    disabled={toggling === car.id}
                    aria-label={`Remove ${car.name} from saved cars`}
                    className="rounded-lg p-2 text-content-muted hover:bg-error/10 hover:text-error transition-colors"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-2 text-sm font-bold text-content">{car.price}</p>
                {car.year > 0 && <p className="mt-0.5 text-xs text-content-muted">{car.year}</p>}
              </div>
            );
          })}

          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm font-bold text-content">Add more cars</p>
            {suggestions.length === 0 ? (
              <p className="mt-3 text-sm text-content-muted">
                No other cars are listed right now.
              </p>
            ) : (
              <ul className="mt-3 space-y-1">
                {suggestions.map((c) => {
                  const saved = savedCarIds.has(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => (saved ? removeCar(c.id) : addCar(c.id))}
                        disabled={toggling === c.id}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                          saved
                            ? "bg-success/10 text-success"
                            : "text-content-muted hover:bg-surface hover:text-content",
                        )}
                      >
                        <span>{c.name}</span>
                        <Heart
                          size={14}
                          aria-hidden="true"
                          className={cn(saved && "fill-primary text-primary-strong")}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
