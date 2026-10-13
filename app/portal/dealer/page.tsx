import { redirect } from "next/navigation";
import { Car, Users, CalendarCheck, IndianRupee, TrendingUp, Package } from "lucide-react";
import DealerDashboardClient from "@/app/components/dealer/DealerDashboardClient";
import { getSession } from "@/app/server/session";

export const dynamic = "force-dynamic";

export default async function DealerPortalPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/portal/dealer");
  if (session.role !== "DEALER" && session.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#FFC700]">Dealer Portal</span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{session.name}</h1>
          <p className="mt-1 text-sm text-slate-400">Your inventory, leads and test drives — data is scoped to your dealership only.</p>
        </div>
      </section>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-12">
        <DealerDashboardClient role={session.role} />
      </main>
    </div>
  );
}
