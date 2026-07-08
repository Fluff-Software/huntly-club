"use client";

import { useActionState, useEffect } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { createCampfireSession, type CampfireFormState } from "../actions";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CreateCampfireSessionModal({ open, onClose }: Props) {
  useBodyScrollLock(open);

  const [state, formAction, pending] = useActionState<
    CampfireFormState,
    FormData
  >(createCampfireSession, {});

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-stone-900">
          New Campfire Session
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Start with a title. You can schedule and build the timeline in the
          editor.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="campfire-title"
              className="block text-sm font-medium text-stone-700"
            >
              Title
            </label>
            <input
              id="campfire-title"
              name="title"
              type="text"
              required
              autoFocus
              placeholder="e.g. Week 3 Campfire"
              className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
            />
          </div>

          {state.error && (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-huntly-forest px-4 py-2 text-sm font-medium text-huntly-cream hover:bg-huntly-leaf disabled:opacity-50"
            >
              {pending ? "Creating…" : "Create session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
