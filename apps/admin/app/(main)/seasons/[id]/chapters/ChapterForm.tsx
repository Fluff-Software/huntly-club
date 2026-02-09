"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { ImageUploadField } from "@/components/ImageUploadField";

type ChapterFormProps = {
  action: (formData: FormData) => Promise<{ error?: string }>;
  initial?: {
    week_number: number;
    title: string;
    image: string | null;
    body: string | null;
    unlock_date: string;
  };
};

export function ChapterForm({ action, initial }: ChapterFormProps) {
  const [state, formAction] = useActionState(
    async (_: { error?: string }, formData: FormData) => action(formData),
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

      <div>
        <label htmlFor="body" className="mb-1 block text-sm font-medium text-stone-700">
          Body (markdown or plain text)
        </label>
        <textarea
          id="body"
          name="body"
          rows={6}
          defaultValue={initial?.body ?? ""}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
        />
      </div>

      <Button type="submit" size="lg">
        Save chapter
      </Button>
    </form>
  );
}
