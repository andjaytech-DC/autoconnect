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
import { backendFetch, BackendError } from "@/app/lib/backend";
import {
  mapBooking,
  mapFinance,
  mapOrder,
  type BackendBooking,
  type BackendFinanceApplication,
  type BackendOrder,
  type BackendWishlistRow,
} from "@/app/lib/account-mappers";
import { getCarRef, inr } from "@/app/lib/account";
import { loadCarRefsServer } from "@/app/lib/account-server";

export const dynamic = "force-dynamic";

/** What the dashboard lists: the UI shape of a wishlist, booking or order row. */
interface UserRecord {
  id?: string | number;
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

/**
 * Read one of the caller's own collections from NestJS.
 *
 * NestJS already scopes every one of these endpoints to the bearer token, so
 * the rows are the caller's by construction. A failure is reported to the page
 * (`ok: false`) so it can say so, instead of quietly showing an empty account.
 */
async function loadOwn<T>(
  path: string,
  token: string | undefined,
): Promise<{ ok: true; rows: T[] } | { ok: false }> {
  if (!token) return { ok: false };
  try {
    return { ok: true, rows: (await backendFetch<T[]>(path, { token })) ?? [] };
  } catch (e) {
    if (e instanceof BackendError) return { ok: false };
    throw e;
  }
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard");

  const [wishlistRes, bookingsRes, ordersRes, financeRes] = await Promise.all([
    loadOwn<BackendWishlistRow>("/wishlist", session.token),
    loadOwn<BackendBooking>("/bookings", session.token),
    loadOwn<BackendOrder>("/orders", session.token),
    loadOwn<BackendFinanceApplication>("/finance/applications", session.token),
  ]);
  const unavailable = [wishlistRes, bookingsRes, ordersRes, financeRes].some((r) => !r.ok);

  const saved: UserRecord[] = (wishlistRes.ok ? wishlistRes.rows : [])
    .map((w) => ({ id: w.id, carId: w.vehicleId, createdAt: w.createdAt }))
    .sort(byNewest);
  const myBookings: UserRecord[] = (bookingsRes.ok ? bookingsRes.rows : [])
    .map(mapBooking)
    .sort(byNewest);
  const myOrders: UserRecord[] = [
    ...(ordersRes.ok ? ordersRes.rows.map(mapOrder) : []),
    ...(financeRes.ok ? financeRes.rows.map(mapFinance) : []),
  ].sort(byNewest);

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
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-yellow-500 text-xl font-bold shadow-lg shadow-amber-500/25">
              {(session.name?.[0] ?? session.username[0] ?? "U").toUpperCase()}
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
                {session.role}
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Welcome back, {session.name}
              </h1>
              <p className="mt-0.5 text-sm text-slate-300">{session.email}</p>
            </div>
          </div>
        </div>
      </section>

      {unavailable && (
        <div role="status" className="mx-auto mt-6 w-full max-w-7xl px-6 lg:px-12">
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Some of your account details could not be loaded right now. What you see below may be incomplete — please refresh in a moment.
          </p>
        </div>
      )}
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
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-[hsl(var(--color-primary-strong))]">
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
            <Link href="/bookings" className="inline-flex min-h-8 items-center text-sm font-bold text-[hsl(var(--color-primary-strong))] hover:text-[hsl(var(--color-primary-strong))]">
              Manage
            </Link>
          </div>
          {myBookings.filter((b) => b.status === "CONFIRMED").length === 0 ? (
            <p className="text-sm text-content-muted">
              No upcoming test drives.{" "}
              <Link href="/cars" className="font-semibold text-[hsl(var(--color-primary-strong))]">
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
                      <CalendarCheck size={18} className="text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
                    </li>
                  );
                })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-content">Recent orders</h2>
            <Link href="/orders" className="inline-flex min-h-8 items-center text-sm font-bold text-[hsl(var(--color-primary-strong))] hover:text-[hsl(var(--color-primary-strong))]">
              View all
            </Link>
          </div>
          {myOrders.length === 0 ? (
            <p className="text-sm text-content-muted">
              No orders yet.{" "}
              <Link href="/finance" className="font-semibold text-[hsl(var(--color-primary-strong))]">
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
                    <span className="rounded-full bg-[hsl(var(--color-surface-strong))] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-content">
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
            <Car size={20} className="text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
            <p className="mt-3 font-bold text-content">Browse cars</p>
            <p className="text-xs text-content-muted">Certified inventory</p>
          </Link>
          <Link
            href="/loans"
            className="group rounded-2xl border border-line bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <Wallet size={20} className="text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
            <p className="mt-3 font-bold text-content">Apply for a loan</p>
            <p className="text-xs text-content-muted">EMI planner included</p>
          </Link>
          <Link
            href="/insurance"
            className="group rounded-2xl border border-line bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <ShieldCheck size={20} className="text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
            <p className="mt-3 font-bold text-content">Insurance quote</p>
            <p className="text-xs text-content-muted">Indicative premium</p>
          </Link>
          {(session.role === "DEALER" || session.role === "ADMIN") && (
            <Link
              href={session.role === "ADMIN" ? "/portal/admin" : "/portal/dealer"}
              className="group rounded-2xl border border-line bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <User size={20} className="text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
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
