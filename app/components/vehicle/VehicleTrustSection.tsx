"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  FileQuestion,
  Loader2,
  AlertCircle,
  Undo2,
} from "lucide-react";
import type { UiHistoryCheck } from "@/app/api/vehicle-history/route";

type CheckStatus = UiHistoryCheck["status"];
type HistorySource =
  | "MANUAL"
  | "VAHAN"
  | "RTO"
  | "INSURER"
  | "SERVICE_CENTRE"
  | "POLICE";

type HistoryCheck = UiHistoryCheck;

const CHECK_LABELS: Record<string, string> = {
  OWNERSHIP: "Ownership",
  SERVICE: "Service history",
  ACCIDENT: "Accident record",
  ODOMETER: "Odometer",
  ENCUMBRANCE: "Loan / encumbrance",
  CHALLAN: "Pending challans",
  INSURANCE: "Insurance",
  PUC: "PUC certificate",
  RC: "Registration certificate",
};

const SOURCE_LABELS: Record<HistorySource, string> = {
  MANUAL: "Recorded by Progressive AutoHub staff",
  VAHAN: "Parivahan (vehicle data)",
  RTO: "Regional Transport Office",
  INSURER: "Insurance provider",
  SERVICE_CENTRE: "Authorised service centre",
  POLICE: "Police record",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusMeta(status: CheckStatus) {
  switch (status) {
    case "VERIFIED":
      return {
        icon: ShieldCheck,
        label: "Verified",
        cls: "text-emerald-600 bg-emerald-50 border-emerald-200",
      };
    case "FAILED":
      return {
        icon: ShieldAlert,
        label: "Issue found",
        cls: "text-red-600 bg-red-50 border-red-200",
      };
    case "NOT_AVAILABLE":
      return {
        icon: FileQuestion,
        label: "Not available",
        cls: "text-muted bg-muted/40 border-border",
      };
    default:
      return {
        icon: FileQuestion,
        label: "Unverified",
        cls: "text-amber-700 bg-amber-50 border-amber-200",
      };
  }
}

/** Renders a finding, distinguishing "checked and clean" from "not checked". */
function Finding({ value, children }: { value: boolean | null; children: React.ReactNode }) {
  if (value === null || value === undefined) {
    return (
      <span className="text-muted">
        {children} <span className="text-xs">(not checked)</span>
      </span>
    );
  }
  return (
    <span className={value ? "text-red-600" : "text-emerald-600"}>
      {value ? "Yes" : "No"} &mdash; {children}
    </span>
  );
}

export default function VehicleTrustSection({ vehicleId }: { vehicleId: number }) {
  const [checks, setChecks] = useState<HistoryCheck[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnDetails, setReturnDetails] = useState("");
  const [returnState, setReturnState] = useState<
    "idle" | "sending" | "sent"
  >("idle");
  const [returnError, setReturnError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/vehicle-history?vehicleId=${vehicleId}`);
        if (!active) return;
        if (!res.ok) throw new Error("failed");
        const json = (await res.json()) as { checks?: HistoryCheck[] };
        setChecks(json?.checks ?? []);
      } catch {
        if (!active) return;
        setError("Vehicle history is temporarily unavailable.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [vehicleId]);

  async function submitReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!returnReason.trim()) return;
    setReturnState("sending");
    setReturnError("");
    try {
      const res = await fetch("/api/return-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          reason: returnReason.trim(),
          description: returnDetails.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(json?.error || "Could not submit your request.");
      }
      setReturnState("sent");
    } catch (err) {
      setReturnState("idle");
      setReturnError(
        (err as Error).message || "Could not submit your request. Please try again.",
      );
    }
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading vehicle history
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-2 text-sm text-red-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      </section>
    );
  }

  const hasChecks = checks && checks.length > 0;

  return (
    <section className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-content">Vehicle history</h2>
        <p className="mt-1 text-sm text-muted">
          Records collected by Progressive AutoHub. Unverified records are
          staff observations, not an authority confirmation.
        </p>
      </div>

      {!hasChecks && (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted">
          No history checks have been recorded for this vehicle yet. We have not
          verified its ownership, service or accident history &mdash; ask us for
          the records we hold.
        </p>
      )}

      {hasChecks && (
        <ul className="divide-y divide-border">
          {checks!.map((c) => {
            const meta = statusMeta(c.status);
            const Icon = meta.icon;
            return (
              <li key={c.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-content">
                    {CHECK_LABELS[c.checkType] ?? c.checkType}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {meta.label}
                  </span>
                </div>

                {c.summary && (
                  <p className="mt-1 text-sm text-muted">{c.summary}</p>
                )}

                <div className="mt-1.5 space-y-0.5 text-sm">
                  {c.hasAccidentRecord !== null && (
                    <Finding value={c.hasAccidentRecord}>
                      accident record
                    </Finding>
                  )}
                  {c.hasFloodDamage !== null && (
                    <Finding value={c.hasFloodDamage}>flood damage</Finding>
                  )}
                  {c.hasOdometerTampering !== null && (
                    <Finding value={c.hasOdometerTampering}>
                      odometer tampering
                    </Finding>
                  )}
                  {c.hasLoanEncumbrance !== null && (
                    <Finding value={c.hasLoanEncumbrance}>
                      registered loan / encumbrance
                    </Finding>
                  )}
                  {c.pendingChallanCount !== null && (
                    <p
                      className={
                        c.pendingChallanCount > 0 ? "text-red-600" : "text-muted"
                      }
                    >
                      {c.pendingChallanCount} pending challan
                      {c.pendingChallanCount === 1 ? "" : "s"}
                    </p>
                  )}
                  {c.ownershipCount !== null && (
                    <p className="text-muted">
                      {c.ownershipCount} previous owner
                      {c.ownershipCount === 1 ? "" : "s"}
                    </p>
                  )}
                </div>

                <p className="mt-1.5 text-xs text-muted">
                  {SOURCE_LABELS[c.source as HistorySource] ?? c.source} &middot;
                  checked {formatDate(c.checkedAt)}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-border pt-4">
        {returnState === "sent" ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-medium">Request received</p>
            <p className="mt-1">
              Our team will review the details and contact you. This is not an
              approval &mdash; return eligibility is assessed case by case.
            </p>
          </div>
        ) : !returnOpen ? (
          <button
            type="button"
            onClick={() => setReturnOpen(true)}
            className="inline-flex items-center gap-2 text-sm font-medium text-content underline underline-offset-4 hover:text-[#B8912E]"
          >
            <Undo2 className="h-4 w-4" /> Request a return
          </button>
        ) : (
          <form onSubmit={submitReturn} className="space-y-3">
            <p className="text-sm text-muted">
              Tell us what went wrong and we will review your request. Please
              describe the issue in detail.
            </p>
            <div>
              <label
                htmlFor={`return-reason-${vehicleId}`}
                className="mb-1 block text-sm font-medium text-content"
              >
                Reason
              </label>
              <select
                id={`return-reason-${vehicleId}`}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-content focus:outline-none focus:ring-2 focus:ring-[#FFC700]/40"
              >
                <option value="">Select a reason</option>
                <option value="Odometer reading did not match the listing">
                  Odometer reading did not match the listing
                </option>
                <option value="Major defect not disclosed in the listing">
                  Major defect not disclosed in the listing
                </option>
                <option value="Accident or flood damage not disclosed">
                  Accident or flood damage not disclosed
                </option>
                <option value="Documents could not be verified">
                  Documents could not be verified
                </option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label
                htmlFor={`return-details-${vehicleId}`}
                className="mb-1 block text-sm font-medium text-content"
              >
                Details <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id={`return-details-${vehicleId}`}
                value={returnDetails}
                onChange={(e) => setReturnDetails(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-content focus:outline-none focus:ring-2 focus:ring-[#FFC700]/40"
              />
            </div>
            {returnError && (
              <p className="flex items-start gap-1.5 text-sm text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {returnError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={returnState === "sending" || !returnReason.trim()}
                className="rounded-lg bg-[#FFC700] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#FFD84D] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {returnState === "sending" ? "Submitting..." : "Submit request"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setReturnOpen(false);
                  setReturnError("");
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-content transition hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
