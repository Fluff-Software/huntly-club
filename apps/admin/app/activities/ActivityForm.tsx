"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { ImageUploadField } from "@/components/ImageUploadField";

type ActivityFormProps = {
  action: (formData: FormData) => Promise<{ error?: string }>;
  initial?: {
    name: string;
    title: string;
    description: string | null;
    long_description: string | null;
    hints: string | null;
    tips: string | null;
    trivia: string | null;
    image: string | null;
    xp: number | null;
    photo_required: boolean | null;
    categories: string[] | null;
  };
};

function formatCategories(cats: string[] | null | undefined): string {
  if (!cats || !Array.isArray(cats)) return "";
  return cats.join(", ");
}

export function ActivityForm({ action, initial }: ActivityFormProps) {
  const [state, formAction] = useActionState(
    async (_: { error?: string }, formData: FormData) => action(formData),
    { error: undefined }
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {state?.error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-stone-700">
            Name (slug)
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={initial?.name ?? ""}
            placeholder="e.g. bird_spotting"
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
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-stone-700">
          Description (short)
        </label>
        <input
          id="description"
          name="description"
          type="text"
          defaultValue={initial?.description ?? ""}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
        />
      </div>

      <div>
        <label htmlFor="long_description" className="mb-1 block text-sm font-medium text-stone-700">
          Long description
        </label>
        <textarea
          id="long_description"
          name="long_description"
          rows={4}
          defaultValue={initial?.long_description ?? ""}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
        />
      </div>

      <ImageUploadField
        name="image"
        label="Image"
        uploadKind="activity"
        defaultValue={initial?.image}
        help="Upload to Supabase Storage or paste a URL."
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="xp" className="mb-1 block text-sm font-medium text-stone-700">
            XP
          </label>
          <input
            id="xp"
            name="xp"
            type="number"
            min={0}
            defaultValue={initial?.xp ?? 10}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
          />
        </div>
        <div className="flex items-center gap-2 pt-8">
          <input
            id="photo_required"
            name="photo_required"
            type="checkbox"
            defaultChecked={initial?.photo_required ?? false}
            className="h-4 w-4 rounded border-stone-300 text-huntly-forest focus:ring-huntly-sage"
          />
          <label htmlFor="photo_required" className="text-sm font-medium text-stone-700">
            Photo required
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="categories" className="mb-1 block text-sm font-medium text-stone-700">
          Categories (comma-separated)
        </label>
        <input
          id="categories"
          name="categories"
          type="text"
          defaultValue={formatCategories(initial?.categories)}
          placeholder="e.g. nature, wildlife, observation"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
        />
      </div>

      <div>
        <label htmlFor="hints" className="mb-1 block text-sm font-medium text-stone-700">
          Hints
        </label>
        <textarea
          id="hints"
          name="hints"
          rows={3}
          defaultValue={initial?.hints ?? ""}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
        />
      </div>

      <div>
        <label htmlFor="tips" className="mb-1 block text-sm font-medium text-stone-700">
          Tips
        </label>
        <textarea
          id="tips"
          name="tips"
          rows={3}
          defaultValue={initial?.tips ?? ""}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
        />
      </div>

      <div>
        <label htmlFor="trivia" className="mb-1 block text-sm font-medium text-stone-700">
          Trivia
        </label>
        <textarea
          id="trivia"
          name="trivia"
          rows={2}
          defaultValue={initial?.trivia ?? ""}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
        />
      </div>

      <Button type="submit" size="lg">
        Save mission
      </Button>
    </form>
  );
}
