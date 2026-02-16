"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { ImageUploadField } from "@/components/ImageUploadField";
import { TextPartsField } from "@/components/TextPartsField";

type SeasonFormProps = {
  action: (formData: FormData) => Promise<{ error?: string }>;
  initial?: {
    name: string | null;
    hero_image: string | null;
    story: string | null;
    story_parts: string[];
  };
};

export function SeasonForm({ action, initial }: SeasonFormProps) {
  const [state, formAction] = useActionState(
    async (_: { error?: string }, formData: FormData) => {
      return action(formData);
    },
    { error: undefined }
  );

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      {state?.error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-stone-700">
          Name (optional)
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={initial?.name ?? ""}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
        />
      </div>

      <ImageUploadField
        name="hero_image"
        label="Hero image"
        prefix="heroes"
        defaultValue={initial?.hero_image}
        help="Upload to Supabase Storage or paste a URL."
      />

      <TextPartsField
        name="story_parts"
        label="Story parts (one per slide)"
        initialParts={initial?.story_parts ?? []}
        help="Each part appears as one slide in the app. Add parts in order."
      />

      <Button type="submit" size="lg">
        Save season
      </Button>
    </form>
  );
}
