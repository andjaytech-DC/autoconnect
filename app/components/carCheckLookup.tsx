"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";

interface Section {
  name: string;
  score: number;
  notes: string[];
}

interface Report {
  rc: string;
  vehicle: string;
  year: number;
  odometer: string;
  overallScore: number;
  checkedAt: string;
  sections: Section[];
}

/** Fetches and renders an inspection report from GET /api/car-check?rc=… */
export default function CarCheckLookup() {
  const [rc, setRc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = rc.replace(/[^a-zA-Z0-9]/g, "");
    if (value.length < 6) {
      setError("Enter the full registration number, e.g. MH12AB1234");
      return;
    }
    setError("");
    setReport(null);
    setNotFound(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/car-check?rc=${encodeURIComponent(value)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        found?: boolean;
        report?: Report;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not fetch the report right now.");
      } else if (data.found && data.report) {
        setReport(data.report);
      } else {
        setNotFound(true);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-line bg-card p-6 shadow-sm"
        aria-label="Look up an inspection report"
      >
        <label htmlFor="carcheck-rc" className="mb-2 block text-sm font-semibold text-content">
          Registration number
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="carcheck-rc"
            type="text"
            value={rc}
            onChange={(e) => setRc(e.target.value)}
            placeholder="e.g. MH 12 AB 1234"
            className="input-field"
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
            {loading ? "Loading…" : "Get Report"}
          </button>
        </div>
        {/* P0-13: this previously advertised two invented plates (MH12AB1234,
            DL8CAF2345) whose fabricated inspection scores were served as real.
            Removed — the page must never point customers at demo data. */}
        {error && (
          <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </form>

      {notFound && (
        <div className="mt-6 rounded-2xl border border-amber-300/60 bg-amber-50 p-5 text-amber-900" role="status">
          <p className="font-bold">No inspection report on file for this plate.</p>
          <p className="mt-1 text-sm leading-relaxed">
            We only show reports that exist in our inspection dataset — never
            generated on the fly.
          </p>
        </div>
      )}

      {report && (
        <article className="mt-6 overflow-hidden rounded-2xl border border-line bg-card">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-divider bg-surface px-6 py-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#FFC700]">
                Inspection report
              </p>
              <h3 className="mt-1 text-lg font-bold text-content">
                {report.vehicle} · {report.year}
              </h3>
              <p className="mt-0.5 text-xs text-content-muted">
                {report.rc} · {report.odometer} · Checked {report.checkedAt}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-extrabold text-[#FFC700]">
                {report.overallScore}
                <span className="text-base text-content-muted">/100</span>
              </p>
              <p className="text-xs font-semibold text-content-muted">Overall score</p>
            </div>
          </header>

          <ul className="divide-y divide-divider">
            {report.sections.map((s) => (
              <li key={s.name} className="px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-bold text-content">{s.name}</p>
                  <p className="text-sm font-bold text-content-muted">{s.score}</p>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FFC700] to-emerald-500"
                    style={{ width: `${Math.max(0, Math.min(100, s.score))}%` }}
                  />
                </div>
                {s.notes.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {s.notes.map((n) => (
                      <li key={n} className="text-xs text-content-muted">
                        • {n}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </article>
      )}
    </div>
  );
}