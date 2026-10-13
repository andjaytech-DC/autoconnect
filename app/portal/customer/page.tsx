import { redirect } from "next/navigation";
import { CalendarCheck, IndianRupee, MessageSquare, Car } from "lucide-react";
import { getSession } from "@/app/server/session";
import {
  loadCustomerPortalData,
  type CustomerPortalData,
} from "@/app/server/customer-portal";

export const dynamic = "force-dynamic";

export default async function CustomerPortalPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/portal/customer");
  // Role gate, matching the dealer/admin portals: this is the CUSTOMER surface.
  if (session.role !== "CUSTOMER" && session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  /*
   * Every count and every row on this page is scoped to the signed-in user —
   * `TestDrive` now carries `userId` and both resources are filtered by the
   * verified session id. A guest row (`userId IS NULL`) is owned by nobody.
   */
  let testDrives: CustomerPortalData["testDrives"] = [];
  let finance = 0;
  let leads: CustomerPortalData["leads"] = [];

  try {
    const data = await loadCustomerPortalData({
      id: session.id,
      email: session.email,
    });
    testDrives = data.testDrives;
    finance = data.financeApplicationCount;
    leads = data.leads;
  } catch {
    // Database unavailable — render the portal with empty data instead of a 500.
  }

  const stats = [
    { icon: CalendarCheck, label: "Test Drives", value: testDrives.length },
    { icon: IndianRupee, label: "Finance Applications", value: finance },
    { icon: MessageSquare, label: "Active Enquiries", value: leads.length },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#FFC700]">My Account</span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{session.name}</h1>
          <p className="mt-1 text-sm text-slate-400">Your enquiries, test drives and finance applications.</p>
        </div>
      </section>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-card p-6">
              <s.icon size={20} className="text-[#FFC700]" />
              <p className="mt-3 text-3xl font-extrabold text-content">{s.value}</p>
              <p className="text-sm text-content-muted">{s.label}</p>
            </div>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-content mb-4">My Test Drives</h2>
          {testDrives.length === 0 ? (
            <p className="text-sm text-content-muted">No test drives yet.</p>
          ) : (
            <div className="space-y-3">
              {testDrives.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-line bg-card p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-content text-sm">
                      {t.vehicle?.title ? t.vehicle.title : `Vehicle #${t.vehicleId}`}
                    </p>
                    <p className="text-xs text-content-muted">
                      {new Date(t.preferredDate).toLocaleDateString("en-IN")} · {t.preferredTime}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-content mb-4">My Enquiries</h2>
          {leads.length === 0 ? <p className="text-sm text-content-muted">No enquiries yet.</p> : (
            <div className="space-y-3">
              {leads.map((l: { id: number; vehicleId: number; status: string; message: string | null; createdAt: Date }) => (
                <div key={l.id} className="rounded-2xl border border-line bg-card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-content text-sm">{l.vehicleId ? `Vehicle #${l.vehicleId}` : "General"} <span className="ml-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-blue-50 text-blue-700">{l.status}</span></p>
                    <p className="text-xs text-content-muted">{l.message || "—"} · {new Date(l.createdAt).toLocaleDateString("en-IN")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
