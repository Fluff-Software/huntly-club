"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ContentStatus } from "@/components/StatusPill";
import { StatusPill } from "@/components/StatusPill";
import { saveMissionFields } from "../actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-huntly-forest px-4 py-2 text-sm font-medium text-white hover:bg-huntly-leaf disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-huntly-sage"
    >
      {pending ? "Saving…" : "Save mission"}
    </button>
  );
}

type Props = {
  activityId: number;
  seasonId: number;
  chapterId: number;
  initialMissionType: "outdoor" | "indoor" | "hybrid" | null;
  initialSafetyNotes: string;
  initialDescription: string;
  initialEstimatedDuration: string;
  initialContentStatus: ContentStatus;
};

export function MissionEditorFields({
  activityId,
  seasonId,
  chapterId,
  initialMissionType,
  initialSafetyNotes,
  initialDescription,
  initialEstimatedDuration,
  initialContentStatus,
}: Props) {
  const [state, formAction] = useActionState(
    saveMissionFields.bind(null, activityId, seasonId, chapterId),
    {}
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Mission type */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-stone-700">Mission type</label>
        <div className="flex gap-3">
          {(["outdoor", "indoor", "hybrid"] as const).map((type) => (
            <label
              key={type}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm has-[:checked]:border-huntly-forest/40 has-[:checked]:bg-huntly-forest/5"
            >
              <input
                type="radio"
                name="mission_type"
                value={type}
                defaultChecked={initialMissionType === type}
                className="text-huntly-forest focus:ring-huntly-sage"
              />
              <span className="capitalize text-stone-700">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-stone-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initialDescription}
          placeholder="2–3 sentence mission brief for the child…"
          className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
        />
      </div>

      {/* Duration */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="estimated_duration" className="text-sm font-medium text-stone-700">
          Estimated duration
        </label>
        <input
          id="estimated_duration"
          name="estimated_duration"
          type="text"
          defaultValue={initialEstimatedDuration}
          placeholder="e.g. 20–30 minutes"
          className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
        />
      </div>

      {/* Safety notes */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="safety_notes" className="text-sm font-medium text-stone-700">
          Safety notes
        </label>
        <p className="text-xs text-stone-500">
          Age-appropriate safety guidance. Compass can draft this.
        </p>
        <textarea
          id="safety_notes"
          name="safety_notes"
          rows={2}
          defaultValue={initialSafetyNotes}
          placeholder="e.g. Always stay with a grown-up. Watch your step on uneven ground."
          className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
        />
      </div>

      <div className="flex items-center gap-3 border-t border-stone-100 pt-4">
        <SaveButton />
        <div className="ml-auto">
          <StatusPill status={initialContentStatus} />
        </div>
      </div>
    </form>
  );
}
