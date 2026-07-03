"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { updateSimulatedActivitySettings, type SimulatedActivitySettings } from "./actions";

type Props = { initial: SimulatedActivitySettings };

export function SettingsCard({ initial }: Props) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [completionsPerDay, setCompletionsPerDay] = useState(initial.completionsPerDay);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = enabled !== initial.enabled || completionsPerDay !== initial.completionsPerDay;

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await updateSimulatedActivitySettings({ enabled, completionsPerDay });
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
    }
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-stone-900">Drip settings</h2>
      <p className="mt-1 text-sm text-stone-500">
        When enabled, a scheduled job trickles in one simulated mission completion at a
        time from the fake explorer pool below, at roughly the target rate.
      </p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked);
              setSaved(false);
            }}
            className="h-4 w-4 rounded border-stone-300 text-huntly-forest focus:ring-huntly-sage"
          />
          Enabled
        </label>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="completions-per-day" className="text-sm font-medium text-stone-700">
            Target completions / day
          </label>
          <input
            id="completions-per-day"
            type="number"
            min={0}
            max={5000}
            value={completionsPerDay}
            onChange={(e) => {
              setCompletionsPerDay(Number(e.target.value));
              setSaved(false);
            }}
            className="w-40 rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
          />
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? "Saving…" : "Save"}
        </Button>

        {saved && !dirty && <span className="text-sm text-green-700">Saved</span>}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
