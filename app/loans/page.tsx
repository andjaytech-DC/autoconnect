"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgePercent, Calculator, CheckCircle2, Loader2, Wallet } from "lucide-react";
import { inr } from "@/app/lib/account";

/** Simple EMI estimate used for the planner preview. */
function emi(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 12 / 100;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export default function LoansPage() {
  // Real listed vehicles. Previously a static fixture, so the loan calculator
  // quoted EMI against cars that were not in the database.
  const [options, setOptions] = useState<{ id: number; name: string; price: number }[]>([]);
  const [carId, setCarId] = useState<number>(0);
  const [amount, setAmount] = useState(500_000);
  const [tenureYears, setTenureYears] = useState(5);
  const [monthlyIncome, setMonthlyIncome] = useState(100_000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/vehicles?limit=50", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          vehicles?: { id: number; name: string; price: number }[];
        };
        if (!alive) return;
        const list = data.vehicles ?? [];
        setOptions(list);
        if (list.length > 0) setCarId((cur) => cur || list[0].id);
      } catch {
        // Leave the picker empty rather than inventing inventory.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const selectedCar = options.find((c) => c.id === carId);
  const rate = 9.5;
  const months = tenureYears * 12;
  const monthly = emi(amount, rate, months);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(null);
    if (!carId) {
      setError("Choose a vehicle to apply for.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/loan/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId, amount, tenureYears, monthlyIncome }),
      });
      const data = (await res.json()) as { applicationId?: string; message?: string; error?: string };
      if (!res.ok || !data.applicationId) {
        setError(data.error ?? "Could not submit the application.");
      } else {
        setSuccess(data.message ?? "Application received.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">
      <main className="flex-1">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-12">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFC700] to-yellow-500 text-[#15130a]">
            <Wallet size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-content">Car Loan Application</h1>
            <p className="text-sm text-content-muted">Plan your EMI and apply for financing on the vehicle you want.</p>
          </div>
        </div>

        {success ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
            <CheckCircle2 size={44} className="mx-auto text-emerald-400" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-bold text-emerald-300">Application received</h2>
            <p className="mt-2 text-sm text-emerald-400/80">{success}</p>
            <Link
              href="/orders"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFC700] to-yellow-500 px-6 py-3 text-sm font-bold text-[#15130a] shadow-lg shadow-amber-500/25 hover:shadow-xl"
            >
              View my orders
            </Link>
          </div>
        ) : (
        <div className="grid gap-6 lg:grid-cols-2">
{/* Form */}
          <form onSubmit={submit} className="rounded-2xl border border-line bg-card p-6 space-y-5" aria-label="Loan application">
            <div>
              <label htmlFor="l-car" className="mb-1 block text-xs font-bold uppercase tracking-wider text-content-muted">
                Vehicle
              </label>
              <select
                id="l-car"
                value={carId}
                onChange={(e) => setCarId(Number(e.target.value))}
                className="input-field"
              >
                {options.length === 0 ? (
                  <option value={0} disabled>
                    No cars available
                  </option>
                ) : (
                  options.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — ₹{c.price.toLocaleString("en-IN")}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label htmlFor="l-amount" className="mb-2 block text-sm font-semibold text-content">
                Loan amount: {inr(amount)}
              </label>
              <input
                id="l-amount"
                type="range"
                min={100_000}
                max={2_500_000}
                step={25_000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full accent-[#FFC700]"
              />
            </div>

            <div>
              <label htmlFor="l-tenure" className="mb-2 block text-sm font-semibold text-content">
                Tenure: {tenureYears} year{tenureYears === 1 ? "" : "s"}
              </label>
              <input
                id="l-tenure"
                type="range"
                min={1}
                max={7}
                value={tenureYears}
                onChange={(e) => setTenureYears(Number(e.target.value))}
                className="w-full accent-[#FFC700]"
              />
            </div>

            <div>
              <label htmlFor="l-income" className="mb-1 block text-xs font-bold uppercase tracking-wider text-content-muted">
                Monthly income (₹) — for eligibility
              </label>
              <input
                id="l-income"
                type="number"
                min={0}
                step={5000}
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFC700] to-yellow-500 px-6 py-3.5 text-sm font-bold text-[#15130a] shadow-lg shadow-amber-500/25 hover:shadow-xl disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <BadgePercent size={16} aria-hidden="true" />
              )}
              {loading ? "Submitting…" : "Apply for Loan"}
            </button>
            {error && (
              <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
            <p className="text-xs text-content-muted">
              Submitting an application does not approve a loan. A partner bank will review
              your eligibility and details before any offer is made.
            </p>
          </form>

          {/* EMI preview */}
          <div className="rounded-2xl border border-line bg-card p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#FFC700]">EMI planner</h3>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface p-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFC700] to-yellow-500 text-[#15130a]">
                <Calculator size={22} aria-hidden="true" />
              </span>
              <div>
                <p className="text-2xl font-extrabold text-content">{inr(monthly)}</p>
                <p className="text-xs text-content-muted">estimated monthly installment</p>
              </div>
            </div>
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-content-muted">Car</dt>
                <dd className="font-bold text-content">{selectedCar?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-content-muted">Loan amount</dt>
                <dd className="font-bold text-content">{inr(amount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-content-muted">Interest (indicative)</dt>
                <dd className="font-bold text-content">{rate}% p.a.</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-content-muted">Tenure</dt>
                <dd className="font-bold text-content">{months} months</dd>
              </div>
              <div className="flex justify-between border-t border-divider pt-3">
                <dt className="font-bold text-content">Total repayment (approx.)</dt>
                <dd className="font-bold text-content">{inr(monthly * months)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-content-muted">
              Indicative only. Final rate, fees and eligibility are decided by the lender.
            </p>
          </div>
        </div>
        )}
      </div>
      </main>
    </div>
  );
}
