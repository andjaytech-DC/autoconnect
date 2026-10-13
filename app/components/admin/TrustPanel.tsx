"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  FileQuestion,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Undo2,
  Wrench,
  LogOut,
} from "lucide-react";

/* ------------------------------------------------------------------ types */

type CheckStatus = "PENDING" | "VERIFIED" | "FAILED" | "NOT_AVAILABLE";

interface HistoryCheck {
  id: number;
  vehicleId: number;
  checkType: string;
  status: CheckStatus;
  source: string;
  summary: string | null;
  checkedAt: string;
  vehicle?: { id: number; title: string } | null;
}

interface WarrantyPlan {
  id: number;
  name: string;
  providerName: string;
  providerRef: string | null;
  durationMonths: number;
  maxMileageKm: number;
  coverageType: string;
  priceAmount: number;
  isActive: boolean;
  _count?: { purchases: number };
}

interface ReturnRequest {
  id: number;
  reason: string;
  description: string | null;
  status: string;
  resolutionNotes: string | null;
  requestedAt: string;
  resolvedAt: string | null;
  vehicle?: { id: number; title: string } | null;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface VehicleOption {
  id: number;
  title: string;
  registrationNumber: string | null;
}

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

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Staff entry",
  VAHAN: "VAHAN",
  RTO: "RTO",
  INSURER: "Insurer",
  SERVICE_CENTRE: "Service centre",
  POLICE: "Police",
};

const RETURN_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "PICKUP_SCHEDULED",
  "COMPLETED",
] as const;

/* ---------------------------------------------------------------- helpers */

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: CheckStatus) {
  switch (status) {
    case "VERIFIED":
      return {
        cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: ShieldCheck,
        label: "Verified",
      };
    case "FAILED":
      return {
        cls: "bg-red-50 text-red-700 border-red-200",
        icon: ShieldAlert,
        label: "Issue found",
      };
    case "NOT_AVAILABLE":
      return {
        cls: "bg-muted/50 text-content-muted border-border",
        icon: FileQuestion,
        label: "Not available",
      };
    default:
      return {
        cls: "bg-amber-50 text-amber-700 border-amber-200",
        icon: FileQuestion,
        label: "Unverified",
      };
  }
}

const card = "rounded-xl border border-border bg-card p-5";
const input =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-content focus:outline-none focus:ring-2 focus:ring-[#FFC700]/40";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-lg bg-[#FFC700] px-3.5 py-2 text-sm font-semibold text-black transition hover:bg-[#FFD84D] disabled:opacity-50";
const btnGhost =
  "inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-content transition hover:bg-muted disabled:opacity-50";

/**
 * `backendFetch` unwraps the backend envelope, so POST bodies are returned
 * as the bare resource (or the lookup outcome object), not `{ success, data }`.
 */
async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/trust", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = Array.isArray(json?.message)
      ? json.message.join(" ")
      : json?.error || json?.message || "Request failed";
    throw new Error(message);
  }
  return json;
}

/* ------------------------------------------------------------------ panel */

export default function TrustPanel({ vehicles }: { vehicles: VehicleOption[] }) {
  const [tab, setTab] = useState<"history" | "warranty" | "returns">("history");
  const [checks, setChecks] = useState<HistoryCheck[]>([]);
  const [plans, setPlans] = useState<WarrantyPlan[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /** Pure fetch — no state. Shared by the mount effect and the Refresh button. */
  const fetchTrust = useCallback(async () => {
    const res = await fetch("/api/admin/trust");
    if (!res.ok) throw new Error("Could not load trust data.");
    return (await res.json()) as {
      checks?: HistoryCheck[];
      plans?: WarrantyPlan[];
      returns?: ReturnRequest[];
    };
  }, []);

  const apply = useCallback((json: Awaited<ReturnType<typeof fetchTrust>>) => {
    setChecks(Array.isArray(json.checks) ? json.checks : []);
    setPlans(Array.isArray(json.plans) ? json.plans : []);
    setReturns(Array.isArray(json.returns) ? json.returns : []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      apply(await fetchTrust());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [apply, fetchTrust]);

  useEffect(() => {
    let active = true;
    // The first setState lands after an await, so mount never cascades a
    // synchronous re-render; the flag drops results if the panel unmounts.
    (async () => {
      try {
        const json = await fetchTrust();
        if (!active) return;
        apply(json);
      } catch (err) {
        if (active) setError((err as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [apply, fetchTrust]);

  const tabs = [
    { key: "history" as const, label: `History (${checks.length})` },
    { key: "warranty" as const, label: `Warranty (${plans.length})` },
    { key: "returns" as const, label: `Returns (${returns.length})` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === t.key
                  ? "bg-[#FFC700] text-black"
                  : "text-content-muted hover:text-content"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => void load()} className={btnGhost}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-content-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading trust data
        </div>
      ) : tab === "history" ? (
        <HistoryTab vehicles={vehicles} checks={checks} onDone={load} />
      ) : tab === "warranty" ? (
        <WarrantyTab plans={plans} onDone={load} />
      ) : (
        <ReturnsTab returns={returns} onDone={load} />
      )}
    </div>
  );
}

/* ----------------------------------------------------------- history tab */

function HistoryTab({
  vehicles,
  checks,
  onDone,
}: {
  vehicles: VehicleOption[];
  checks: HistoryCheck[];
  onDone: () => Promise<void> | void;
}) {
  const [vehicleId, setVehicleId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function runLookup(force: boolean) {
    if (!vehicleId) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await post({ action: "lookup", vehicleId: Number(vehicleId), force });
      setMsg({
        kind: res.outcome === "FOUND" || res.outcome === "CACHED" ? "ok" : "err",
        text: res.message,
      });
      await onDone();
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const selected = vehicles.find((v) => String(v.id) === vehicleId);
  const needsPlate = vehicleId !== "" && !selected?.registrationNumber;

  return (
    <div className="space-y-6">
      <div className={card}>
        <h3 className="text-sm font-bold uppercase tracking-wider text-content-muted">
          RTO / VAHAN lookup
        </h3>
        <p className="mt-1 text-sm text-content-muted">
          Calls the configured provider. Each call is billed, so results are
          cached for 24 hours.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <label className="mb-1 block text-sm font-medium text-content">
              Vehicle
            </label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className={input}
            >
              <option value="">Select a vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                  {v.registrationNumber ? ` — ${v.registrationNumber}` : " — no plate"}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void runLookup(false)}
            disabled={busy || !vehicleId}
            className={btnPrimary}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Run check
          </button>
          <button
            type="button"
            onClick={() => void runLookup(true)}
            disabled={busy || !vehicleId}
            className={btnGhost}
          >
            Force refresh
          </button>
        </div>

        {needsPlate && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4" />
            This listing has no number plate, so nothing can be looked up. Add
            one by editing the vehicle.
          </p>
        )}
        {msg && (
          <p
            className={`mt-3 rounded-lg border p-3 text-sm ${
              msg.kind === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {msg.text}
          </p>
        )}
      </div>

      <div className={card}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-content-muted">
            Record a check manually
          </h3>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className={btnGhost}
          >
            <Plus className="h-3.5 w-3.5" />
            {showForm ? "Close" : "Add check"}
          </button>
        </div>
        {showForm && (
          <ManualCheckForm
            vehicles={vehicles}
            onDone={async () => {
              setShowForm(false);
              setMsg({ kind: "ok", text: "History check recorded." });
              await onDone();
            }}
          />
        )}
      </div>

      <div className={card}>
        <h3 className="text-sm font-bold uppercase tracking-wider text-content-muted">
          Recorded checks
        </h3>
        {checks.length === 0 ? (
          <p className="mt-3 text-sm text-content-muted">
            No history checks recorded yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {checks.map((c) => {
              const b = statusBadge(c.status);
              const Icon = b.icon;
              return (
                <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-content">
                      {c.vehicle?.title ?? `Vehicle #${c.vehicleId}`}
                      <span className="ml-2 font-normal text-content-muted">
                        {CHECK_LABELS[c.checkType] ?? c.checkType}
                      </span>
                    </p>
                    {c.summary && (
                      <p className="mt-0.5 text-sm text-content-muted">{c.summary}</p>
                    )}
                    <p className="mt-0.5 text-xs text-content-muted">
                      {SOURCE_LABELS[c.source] ?? c.source} &middot;{" "}
                      {fmtDate(c.checkedAt)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${b.cls}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {b.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ManualCheckForm({
  vehicles,
  onDone,
}: {
  vehicles: VehicleOption[];
  onDone: () => Promise<void> | void;
}) {
  const [form, setForm] = useState({
    vehicleId: "",
    checkType: "OWNERSHIP",
    status: "PENDING" as CheckStatus,
    source: "MANUAL",
    summary: "",
    hasAccidentRecord: "",
    hasFloodDamage: "",
    hasOdometerTampering: "",
    hasLoanEncumbrance: "",
    ownershipCount: "",
    pendingChallanCount: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const tri = (v: string) => (v === "" ? undefined : v === "yes");
    const num = (v: string) => (v === "" ? undefined : Number(v));
    try {
      await post({
        action: "record",
        vehicleId: Number(form.vehicleId),
        checkType: form.checkType,
        status: form.status,
        source: form.source,
        summary: form.summary || undefined,
        hasAccidentRecord: tri(form.hasAccidentRecord),
        hasFloodDamage: tri(form.hasFloodDamage),
        hasOdometerTampering: tri(form.hasOdometerTampering),
        hasLoanEncumbrance: tri(form.hasLoanEncumbrance),
        ownershipCount: num(form.ownershipCount),
        pendingChallanCount: num(form.pendingChallanCount),
      });
      await onDone();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Vehicle</label>
          <select
            required
            value={form.vehicleId}
            onChange={(e) => set("vehicleId", e.target.value)}
            className={input}
          >
            <option value="">Select</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Check type</label>
          <select
            value={form.checkType}
            onChange={(e) => set("checkType", e.target.value)}
            className={input}
          >
            {Object.entries(CHECK_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Status</label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className={input}
          >
            <option value="PENDING">Unverified</option>
            <option value="VERIFIED">Verified</option>
            <option value="FAILED">Issue found</option>
            <option value="NOT_AVAILABLE">Not available</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Source</label>
          <select
            value={form.source}
            onChange={(e) => set("source", e.target.value)}
            className={input}
          >
            {Object.entries(SOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Summary</label>
        <input
          value={form.summary}
          onChange={(e) => set("summary", e.target.value)}
          placeholder="What did you find?"
          className={input}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["hasAccidentRecord", "Accident record"],
            ["hasFloodDamage", "Flood damage"],
            ["hasOdometerTampering", "Odometer tampering"],
            ["hasLoanEncumbrance", "Loan / encumbrance"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium">{label}</label>
            <select
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
              className={input}
            >
              <option value="">Not checked</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        ))}
        <div>
          <label className="mb-1 block text-sm font-medium">Previous owners</label>
          <input
            type="number"
            min={0}
            value={form.ownershipCount}
            onChange={(e) => set("ownershipCount", e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Pending challans</label>
          <input
            type="number"
            min={0}
            value={form.pendingChallanCount}
            onChange={(e) => set("pendingChallanCount", e.target.value)}
            className={input}
          />
        </div>
      </div>

      {form.status === "VERIFIED" && form.source === "MANUAL" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          A staff-entered check cannot be marked Verified. Choose a real source,
          or leave it Unverified.
        </p>
      )}

      {err && (
        <p className="flex items-start gap-1.5 text-sm text-red-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {err}
        </p>
      )}

      <button type="submit" disabled={busy} className={btnPrimary}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Save check
      </button>
    </form>
  );
}

/* ----------------------------------------------------------- warranty tab */

function WarrantyTab({
  plans,
  onDone,
}: {
  plans: WarrantyPlan[];
  onDone: () => Promise<void> | void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");

  const soldCount = useMemo(
    () => plans.filter((p) => (p._count?.purchases ?? 0) > 0).length,
    [plans],
  );

  async function toggleActive(p: WarrantyPlan) {
    setBusy(p.id);
    setErr("");
    try {
      await post({ action: "plan.update", id: p.id, isActive: !p.isActive });
      await onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(p: WarrantyPlan) {
    if ((p._count?.purchases ?? 0) > 0) {
      setErr(
        "This plan has already been sold. Deactivate it instead so policy history is kept.",
      );
      return;
    }
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    setBusy(p.id);
    setErr("");
    try {
      await post({ action: "plan.remove", id: p.id });
      await onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-content-muted">
              Warranty plans
            </h3>
            <p className="mt-1 text-sm text-content-muted">
              Every plan must name a real, agreed provider. With no plans
              configured, no warranty can be bought.
            </p>
          </div>
          <button type="button" onClick={() => setShowForm((s) => !s)} className={btnGhost}>
            <Plus className="h-3.5 w-3.5" />
            {showForm ? "Close" : "Add plan"}
          </button>
        </div>

        {showForm && (
          <PlanForm
            onDone={async () => {
              setShowForm(false);
              await onDone();
            }}
          />
        )}

        {err && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {err}
          </p>
        )}

        {plans.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-content-muted">
            No warranty plans configured. The storefront will not offer cover
            until you add a real provider.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {plans.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-content">
                    {p.name}{" "}
                    <span className="font-normal text-content-muted">
                      — {p.providerName}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-content-muted">
                    {p.durationMonths} months &middot; up to{" "}
                    {p.maxMileageKm.toLocaleString("en-IN")} km &middot;{" "}
                    {p.coverageType} &middot;{" "}
                    {p._count?.purchases ?? 0} sold
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      p.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-border bg-muted/50 text-content-muted"
                    }`}
                  >
                    {p.isActive ? "Active" : "Inactive"}
                  </span>
                  <span className="text-sm font-semibold text-content">
                    ₹{p.priceAmount.toLocaleString("en-IN")}
                  </span>
                  <button
                    type="button"
                    onClick={() => void toggleActive(p)}
                    disabled={busy === p.id}
                    className={btnGhost}
                  >
                    {p.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(p)}
                    disabled={busy === p.id || (p._count?.purchases ?? 0) > 0}
                    className={btnGhost}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {soldCount > 0 && (
          <p className="mt-3 text-xs text-content-muted">
            {soldCount} plan(s) have been sold and cannot be deleted.
          </p>
        )}
      </div>
    </div>
  );
}

function PlanForm({ onDone }: { onDone: () => Promise<void> | void }) {
  const [form, setForm] = useState({
    name: "",
    providerName: "",
    durationMonths: "12",
    maxMileageKm: "50000",
    coverageType: "COMPREHENSIVE",
    priceAmount: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await post({
        action: "plan.create",
        name: form.name,
        providerName: form.providerName,
        durationMonths: Number(form.durationMonths),
        maxMileageKm: Number(form.maxMileageKm),
        coverageType: form.coverageType,
        priceAmount: Number(form.priceAmount),
        notes: form.notes || undefined,
      });
      await onDone();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Plan name</label>
          <input
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="12-Month Powertrain Cover"
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Provider</label>
          <input
            required
            value={form.providerName}
            onChange={(e) => set("providerName", e.target.value)}
            placeholder="Warranty provider legal name"
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Duration (months)</label>
          <input
            type="number"
            min={1}
            max={120}
            required
            value={form.durationMonths}
            onChange={(e) => set("durationMonths", e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Max mileage (km)</label>
          <input
            type="number"
            min={0}
            required
            value={form.maxMileageKm}
            onChange={(e) => set("maxMileageKm", e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Coverage</label>
          <select
            value={form.coverageType}
            onChange={(e) => set("coverageType", e.target.value)}
            className={input}
          >
            <option value="COMPREHENSIVE">Comprehensive</option>
            <option value="POWERTRAIN">Powertrain</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Price (₹)</label>
          <input
            type="number"
            min={0}
            required
            value={form.priceAmount}
            onChange={(e) => set("priceAmount", e.target.value)}
            className={input}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Notes</label>
        <input
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className={input}
        />
      </div>
      {err && (
        <p className="flex items-start gap-1.5 text-sm text-red-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {err}
        </p>
      )}
      <button type="submit" disabled={busy} className={btnPrimary}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
        Create plan
      </button>
    </form>
  );
}

/* ----------------------------------------------------------- returns tab */

function ReturnsTab({
  returns,
  onDone,
}: {
  returns: ReturnRequest[];
  onDone: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});

  async function update(r: ReturnRequest, status: string) {
    if (
      status === "REJECTED" &&
      !(notes[r.id] ?? "").trim()
    ) {
      setErr("Record a reason before rejecting a return request.");
      return;
    }
    setBusy(r.id);
    setErr("");
    try {
      await post({
        action: "return.update",
        id: r.id,
        status,
        resolutionNotes: notes[r.id] || undefined,
      });
      await onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={card}>
      <h3 className="text-sm font-bold uppercase tracking-wider text-content-muted">
        Return requests
      </h3>
      <p className="mt-1 text-sm text-content-muted">
        Requests are queued for a human decision. Nothing is auto-approved.
      </p>

      {err && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {err}
        </p>
      )}

      {returns.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-content-muted">
          No return requests.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {returns.map((r) => {
            const closed = r.status === "REJECTED" || r.status === "COMPLETED";
            return (
              <li key={r.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-content">
                      {r.vehicle?.title ?? `Vehicle #${r.vehicle?.id ?? "?"}`}
                    </p>
                    <p className="mt-0.5 text-sm text-content-muted">{r.reason}</p>
                    {r.description && (
                      <p className="mt-1 text-sm text-content-muted">
                        {r.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-content-muted">
                      {r.user
                        ? `${r.user.firstName} ${r.user.lastName} — ${r.user.email}`
                        : "Customer details unavailable"}{" "}
                      &middot; {fmtDate(r.requestedAt)}
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-content-muted">
                    {r.status.replace(/_/g, " ")}
                  </span>
                </div>

                {r.resolutionNotes && (
                  <p className="mt-2 rounded border border-border bg-muted/30 p-2 text-sm text-content-muted">
                    {r.resolutionNotes}
                  </p>
                )}

                {!closed && (
                  <>
                    <textarea
                      value={notes[r.id] ?? ""}
                      onChange={(e) =>
                        setNotes((n) => ({ ...n, [r.id]: e.target.value }))
                      }
                      rows={2}
                      placeholder="Resolution notes (required to reject)"
                      className={`${input} mt-3`}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {RETURN_STATUSES.filter(
                        (s) => s !== "REQUESTED" && s !== r.status,
                      ).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => void update(r, s)}
                          disabled={busy === r.id}
                          className={btnGhost}
                        >
                          {busy === r.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : s === "REJECTED" ? (
                            <Undo2 className="h-3.5 w-3.5" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          )}
                          {s.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {closed && r.resolvedAt && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-content-muted">
                    <LogOut className="h-3.5 w-3.5" />
                    Closed {fmtDate(r.resolvedAt)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
