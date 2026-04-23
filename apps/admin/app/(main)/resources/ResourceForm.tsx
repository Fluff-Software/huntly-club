"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/Button";
import { FileUploadField } from "@/components/FileUploadField";

type ResourceFormProps = {
  action: (formData: FormData) => Promise<{ error?: string }>;
  initial?: {
    title: string;
    description: string | null;
    file_url: string;
    sort_order: number;
    category: string | null;
  };
};

function SaveResourceButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Saving resource..." : "Save resource"}
    </Button>
  );
}

export function ResourceForm({ action, initial }: ResourceFormProps) {
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
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-stone-700">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial?.title ?? ""}
          placeholder="e.g. Adventure Passes"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-stone-700">
          Description (optional)
        </label>
        <input
          id="description"
          name="description"
          type="text"
          defaultValue={initial?.description ?? ""}
          placeholder="e.g. A printable adventurer pass for each of your explorers"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
        />
      </div>

      <FileUploadField
        name="file_url"
        label="File (PDF or image)"
        defaultValue={initial?.file_url}
        help="Upload a PDF or image (JPEG, PNG, WebP, GIF). Max 15MB."
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="sort_order" className="mb-1 block text-sm font-medium text-stone-700">
            Sort order
          </label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            min={0}
            defaultValue={initial?.sort_order ?? 0}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
          />
        </div>
        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium text-stone-700">
            Category (optional)
          </label>
          <input
            id="category"
            name="category"
            type="text"
            defaultValue={initial?.category ?? ""}
            placeholder="e.g. Printables"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
          />
        </div>
      </div>

      <div className="space-y-3">
        <SaveResourceButton />
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
            Resource saved successfully.
          </div>
        )}
      </div>
    </form>
  );
}
