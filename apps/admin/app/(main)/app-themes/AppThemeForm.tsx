"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/Button";
import { updateAppTheme, type AppThemeFormState } from "./actions";

export type AppThemeInitial = {
  id: string;
  slug: string;
  name: string;
  /** "YYYY-MM-DDTHH:mm" in UK time. */
  startsAtLocal: string;
  endsAtLocal: string;
  isActive: boolean;
  live: boolean;
};

const inputClass =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="md" disabled={pending}>
      {pending ? "Saving…" : "Save theme"}
    </Button>
  );
}

export function AppThemeForm({ theme }: { theme: AppThemeInitial }) {
  const [state, formAction] = useActionState<AppThemeFormState, FormData>(
    (prev, formData) => updateAppTheme(theme.id, prev, formData),
    {}
  );
  const [isActive, setIsActive] = useState(theme.isActive);

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-stone-900">{theme.name}</h2>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
          {theme.slug}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            theme.live ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-500"
          }`}
        >
          {theme.live ? "Live now" : "Not live"}
        </span>
      </div>

      {state.error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}
      {state.saved ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Saved. Phones pick this up the next time the app opens.
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`starts-${theme.id}`} className="mb-1 block text-sm font-medium text-stone-700">
            Starts (UK time)
          </label>
          <input
            id={`starts-${theme.id}`}
            name="starts_at"
            type="datetime-local"
            required
            defaultValue={theme.startsAtLocal}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`ends-${theme.id}`} className="mb-1 block text-sm font-medium text-stone-700">
            Ends (UK time)
          </label>
          <input
            id={`ends-${theme.id}`}
            name="ends_at"
            type="datetime-local"
            required
            defaultValue={theme.endsAtLocal}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-stone-500">
            Exclusive. The app switches back to normal at this moment, even offline.
          </p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-stone-300 text-huntly-forest focus:ring-huntly-sage"
        />
        Enabled (turn off to switch the theme off, regardless of dates)
      </label>

      <SaveButton />
    </form>
  );
}
