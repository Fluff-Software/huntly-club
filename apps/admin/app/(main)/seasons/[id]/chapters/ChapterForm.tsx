"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/Button";
import { ImageUploadField } from "@/components/ImageUploadField";
import { SlidePartsField, type SlidePart } from "@/components/SlidePartsField";

type ChapterFormProps = {
  action: (formData: FormData) => Promise<{ error?: string }>;
  initial?: {
    week_number: number;
    title: string;
    image: string | null;
    body: string | null;
    body_parts: string[];
    body_slides: SlidePart[];
    unlock_date: string;
  };
  chapterId?: number | null;
};

function SaveChapterButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Saving chapter..." : "Save chapter"}
    </Button>
  );
}

export function ChapterForm({ action, initial, chapterId }: ChapterFormProps) {
  const [state, formAction] = useActionState(
    async (_: { error?: string }, formData: FormData) => action(formData),
    { error: undefined }
  );
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  return (
    <form
      action={formAction}
      className="max-w-xl space-y-6"
      onSubmit={() => setHasAttemptedSubmit(true)}
    >

      <div>
        <label htmlFor="week_number" className="mb-1 block text-sm font-medium text-stone-700">
          Week number (1–12)
        </label>
        <input
          id="week_number"
          name="week_number"
          type="number"
          min={1}
          max={12}
          required
          defaultValue={initial?.week_number ?? 1}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
        />
      </div>

      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-stone-700">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial?.title ?? ""}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
        />
      </div>

      <div>
        <label htmlFor="unlock_date" className="mb-1 block text-sm font-medium text-stone-700">
          Unlock date
        </label>
        <input
          id="unlock_date"
          name="unlock_date"
          type="date"
          required
          defaultValue={initial?.unlock_date ?? ""}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
        />
      </div>

      <ImageUploadField
        name="image"
        label="Image (optional)"
        prefix="chapters"
        defaultValue={initial?.image}
        help="Upload to Supabase Storage or paste a URL."
      />

      <SlidePartsField
        name="body_slides"
        label="Chapter slides"
        initialSlides={initial?.body_slides ?? []}
        help="Each slide can be text or an image. Order is preserved in the app."
        uploadPrefix={chapterId != null ? `chapter-${chapterId}` : null}
      />

      <div className="space-y-3">
        <SaveChapterButton />
        {state?.error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {state.error}
          </div>
        )}
        {hasAttemptedSubmit && !state?.error && (
          <div className="text-sm text-green-700" role="status">
            Chapter saved successfully.
          </div>
        )}
      </div>
    </form>
  );
}
