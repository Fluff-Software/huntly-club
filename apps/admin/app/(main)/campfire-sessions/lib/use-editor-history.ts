"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import {
  cloneEditorState,
  loadHistoryFromStorage,
  MAX_UNDO_HISTORY,
  saveHistoryToStorage,
  withSessionDuration,
  type EditorHistory,
  type FullEditorState,
} from "./editor-draft";

/**
 * Undo/redo history manager for the campfire editor.
 *
 * Uses the standard past/present/future snapshot pattern.
 * Every call to `push` records a new history entry immediately (no debounce).
 * The full history is persisted to localStorage on each mutation.
 */

type HistoryStore = {
  past: FullEditorState[];
  present: FullEditorState;
  future: FullEditorState[];
};

function createHistoryManager(
  sessionId: number,
  initial: FullEditorState,
  restored: EditorHistory | null
) {
  let listeners = new Set<() => void>();

  let state: HistoryStore = restored
    ? {
        past: restored.past,
        present: restored.present,
        future: restored.future,
      }
    : { past: [], present: cloneEditorState(initial), future: [] };

  const notify = () => {
    for (const fn of listeners) fn();
  };

  const persist = () => {
    saveHistoryToStorage(sessionId, state);
  };

  return {
    getSnapshot: () => state,

    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    push: (updater: (prev: FullEditorState) => FullEditorState) => {
      const next = withSessionDuration(updater(state.present));
      state = {
        past: [...state.past, state.present].slice(-MAX_UNDO_HISTORY),
        present: next,
        future: [],
      };
      notify();
      persist();
    },

    undo: () => {
      if (state.past.length === 0) return;
      const previous = state.past[state.past.length - 1];
      state = {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future].slice(0, MAX_UNDO_HISTORY),
      };
      notify();
      persist();
    },

    redo: () => {
      if (state.future.length === 0) return;
      const next = state.future[0];
      state = {
        past: [...state.past, state.present].slice(-MAX_UNDO_HISTORY),
        present: next,
        future: state.future.slice(1),
      };
      notify();
      persist();
    },

    /** Update present without recording a new history entry (for intermediate drag/resize steps). */
    replace: (updater: (prev: FullEditorState) => FullEditorState) => {
      state = {
        ...state,
        present: withSessionDuration(updater(state.present)),
      };
      notify();
      persist();
    },

    /** Replace the present without recording history (used for reset/discard). */
    reset: (newPresent: FullEditorState) => {
      state = { past: [], present: cloneEditorState(newPresent), future: [] };
      notify();
      persist();
    },

    canUndo: () => state.past.length > 0,
    canRedo: () => state.future.length > 0,
  };
}

type HistoryManager = ReturnType<typeof createHistoryManager>;

export function useEditorHistory(
  sessionId: number,
  initialState: FullEditorState
) {
  const managerRef = useRef<HistoryManager | null>(null);

  if (managerRef.current === null) {
    const restored = loadHistoryFromStorage(sessionId);
    managerRef.current = createHistoryManager(
      sessionId,
      initialState,
      restored
    );
  }

  const manager = managerRef.current;

  const snapshot = useSyncExternalStore(
    manager.subscribe,
    manager.getSnapshot,
    manager.getSnapshot
  );

  const push = useCallback(
    (updater: (prev: FullEditorState) => FullEditorState) => {
      manager.push(updater);
    },
    [manager]
  );

  const replace = useCallback(
    (updater: (prev: FullEditorState) => FullEditorState) => {
      manager.replace(updater);
    },
    [manager]
  );

  const undo = useCallback(() => manager.undo(), [manager]);
  const redo = useCallback(() => manager.redo(), [manager]);
  const reset = useCallback(
    (s: FullEditorState) => manager.reset(s),
    [manager]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        manager.undo();
      } else if (
        (e.key === "z" && e.shiftKey) ||
        e.key === "y"
      ) {
        e.preventDefault();
        manager.redo();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [manager]);

  return {
    draft: snapshot.present,
    canUndo: snapshot.past.length > 0,
    canRedo: snapshot.future.length > 0,
    push,
    replace,
    undo,
    redo,
    reset,
  };
}
