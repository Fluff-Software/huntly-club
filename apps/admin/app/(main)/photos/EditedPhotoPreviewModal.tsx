"use client";

import { useEffect, useMemo } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

type Props = {
  open: boolean;
  file: File | null;
  onKeepEditing: () => void;
  onApprove: () => void;
  pending?: boolean;
  error?: string | null;
};

export function EditedPhotoPreviewModal({
  open,
  file,
  onKeepEditing,
  onApprove,
  pending = false,
  error = null,
}: Props) {
  useBodyScrollLock(open);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onKeepEditing();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onKeepEditing]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-0 sm:p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="edited-photo-preview-title"
      onClick={onKeepEditing}
    >
      <div
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[92dvh] sm:max-w-4xl sm:rounded-2xl sm:border sm:border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <h2 id="edited-photo-preview-title" className="text-sm font-semibold text-stone-900">
            Review edit
          </h2>
          <button
            type="button"
            onClick={onKeepEditing}
            disabled={pending}
            className="rounded-md px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-stone-900 p-3 sm:p-4">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Edited photo preview"
                draggable={false}
                className="max-h-[calc(100dvh-18rem)] max-w-full select-none object-contain sm:max-h-[calc(92dvh-18rem)]"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-stone-200">
                No preview available
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onKeepEditing}
              disabled={pending}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              Keep editing
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={pending || !file}
              className="rounded-lg border border-emerald-300 bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {pending ? "Approving…" : "Approve"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

