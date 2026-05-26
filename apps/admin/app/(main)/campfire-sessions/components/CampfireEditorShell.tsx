"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useTransition,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ConfirmModal";
import { persistCampfireEditorDraft } from "../actions";
import {
  type ActivityOption,
  type ApprovedPhotoOption,
  type CampfireComponentRow,
  type CampfireSessionRow,
  type CampfireTrackRow,
  type CaptainOption,
} from "../types";
import {
  clearDraftStorage,
  cloneEditorState,
  createTempIdFactory,
  isDraftDirty,
  lowestTempId,
  withSessionDuration,
  type FullEditorState,
} from "../lib/editor-draft";
import { useEditorHistory } from "../lib/use-editor-history";
import { CampfireEditor } from "./CampfireEditor";

export type CampfireEditorShellProps = {
  session: CampfireSessionRow;
  initialTracks: CampfireTrackRow[];
  initialComponents: CampfireComponentRow[];
  activities: ActivityOption[];
  captains: CaptainOption[];
  approvedPhotos: ApprovedPhotoOption[];
};

export function CampfireEditorShell({
  session: initialSession,
  initialTracks,
  initialComponents,
  activities,
  captains,
  approvedPhotos,
}: CampfireEditorShellProps) {
  const router = useRouter();
  const sessionId = initialSession.id;

  const initialState = useMemo(
    () =>
      withSessionDuration({
        session: initialSession,
        tracks: initialTracks,
        components: initialComponents,
      }),
    [initialSession, initialTracks, initialComponents]
  );

  const baselineRef = useRef<FullEditorState>(initialState);
  const pendingServerSyncRef = useRef(false);

  const { draft, canUndo, canRedo, push, replace, undo, redo, reset } =
    useEditorHistory(sessionId, initialState);

  const nextTempId = useRef(
    createTempIdFactory(lowestTempId(draft))
  ).current;

  const [saveError, setSaveError] = useState<string | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();

  useEffect(() => {
    if (!pendingServerSyncRef.current) return;
    pendingServerSyncRef.current = false;
    reset(initialState);
    baselineRef.current = initialState;
    clearDraftStorage(sessionId);
  }, [initialState, sessionId, reset]);

  const isDirty = useMemo(
    () => isDraftDirty(baselineRef.current, draft),
    [draft]
  );

  const updateDraft = useCallback(
    (updater: (prev: FullEditorState) => FullEditorState) => {
      push(updater);
      setSaveError(null);
    },
    [push]
  );

  const replaceDraft = useCallback(
    (updater: (prev: FullEditorState) => FullEditorState) => {
      replace(updater);
      setSaveError(null);
    },
    [replace]
  );

  const handleSave = () => {
    startSaveTransition(async () => {
      setSaveError(null);
      const result = await persistCampfireEditorDraft(
        draft.session.id,
        draft,
        baselineRef.current
      );
      if (result.error) {
        setSaveError(result.error);
        return;
      }
      baselineRef.current = cloneEditorState(draft);
      clearDraftStorage(sessionId);
      pendingServerSyncRef.current = true;
      router.refresh();
    });
  };

  const handleCancel = () => {
    if (!isDirty) return;
    setDiscardConfirmOpen(true);
  };

  const confirmDiscard = () => {
    setDiscardConfirmOpen(false);
    reset(baselineRef.current);
    clearDraftStorage(sessionId);
    setSaveError(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-700 bg-stone-950 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2 text-sm text-stone-400">
          <Link
            href="/campfire-sessions"
            className="shrink-0 hover:text-stone-200"
          >
            Campfire Sessions
          </Link>
          <span className="text-stone-600" aria-hidden>
            /
          </span>
          <span className="truncate font-medium text-stone-100">
            {draft.session.title}
          </span>
          {isDirty && (
            <span className="shrink-0 rounded-full bg-amber-950/80 px-2 py-0.5 text-xs font-medium text-amber-200 ring-1 ring-amber-700/50">
              Unsaved changes
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-stone-700 bg-stone-900 p-0.5">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo || isSaving}
              className="rounded-md px-2 py-1 text-stone-300 hover:bg-stone-700 hover:text-stone-100 disabled:cursor-not-allowed disabled:text-stone-600"
              aria-label="Undo"
              title="Undo (Ctrl+Z)"
            >
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo || isSaving}
              className="rounded-md px-2 py-1 text-stone-300 hover:bg-stone-700 hover:text-stone-100 disabled:cursor-not-allowed disabled:text-stone-600"
              aria-label="Redo"
              title="Redo (Ctrl+Shift+Z)"
            >
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3"
                />
              </svg>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCancel}
            disabled={!isDirty || isSaving}
            className="rounded-lg border border-stone-600 bg-stone-800 px-3 py-1.5 text-sm font-medium text-stone-200 hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="rounded-lg bg-huntly-forest px-3 py-1.5 text-sm font-medium text-huntly-cream hover:bg-huntly-leaf disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {saveError && (
        <div
          className="shrink-0 border-b border-red-900/60 bg-red-950/50 px-4 py-2 text-sm text-red-300"
          role="alert"
        >
          {saveError}
        </div>
      )}

      <CampfireEditor
        draft={draft}
        updateDraft={updateDraft}
        replaceDraft={replaceDraft}
        nextTempId={nextTempId}
        activities={activities}
        captains={captains}
        approvedPhotos={approvedPhotos}
      />

      <ConfirmModal
        open={discardConfirmOpen}
        onClose={() => setDiscardConfirmOpen(false)}
        onConfirm={confirmDiscard}
        title="Discard unsaved changes?"
        message="Your edits to this session will be lost. This cannot be undone."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        variant="danger"
      />
    </div>
  );
}
