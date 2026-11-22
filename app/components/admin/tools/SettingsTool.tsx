"use client";

import { useState } from "react";
import { CheckCircle2, Settings2 } from "lucide-react";

import { Notice } from "./AdminToolShell";
import { sendAdmin, useAdminData } from "./useAdminData";

interface Setting {
  key: string;
  value: string;
}

export default function SettingsTool() {
  const { data, loading, error } = useAdminData<{ settings: Setting[] }>("/api/admin/settings");
  const [message, setMessage] = useState<string | null>(null);

  if (loading) return <Notice kind="loading">Loading settings…</Notice>;
  if (error || !data) return <Notice kind="error">{error ?? "Could not load settings"}</Notice>;
  if (data.settings.length === 0) return <Notice kind="empty">No settings configured yet</Notice>;

  async function save(key: string, value: string) {
    const r = await sendAdmin("/api/admin/settings", "POST", { key, value });
    setMessage(r.ok ? `Saved ${key}` : `Could not save ${key}: ${r.error}`);
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="admin-card flex items-start gap-3 p-4 sm:p-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--admin-surface-muted))] text-[hsl(var(--color-primary-strong))]">
          <Settings2 size={16} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-bold tracking-tight text-[hsl(var(--color-content))]">
            Platform settings
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
            Changes save when a field loses focus.
          </p>
        </div>
      </div>

      {message && (
        <p
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-900"
          role="status"
        >
          <CheckCircle2 size={14} aria-hidden="true" />
          {message}
        </p>
      )}

      <div className="admin-card divide-y divide-[hsl(var(--color-line))]">
        {data.settings.map((s) => (
          <SettingRow key={s.key} setting={s} onSave={save} />
        ))}
      </div>
    </div>
  );
}

function SettingRow({ setting, onSave }: { setting: Setting; onSave: (k: string, v: string) => void }) {
  const [draft, setDraft] = useState(setting.value);
  const [saved, setSaved] = useState(setting.value);
  return (
    <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <label
        htmlFor={`setting-${setting.key}`}
        className="font-mono text-xs font-semibold text-[hsl(var(--color-content))] sm:max-w-[45%]"
      >
        {setting.key}
      </label>
      <input
        id={`setting-${setting.key}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== saved) {
            setSaved(draft);
            onSave(setting.key, draft);
          }
        }}
        className="admin-input sm:max-w-xs"
      />
    </div>
  );
}
