"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/Button";
import type { CaptainFormState } from "./actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="md" disabled={pending}>
      {pending ? "Saving…" : "Save captain"}
    </Button>
  );
}

type Props = {
  action: (prev: CaptainFormState, formData: FormData) => Promise<CaptainFormState>;
  initial?: {
    name: string;
    slug: string;
    voice_guide: string;
    avatar_url: string;
    pose_options: string[];
  };
  isNew?: boolean;
};

export function CaptainForm({ action, initial, isNew }: Props) {
  const [state, formAction] = useActionState(action, {});
  const [poses, setPoses] = useState<string[]>(
    initial?.pose_options && initial.pose_options.length > 0
      ? initial.pose_options
      : ["standing"]
  );

  return (
    <form action={formAction} className="flex flex-col gap-6 max-w-2xl">
      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-stone-700">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={initial?.name ?? ""}
            placeholder="e.g. Captain Oakley"
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="slug" className="text-sm font-medium text-stone-700">
            Slug <span className="text-red-500">*</span>
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            readOnly={!isNew}
            defaultValue={initial?.slug ?? ""}
            placeholder="e.g. captain-oakley"
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 font-mono text-sm focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20 read-only:bg-stone-50 read-only:text-stone-500"
          />
          {!isNew && (
            <p className="text-xs text-stone-400">Slug cannot be changed after creation.</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="avatar_url" className="text-sm font-medium text-stone-700">
          Avatar URL
        </label>
        <input
          id="avatar_url"
          name="avatar_url"
          type="text"
          defaultValue={initial?.avatar_url ?? ""}
          placeholder="https://…"
          className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="voice_guide" className="text-sm font-medium text-stone-700">
          Voice guide <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-stone-500">
          Describe the captain&apos;s tone, vocabulary, personality, and any banned phrases.
          Compass reads this before every AI generation involving this captain.
        </p>
        <textarea
          id="voice_guide"
          name="voice_guide"
          required
          rows={8}
          defaultValue={initial?.voice_guide ?? ""}
          placeholder={`E.g:\nTone: warm, encouraging, adventurous. Never uses complex vocabulary.\nAlways addresses the child directly ('you').\nCatchphrase: 'Nature has a secret for you!'\nBanned words: scary, dangerous, difficult.`}
          className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-stone-700">Pose options</label>
        <p className="text-xs text-stone-500">Available poses for this captain&apos;s avatar.</p>
        {poses.map((pose, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              name="pose_options"
              value={pose}
              onChange={(e) =>
                setPoses((prev) => {
                  const next = [...prev];
                  next[i] = e.target.value;
                  return next;
                })
              }
              className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
            />
            <button
              type="button"
              onClick={() => setPoses((prev) => prev.filter((_, idx) => idx !== i))}
              className="rounded-lg p-2 text-stone-400 hover:text-red-500"
              aria-label="Remove pose"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setPoses((prev) => [...prev, ""])}
          className="self-start rounded-lg border border-dashed border-stone-300 px-3 py-1.5 text-xs text-stone-500 hover:border-stone-400 hover:text-stone-700"
        >
          + Add pose
        </button>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
        <SaveButton />
        <Button href="/captains" variant="ghost" size="md">
          Cancel
        </Button>
      </div>
    </form>
  );
}
