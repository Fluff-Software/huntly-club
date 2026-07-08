import { sessionDurationFromComponents } from "./campfire-timeline";
import type {
  CampfireComponentRow,
  CampfireSessionRow,
  CampfireTrackRow,
} from "../types";

export type FullEditorState = {
  session: CampfireSessionRow;
  tracks: CampfireTrackRow[];
  components: CampfireComponentRow[];
};

export function cloneEditorState(state: FullEditorState): FullEditorState {
  return {
    session: { ...state.session, missions: [...state.session.missions] },
    tracks: state.tracks.map((t) => ({ ...t })),
    components: state.components.map((c) => ({
      ...c,
      data: { ...(c.data as Record<string, unknown>) },
    })),
  };
}

export function withSessionDuration(state: FullEditorState): FullEditorState {
  const duration = sessionDurationFromComponents(state.components);
  return {
    ...state,
    session: {
      ...state.session,
      duration: duration > 0 ? duration : null,
    },
  };
}

export function isDraftDirty(
  baseline: FullEditorState,
  draft: FullEditorState
): boolean {
  return (
    JSON.stringify(normalizeForCompare(baseline)) !==
    JSON.stringify(normalizeForCompare(draft))
  );
}

function normalizeForCompare(state: FullEditorState) {
  return {
    session: {
      title: state.session.title,
      status: state.session.status,
      scheduled_at: state.session.scheduled_at,
      description: state.session.description,
      missions: [...state.session.missions].sort((a, b) => a - b),
    },
    tracks: [...state.tracks]
      .map((t) => ({
        id: t.id,
        name: t.name,
        position: t.position,
        type: t.type,
      }))
      .sort((a, b) => a.position - b.position),
    components: [...state.components]
      .map((c) => ({
        id: c.id,
        track_id: c.track_id,
        type: c.type,
        start_time: c.start_time,
        duration: c.duration,
        data: c.data,
      }))
      .sort((a, b) => a.id - b.id),
  };
}

export function createTempIdFactory(startFrom?: number) {
  let n = startFrom ?? -1;
  return () => {
    n -= 1;
    return n;
  };
}

const STORAGE_KEY_PREFIX = "campfire-draft-";
const HISTORY_KEY_PREFIX = "campfire-history-";
export const MAX_UNDO_HISTORY = 50;

function storageKey(sessionId: number): string {
  return `${STORAGE_KEY_PREFIX}${sessionId}`;
}

function historyKey(sessionId: number): string {
  return `${HISTORY_KEY_PREFIX}${sessionId}`;
}

export type EditorHistory = {
  past: FullEditorState[];
  present: FullEditorState;
  future: FullEditorState[];
};

export function saveDraftToStorage(
  sessionId: number,
  draft: FullEditorState
): void {
  try {
    localStorage.setItem(storageKey(sessionId), JSON.stringify(draft));
  } catch {
    // quota exceeded or unavailable
  }
}

export function loadDraftFromStorage(
  sessionId: number
): FullEditorState | null {
  try {
    const raw = localStorage.getItem(storageKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FullEditorState;
    if (!parsed?.session || !Array.isArray(parsed.tracks) || !Array.isArray(parsed.components)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveHistoryToStorage(
  sessionId: number,
  history: EditorHistory
): void {
  try {
    localStorage.setItem(historyKey(sessionId), JSON.stringify(history));
  } catch {
    // quota exceeded — try trimming history
    try {
      const trimmed: EditorHistory = {
        past: history.past.slice(-20),
        present: history.present,
        future: history.future.slice(0, 20),
      };
      localStorage.setItem(historyKey(sessionId), JSON.stringify(trimmed));
    } catch {
      // still too large, just save present
      try {
        const minimal: EditorHistory = {
          past: [],
          present: history.present,
          future: [],
        };
        localStorage.setItem(historyKey(sessionId), JSON.stringify(minimal));
      } catch {
        // give up
      }
    }
  }
}

export function loadHistoryFromStorage(
  sessionId: number
): EditorHistory | null {
  try {
    const raw = localStorage.getItem(historyKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EditorHistory;
    if (
      !parsed?.present?.session ||
      !Array.isArray(parsed.present.tracks) ||
      !Array.isArray(parsed.present.components) ||
      !Array.isArray(parsed.past) ||
      !Array.isArray(parsed.future)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraftStorage(sessionId: number): void {
  try {
    localStorage.removeItem(storageKey(sessionId));
    localStorage.removeItem(historyKey(sessionId));
  } catch {
    // unavailable
  }
}

/** Find the lowest temp ID in a draft so new temp IDs don't collide. */
export function lowestTempId(state: FullEditorState): number {
  let min = 0;
  for (const t of state.tracks) if (t.id < min) min = t.id;
  for (const c of state.components) if (c.id < min) min = c.id;
  return min;
}
