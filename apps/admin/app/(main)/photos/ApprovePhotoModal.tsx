"use client";

import { useEffect } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

type Props = {
  open: boolean;
  onCancel: () => void;
  onEdit: () => void;
  onApprove: () => void;
  pending?: boolean;
};

export function ApprovePhotoModal({
  open,
  onCancel,
  onEdit,
  onApprove,
  pending = false,
}: Props) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="approve-photo-title"
      aria-describedby="approve-photo-message"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="approve-photo-title" className="text-lg font-semibold text-stone-900">
          Approve photo?
        </h2>
        <p id="approve-photo-message" className="mt-2 text-sm text-stone-600">
          You can edit the photo first, or approve as-is.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onEdit}
            disabled={pending}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2 disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={pending}
            className="rounded-lg border border-emerald-300 bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:opacity-50"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}

