"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { SlidePartsField } from "@/components/SlidePartsField";
import type { SlidePart } from "@/components/SlidePartsField";
import { saveChapterDraft } from "../../../actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-huntly-forest px-4 py-2 text-sm font-medium text-white hover:bg-huntly-leaf disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-huntly-sage"
    >
      {pending ? "Saving…" : "Save chapter"}
    </button>
  );
}

type Props = {
  chapterId: number;
  seasonId: number;
  initialTitle: string;
  initialSummary: string;
  initialArcPosition: string;
  initialSlides: unknown[];
  arcPositions: { value: string; label: string }[];
};

export function ChapterEditorForm({
  chapterId,
  seasonId,
  initialTitle,
  initialSummary,
  initialArcPosition,
  initialSlides,
  arcPositions,
}: Props) {
  const [state, formAction] = useActionState(
    saveChapterDraft.bind(null, chapterId, seasonId),
    {}
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_200px]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm font-medium text-stone-700">
            Chapter title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            defaultValue={initialTitle}
            placeholder="e.g. The Whispering Woods"
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="arc_position" className="text-sm font-medium text-stone-700">
            Arc position
          </label>
          <select
            id="arc_position"
            name="arc_position"
            defaultValue={initialArcPosition}
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
          >
            <option value="">— select —</option>
            {arcPositions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="summary" className="text-sm font-medium text-stone-700">
          Chapter summary
        </label>
        <p className="text-xs text-stone-500">
          One sentence — Compass uses this to generate story pages and missions.
        </p>
        <textarea
          id="summary"
          name="summary"
          rows={2}
          defaultValue={initialSummary}
          placeholder="What happens in this chapter? One sentence is enough."
          className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
        />
      </div>

      <SlidePartsField
        name="body_slides"
        label="Story pages"
        initialSlides={(initialSlides as SlidePart[]) ?? []}
        help="Each slide is one page of the chapter story. Compass can generate these from the summary."
        uploadPrefix={`chapter-${chapterId}`}
      />

      <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
        <SaveButton />
      </div>
    </form>
  );
}
