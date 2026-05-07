"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/Button";
import { createSeasonDraft } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="md" disabled={pending}>
      {pending ? "Creating…" : "Create season"}
    </Button>
  );
}

export default function NewSeasonBuilderPage() {
  const [state, formAction] = useActionState(createSeasonDraft, {});

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-2xl font-semibold text-stone-900">
        New season
      </h1>
      <p className="mb-8 text-sm text-stone-500">
        Start with a name and brief. Compass can help fill in the rest.
      </p>

      {state.error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="name"
            className="text-sm font-medium text-stone-700"
          >
            Season name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. The Great Forest Quest"
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="brief"
            className="text-sm font-medium text-stone-700"
          >
            Season brief
          </label>
          <p className="text-xs text-stone-500">
            Describe the season concept, themes, story arc, and tone. This is
            the anchor for all Compass prompts — be as detailed as you like.
          </p>
          <textarea
            id="brief"
            name="brief"
            rows={8}
            placeholder="Write a rich description of the season. What's the overarching story? What themes do you want to explore? What should children discover and feel?"
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="target_age_min"
              className="text-sm font-medium text-stone-700"
            >
              Minimum age
            </label>
            <input
              id="target_age_min"
              name="target_age_min"
              type="number"
              defaultValue={4}
              min={2}
              max={18}
              className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="target_age_max"
              className="text-sm font-medium text-stone-700"
            >
              Maximum age
            </label>
            <input
              id="target_age_max"
              name="target_age_max"
              type="number"
              defaultValue={14}
              min={2}
              max={18}
              className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="theme_keywords"
            className="text-sm font-medium text-stone-700"
          >
            Theme keywords
          </label>
          <input
            id="theme_keywords"
            name="theme_keywords"
            type="text"
            placeholder="forest, courage, fungi, autumn (comma-separated)"
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
          />
          <p className="text-xs text-stone-500">
            Compass checks these for consistency across the whole season.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <SubmitButton />
          <Button href="/seasons" variant="ghost" size="md">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
