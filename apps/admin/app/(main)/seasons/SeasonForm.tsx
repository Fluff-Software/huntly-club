"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/Button";
import { ImageUploadField } from "@/components/ImageUploadField";

type SeasonFormProps = {
  action: (formData: FormData) => Promise<{ error?: string }>;
  initial?: {
    name: string | null;
    hero_image: string | null;
  };
};

function SaveSeasonButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Saving season..." : "Save season"}
    </Button>
  );
}

export function SeasonForm({ action, initial }: SeasonFormProps) {
  const [state, formAction] = useActionState(
    async (_: { error?: string }, formData: FormData) => {
      return action(formData);
    },
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

      <div className="space-y-3">
        <SaveSeasonButton />
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
            Season saved successfully.
          </div>
        )}
      </div>
    </form>
  );
}
