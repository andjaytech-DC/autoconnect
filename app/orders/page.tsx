"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Receipt } from "lucide-react";
import { getCarRef, inr, loadCarRefs } from "@/app/lib/account";
import { cn } from "@/app/lib/utils";

interface Order {
  id: string;
  carId: number;
  type: "PURCHASE" | "FINANCE" | "INSURANCE";
  amount: number;
  status: "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
}

const statusStyle: Record<Order["status"], string> = {
  PENDING: "bg-amber-500/15 text-amber-400",
  APPROVED: "bg-emerald-500/15 text-emerald-400",
  COMPLETED: "bg-blue-500/15 text-blue-400",
  CANCELLED: "bg-red-500/15 text-red-400",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/orders", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Not authenticated");
        const data = (await res.json()) as { orders: Order[] };
        setOrders(data.orders);
        // Resolve real vehicle details rather than a static car fixture.
        await loadCarRefs(data.orders.map((o) => o.carId));
        setOrders((cur) => [...cur]);
      })
      .catch(() => setError("Could not load orders."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">
      <main className="flex-1">
    <div className="mx-auto max-w-5xl px-6 py-12 lg:px-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFC700] to-yellow-500 text-[#15130a]">
          <Receipt size={20} aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-content">Orders</h1>
          <p className="text-sm text-content-muted">Finance, insurance and purchase activity.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-content-muted">
          <Loader2 size={22} className="animate-spin" aria-hidden="true" />
          <span className="ml-2">Loading orders…</span>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-300">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card py-20 text-center">
          <Receipt size={40} className="mx-auto text-content-faint" aria-hidden="true" />
          <p className="mt-4 font-semibold text-content">No orders yet</p>
          <p className="mt-1 text-sm text-content-muted">
            Your finance, insurance and purchase orders will appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const car = getCarRef(o.carId);
            return (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-card p-5"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-content">{car.name}</span>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-content-muted">
                      {o.type}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-content-muted">
                    Order {o.id} · {new Date(o.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-extrabold text-content">{inr(o.amount)}</span>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusStyle[o.status])}>
                    {o.status}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-8 text-xs text-content-muted">
        Looking for something else?{" "}
        <Link href="/dashboard" className="font-semibold text-[#FFC700]">
          Go to your dashboard
        </Link>{" "}
        or{" "}
        <Link href="/finance" className="font-semibold text-[#FFC700]">
          explore finance
        </Link>
        .
      </p>
      </div>
      </main>
    </div>
  );
}
