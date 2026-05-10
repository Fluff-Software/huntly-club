"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/Button";
import { updateSeasonBrief } from "../../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="md" disabled={pending}>
      {pending ? "Saving…" : "Save brief"}
    </Button>
  );
}

type Props = {
  seasonId: number;
  initial: {
    brief: string;
    concept_summary: string;
    theme_keywords: string;
    target_age_min: number;
    target_age_max: number;
    publish_at: string;
  };
};

export function BriefForm({ seasonId, initial }: Props) {
  const [state, formAction] = useActionState(
    updateSeasonBrief.bind(null, seasonId),
    {}
  );

  return (
    <>
      {state.error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="brief" className="text-sm font-medium text-stone-700">
            Season brief
          </label>
          <p className="text-xs text-stone-500">
            Everything Compass needs to know about this season. Read before every AI action.
          </p>
          <textarea
            id="brief"
            name="brief"
            rows={12}
            defaultValue={initial.brief}
            placeholder="Describe the overarching story, themes, key characters, arc shape, tone, what children will learn and discover…"
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="concept_summary" className="text-sm font-medium text-stone-700">
            Concept summary
          </label>
          <p className="text-xs text-stone-500">
            One paragraph (≤80 words), parent-facing.
          </p>
          <textarea
            id="concept_summary"
            name="concept_summary"
            rows={3}
            defaultValue={initial.concept_summary}
            placeholder="A short, engaging summary for parents…"
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="theme_keywords" className="text-sm font-medium text-stone-700">
            Theme keywords
          </label>
          <input
            id="theme_keywords"
            name="theme_keywords"
            type="text"
            defaultValue={initial.theme_keywords}
            placeholder="forest, courage, fungi, autumn (comma-separated)"
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="target_age_min" className="text-sm font-medium text-stone-700">
              Minimum age
            </label>
            <input
              id="target_age_min"
              name="target_age_min"
              type="number"
              defaultValue={initial.target_age_min}
              min={2}
              max={18}
              className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="target_age_max" className="text-sm font-medium text-stone-700">
              Maximum age
            </label>
            <input
              id="target_age_max"
              name="target_age_max"
              type="number"
              defaultValue={initial.target_age_max}
              min={2}
              max={18}
              className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="publish_at" className="text-sm font-medium text-stone-700">
            Season start date
          </label>
          <p className="text-xs text-stone-500">
            Week 1 unlocks on this date. Each subsequent chapter unlocks 7 days later. Set before publishing.
          </p>
          <input
            id="publish_at"
            name="publish_at"
            type="date"
            defaultValue={initial.publish_at}
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
          />
        </div>

        <div className="flex items-center gap-3">
          <SubmitButton />
          <Button href="../" variant="ghost" size="md">
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}
