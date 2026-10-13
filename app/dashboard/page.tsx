import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  CalendarCheck,
  Car,
  Heart,
  Receipt,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";
import { getSession } from "@/app/server/session";
import { getDb } from "@/app/server/db";
import { backendFetch, isBackendConfigured, BackendError } from "@/app/lib/backend";
import { getCarRef, inr } from "@/app/lib/account";
import { loadCarRefsServer } from "@/app/lib/account-server";

export const dynamic = "force-dynamic";

/** Shape shared by wishlist / booking / order rows from the API and the local store. */
interface UserRecord {
  id?: string | number;
  userId: string;
  carId: number;
  createdAt?: string;
  status?: string;
  date?: string;
  slot?: string;
  type?: string;
  amount?: number;
}

/** Descending `createdAt` sort that tolerates rows without a timestamp. */
function byNewest(a: UserRecord, b: UserRecord): number {
  return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
}

async function fetchWithBackendFallback<T>(
  path: string,
  token: string | undefined,
): Promise<T> {
  if (!isBackendConfigured()) return null as unknown as T;
  try {
    const data = await backendFetch<T>(path, { token });
    return data;
  } catch (e) {
    // Any backend error (401 Unauthorized, 500, or unreachable) falls back
    // to the local JSON store so the dashboard never crashes due to auth
    // mismatches or temporary backend downtime.
    if (e instanceof BackendError) return null as unknown as T;
    throw e;
  }
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard");

  const db = await getDb();

  const [wishlistRes, bookingsRes, ordersRes] = await Promise.all([
    fetchWithBackendFallback<{ success: boolean; data: UserRecord[] }>(
      "/wishlist",
      session.token,
    ),
    fetchWithBackendFallback<{ success: boolean; data: UserRecord[] }>(
      "/bookings",
      session.token,
    ),
    fetchWithBackendFallback<{ success: boolean; data: UserRecord[] }>(
      "/orders",
      session.token,
    ),
  ]);

  // Backend returns { success, data: [...] }; fall back to local JSON store.
  const savedWishlist: UserRecord[] =
    wishlistRes?.data ?? (db.wishlist as unknown as UserRecord[]);
  const backendBookings: UserRecord[] =
    bookingsRes?.data ?? (db.bookings as unknown as UserRecord[]);
  const backendOrders: UserRecord[] =
    ordersRes?.data ?? (db.orders as unknown as UserRecord[]);

  const saved = savedWishlist
    .filter((w) => w.userId === session.id)
    .sort(byNewest);
  const myBookings = backendBookings
    .filter((b) => b.userId === session.id)
    .sort(byNewest);
  const myOrders = backendOrders
    .filter((o) => o.userId === session.id)
    .sort(byNewest);

  // Resolve real vehicle names/prices for anything referenced below, instead of
  // labelling a user's records with a static car fixture.
  await loadCarRefsServer([
    ...saved.map((w) => w.carId),
    ...myBookings.map((b) => b.carId),
    ...myOrders.map((o) => o.carId),
  ]);

  const stats = [
    { label: "Saved cars", value: saved.length, icon: Heart, href: "/wishlist" },
    { label: "Test drives", value: myBookings.length, icon: CalendarCheck, href: "/bookings" },
    { label: "Orders", value: myOrders.length, icon: Receipt, href: "/orders" },
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--color-bg))] flex flex-col font-sans text-[hsl(var(--color-content))]">

      {/* Hero */}
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFC700] to-yellow-500 text-xl font-bold shadow-lg shadow-amber-500/25">
              {(session.name?.[0] ?? session.username[0] ?? "U").toUpperCase()}
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#FFC700]">
                {session.role}
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Welcome back, {session.name}
              </h1>
              <p className="mt-0.5 text-sm text-slate-400">{session.email}</p>
            </div>
          </div>
        </div>
      </section>
{/* Stats */}
      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-12" aria-label="Account summary">
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="group rounded-2xl border border-line bg-card p-6 transition-all hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-[#FFC700]">
                  <s.icon size={20} aria-hidden="true" />
                </span>
                <ArrowUpRight
                  size={18}
                  className="text-content-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-4 text-3xl font-extrabold text-content">{s.value}</p>
              <p className="text-sm text-content-muted">{s.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Bookings + Orders */}
      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-12 lg:grid-cols-2 lg:px-12">
        <div className="rounded-2xl border border-line bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-content">Upcoming test drives</h2>
            <Link href="/bookings" className="text-sm font-bold text-[#FFC700] hover:text-[#FFC700]">
              Manage
            </Link>
          </div>
          {myBookings.filter((b) => b.status === "CONFIRMED").length === 0 ? (
            <p className="text-sm text-content-muted">
              No upcoming test drives.{" "}
              <Link href="/cars" className="font-semibold text-[#FFC700]">
                Browse cars
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-3">
              {myBookings
                .filter((b) => b.status === "CONFIRMED")
                .slice(0, 3)
                .map((b) => {
                  const car = getCarRef(b.carId);
                  return (
                    <li
                      key={b.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-content">{car.name}</p>
                        <p className="text-xs text-content-muted">
                          {b.date} at {b.slot}
                        </p>
                      </div>
                      <CalendarCheck size={18} className="text-[#FFC700]" aria-hidden="true" />
                    </li>
                  );
                })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-content">Recent orders</h2>
            <Link href="/orders" className="text-sm font-bold text-[#FFC700] hover:text-[#FFC700]">
              View all
            </Link>
          </div>
          {myOrders.length === 0 ? (
            <p className="text-sm text-content-muted">
              No orders yet.{" "}
              <Link href="/finance" className="font-semibold text-[#FFC700]">
                Explore finance
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-3">
              {myOrders.slice(0, 3).map((o) => {
                const car = getCarRef(o.carId);
                return (
                  <li
                    key={o.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-content">
                        {car.name} <span className="text-xs text-content-muted">· {o.type}</span>
                      </p>
                      <p className="text-xs text-content-muted">{inr(o.amount ?? 0)}</p>
                    </div>
                    <span className="rounded-full bg-[#161b21] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-content-muted">
                      {o.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
{/* Role-aware portals + quick actions */}
      <section className="mx-auto max-w-7xl w-full px-6 pb-16 lg:px-12" aria-label="Quick actions">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/cars"
            className="group rounded-2xl border border-line bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <Car size={20} className="text-[#FFC700]" aria-hidden="true" />
            <p className="mt-3 font-bold text-content">Browse cars</p>
            <p className="text-xs text-content-muted">Certified inventory</p>
          </Link>
          <Link
            href="/loans"
            className="group rounded-2xl border border-line bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <Wallet size={20} className="text-[#FFC700]" aria-hidden="true" />
            <p className="mt-3 font-bold text-content">Apply for a loan</p>
            <p className="text-xs text-content-muted">EMI planner included</p>
          </Link>
          <Link
            href="/insurance"
            className="group rounded-2xl border border-line bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <ShieldCheck size={20} className="text-[#FFC700]" aria-hidden="true" />
            <p className="mt-3 font-bold text-content">Insurance quote</p>
            <p className="text-xs text-content-muted">Indicative premium</p>
          </Link>
          {(session.role === "DEALER" || session.role === "ADMIN") && (
            <Link
              href={session.role === "ADMIN" ? "/portal/admin" : "/portal/dealer"}
              className="group rounded-2xl border border-line bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <User size={20} className="text-[#FFC700]" aria-hidden="true" />
              <p className="mt-3 font-bold text-content">
                {session.role === "ADMIN" ? "Admin portal" : "Dealer portal"}
              </p>
              <p className="text-xs text-content-muted">Role-based workspace</p>
            </Link>
          )}
        </div>
      </section>

    </div>
  );
}
