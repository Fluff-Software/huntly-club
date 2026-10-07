"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/Button";
import { updateExploreEvent, type ExploreEventFormState } from "./actions";

export type ExploreEventInitial = {
  id: string;
  slug: string;
  name: string;
  /** "YYYY-MM-DDTHH:mm" in UK time. */
  startsAtLocal: string;
  endsAtLocal: string;
  packChancePercent: number;
  isActive: boolean;
  cardCount: number;
  live: boolean;
};

const inputClass =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="md" disabled={pending}>
      {pending ? "Saving…" : "Save event"}
    </Button>
  );
}

export function ExploreEventForm({ event }: { event: ExploreEventInitial }) {
  const [state, formAction] = useActionState<ExploreEventFormState, FormData>(
    (prev, formData) => updateExploreEvent(event.id, prev, formData),
    {}
  );
  const [isActive, setIsActive] = useState(event.isActive);

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-stone-900">{event.name}</h2>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
          {event.slug} · {event.cardCount} cards
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            event.live ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-500"
          }`}
        >
          {event.live ? "Live now" : "Not live"}
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
          Saved.
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`name-${event.id}`} className="mb-1 block text-sm font-medium text-stone-700">
            Name
          </label>
          <input
            id={`name-${event.id}`}
            name="name"
            type="text"
            required
            defaultValue={event.name}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`starts-${event.id}`} className="mb-1 block text-sm font-medium text-stone-700">
            Starts (UK time)
          </label>
          <input
            id={`starts-${event.id}`}
            name="starts_at"
            type="datetime-local"
            required
            defaultValue={event.startsAtLocal}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`ends-${event.id}`} className="mb-1 block text-sm font-medium text-stone-700">
            Ends (UK time)
          </label>
          <input
            id={`ends-${event.id}`}
            name="ends_at"
            type="datetime-local"
            required
            defaultValue={event.endsAtLocal}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-stone-500">
            Exclusive: packs stop at this moment. Use midnight after the last day.
          </p>
        </div>

        <div>
          <label htmlFor={`chance-${event.id}`} className="mb-1 block text-sm font-medium text-stone-700">
            Event pack chance (%)
          </label>
          <input
            id={`chance-${event.id}`}
            name="pack_chance_percent"
            type="number"
            min={0}
            max={100}
            step="any"
            required
            defaultValue={event.packChancePercent}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-stone-500">
            Chance that a stop claim banks an event pack while the event is live. Never
            100 — keep it a surprise. Players never get duplicates from event packs.
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
        Enabled (turn off to stop event packs immediately, regardless of dates)
      </label>

      <SaveButton />
    </form>
  );
}
