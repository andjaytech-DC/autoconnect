"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Search, ShieldAlert } from "lucide-react";

interface ChallanItem {
  id: string;
  date: string;
  violation: string;
  location: string;
  amount: number;
  status: "PENDING" | "PAID";
}

interface ChallanResult {
  found: boolean;
  source?: string;
  vehicle?: { ownerName: string; model: string; fuel: string };
  challans?: ChallanItem[];
  pendingCount?: number;
  totalDue?: number;
}

/**
 * Challan lookup UI. Calls GET /api/challan?rc=… which serves a clearly
 * labelled SAMPLE dataset — unknown registration numbers return
 * `found: false` and the UI never fabricates results.
 */
export default function ChallanCheckForm() {
  const [regNo, setRegNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ChallanResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = regNo.replace(/[^a-zA-Z0-9]/g, "");
    if (value.length < 6) {
      setError("Enter the full registration number, e.g. MH12AB1234");
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/challan?rc=${encodeURIComponent(value)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as ChallanResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not check challans right now.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-line bg-card p-6 shadow-sm"
        aria-label="Check vehicle challan"
      >
        <label
          htmlFor="challan-regno"
          className="mb-2 block text-sm font-semibold text-content"
        >
          Vehicle Registration Number
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="challan-regno"
            type="text"
            value={regNo}
            onChange={(e) => setRegNo(e.target.value)}
            placeholder="e.g. MH 12 AB 1234"
            className="input-field"
            aria-describedby="challan-hint"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFC700] to-yellow-500 px-6 py-3 text-sm font-bold text-[#15130a] shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Search size={16} aria-hidden="true" />
            )}
            {loading ? "Checking…" : "Check Challan"}
          </button>
        </div>
        {/* P0-13: previously advertised invented plates (MH12AB1234, KA05MJ4871)
            whose fabricated challan records were served as real. Removed. */}
        {error && (
          <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </form>
{/* Result */}
      {result?.found && (
        <div className="mt-6 rounded-2xl border border-line bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#FFC700]">
                {result.vehicle?.model}
              </p>
              <p className="mt-1 text-sm text-content-muted">
                Registered to {result.vehicle?.ownerName} · {result.vehicle?.fuel}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
              <AlertTriangle size={13} aria-hidden="true" />
              {result.pendingCount === 0
                ? "No pending challans"
                : `${result.pendingCount} pending`}
            </span>
          </div>

          <ul className="mt-5 space-y-3">
            {result.challans?.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-content">{c.violation}</p>
                  <p className="mt-0.5 text-xs text-content-muted">
                    {c.id} · {c.date} · {c.location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-content">
                    ₹{c.amount.toLocaleString("en-IN")}
                  </p>
                  <p
                    className={`text-xs font-bold ${
                      c.status === "PENDING" ? "text-amber-600" : "text-[#FFC700]"
                    }`}
                  >
                    {c.status}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {result.totalDue !== undefined && result.totalDue > 0 && (
            <p className="mt-5 border-t border-divider pt-4 text-sm font-bold text-content">
              Total due: ₹{result.totalDue.toLocaleString("en-IN")}
            </p>
          )}

          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-content-muted">
            <ShieldAlert className="mt-0.5 shrink-0" size={14} aria-hidden="true" />
            <span>
              Sample dataset for demonstration. Clear actual dues on your state
              transport portal before sale or transfer — see{" "}
              <Link href="/car-check" className="font-semibold text-[#FFC700]">
                Car Check
              </Link>
              .
            </span>
          </p>
        </div>
      )}

      {result && !result.found && (
        <div
          className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 p-5 text-amber-900"
          role="status"
        >
          <ShieldAlert className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
          <div>
            <p className="font-bold">No record found for this plate.</p>
            <p className="mt-1 text-sm leading-relaxed">
              The live government/RTO challan API is not connected yet, so we only
              return records that genuinely exist in our dataset — never invented
              fines. Please verify directly on your state transport portal.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}