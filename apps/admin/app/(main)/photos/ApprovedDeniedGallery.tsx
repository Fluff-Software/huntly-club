"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  bulkDenyPhotos,
  bulkMoveToForReview,
  bulkDeletePhotos,
} from "./actions";
import { PhotoCardWithMenu } from "./PhotoCardWithMenu";
import { ConfirmModal } from "./ConfirmModal";
import { DenyReasonModal } from "./DenyReasonModal";

type PhotoRow = {
  photo_id: number;
  photo_url: string;
  uploaded_at: string;
  activity_id: number | null;
  profile_id: number;
  activities: { title: string | null } | null;
  profiles: { nickname: string | null } | null;
};

type Props = {
  photos: PhotoRow[];
  variant: "approved" | "denied";
};

export function ApprovedDeniedGallery({ photos, variant }: Props) {
  const router = useRouter();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [denyReasonOpen, setDenyReasonOpen] = useState(false);

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function handleBulkAction(
    action: () => Promise<{ error?: string }>
  ) {
    setPending(true);
    const result = await action();
    setPending(false);
    if (!result.error) {
      clearSelection();
      if (selectedIds.size === photos.length) exitSelectMode();
      router.refresh();
    }
  }

  const selectedArray = Array.from(selectedIds);
  const hasSelection = selectedArray.length > 0;

  return (
    <div>
      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={async () => {
          setDeleteConfirmOpen(false);
          await handleBulkAction(() => bulkDeletePhotos({}, selectedArray));
        }}
        title="Are you sure?"
        message={`${selectedArray.length} photo(s) will be permanently deleted from the database and storage.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        pending={pending}
      />
      {variant === "approved" && (
        <DenyReasonModal
          open={denyReasonOpen}
          onClose={() => setDenyReasonOpen(false)}
          onConfirm={async (reason) => {
            setDenyReasonOpen(false);
            await handleBulkAction(() =>
              bulkDenyPhotos({}, selectedArray, reason || undefined)
            );
          }}
          title="Deny selected photos"
          message="Please provide a reason for denying these photos."
          pending={pending}
        />
      )}
      <div className="mb-4 flex flex-row items-center justify-end gap-2">
        <label
          htmlFor="select-mode-toggle"
          className="text-sm font-medium text-stone-600"
        >
          Select mode
        </label>
        <button
          id="select-mode-toggle"
          type="button"
          role="switch"
          aria-checked={selectMode}
          onClick={() => {
            setSelectMode((v) => !v);
            if (selectMode) setSelectedIds(new Set());
          }}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2 ${
            selectMode
              ? "border-huntly-forest bg-huntly-forest"
              : "border-stone-300 bg-stone-200"
          }`}
        >
          <span
            className={`pointer-events-none block size-5 rounded-full bg-white shadow ring-0 transition-transform ${
              selectMode ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {hasSelection && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
          <span className="text-sm font-medium text-stone-700">
            {selectedArray.length} selected
          </span>
          {variant === "approved" && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => setDenyReasonOpen(true)}
                className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
              >
                Deny
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  handleBulkAction(() =>
                    bulkMoveToForReview({}, selectedArray)
                  )
                }
                className="text-sm font-medium text-stone-700 hover:underline disabled:opacity-50"
              >
                For Review
              </button>
            </>
          )}
          {variant === "denied" && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  handleBulkAction(() =>
                    bulkMoveToForReview({}, selectedArray)
                  )
                }
                className="text-sm font-medium text-stone-700 hover:underline disabled:opacity-50"
              >
                For Review
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setDeleteConfirmOpen(true)}
                className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
              >
                Delete
              </button>
            </>
          )}
          <button
            type="button"
            onClick={clearSelection}
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            Clear selection
          </button>
        </div>
      )}

      <div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        aria-label={selectMode ? "Select photos" : undefined}
      >
        {photos.map((photo) =>
          selectMode ? (
            <SelectableCard
              key={photo.photo_id}
              photo={photo}
              selected={selectedIds.has(photo.photo_id)}
              onToggle={() => toggleSelect(photo.photo_id)}
            />
          ) : (
            <PhotoCardWithMenu
              key={photo.photo_id}
              photo={photo}
              variant={variant}
            />
          )
        )}
      </div>
    </div>
  );
}

function SelectableCard({
  photo,
  selected,
  onToggle,
}: {
  photo: PhotoRow;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group relative overflow-hidden rounded-xl border-2 bg-white text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2 ${
        selected ? "border-huntly-forest" : "border-stone-200"
      }`}
    >
      <div className="relative aspect-square bg-stone-100">
        <img
          src={photo.photo_url}
          alt="Mission submission"
          className="h-full w-full object-cover"
        />
        <div className="absolute left-2 top-2">
          <span
            className={`flex size-6 items-center justify-center rounded-full border-2 shadow ${
              selected
                ? "border-huntly-forest bg-huntly-forest text-white"
                : "border-stone-300 bg-white"
            }`}
          >
            {selected && (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </span>
        </div>
      </div>
      <div className="border-t border-stone-100 px-3 py-2 text-xs text-stone-600">
        <span className="font-medium text-stone-800 truncate block">
          {photo.activities?.title ?? "—"}
        </span>
        <time
          dateTime={photo.uploaded_at}
          className="mt-0.5 block text-stone-500"
        >
          {new Date(photo.uploaded_at).toLocaleString("en-GB", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </time>
      </div>
    </button>
  );
}
