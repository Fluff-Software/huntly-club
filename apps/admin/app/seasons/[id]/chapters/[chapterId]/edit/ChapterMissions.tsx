"use client";

import { useTransition } from "react";
import { setChapterActivities } from "../../actions";

type Activity = { id: number; name: string; title: string };

type Props = {
  chapterId: number;
  seasonId: number;
  allActivities: Activity[];
  selectedActivityIds: number[];
  setChapterActivities: typeof setChapterActivities;
};

export function ChapterMissions({
  chapterId,
  seasonId,
  allActivities,
  selectedActivityIds,
  setChapterActivities,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const selected = selectedActivityIds
    .map((id) => allActivities.find((a) => a.id === id))
    .filter(Boolean) as Activity[];
  const available = allActivities.filter((a) => !selectedActivityIds.includes(a.id));

  function add(activityId: number) {
    startTransition(async () => {
      await setChapterActivities(chapterId, seasonId, [...selectedActivityIds, activityId]);
    });
  }

  function remove(activityId: number) {
    startTransition(async () => {
      await setChapterActivities(
        chapterId,
        seasonId,
        selectedActivityIds.filter((id) => id !== activityId)
      );
    });
  }

  function moveUp(index: number) {
    if (index <= 0) return;
    const next = [...selectedActivityIds];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    startTransition(async () => {
      await setChapterActivities(chapterId, seasonId, next);
    });
  }

  function moveDown(index: number) {
    if (index >= selectedActivityIds.length - 1) return;
    const next = [...selectedActivityIds];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    startTransition(async () => {
      await setChapterActivities(chapterId, seasonId, next);
    });
  }

  return (
    <div className="space-y-4">
      {selected.length > 0 && (
        <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {selected.map((act, index) => (
            <li
              key={act.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <span className="text-sm font-medium text-stone-900">
                {index + 1}. {act.title}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveUp(index)}
                  disabled={index === 0 || isPending}
                  className="rounded px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 disabled:opacity-50"
                  aria-label="Move up"
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(index)}
                  disabled={index === selected.length - 1 || isPending}
                  className="rounded px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 disabled:opacity-50"
                  aria-label="Move down"
                >
                  Down
                </button>
                <button
                  type="button"
                  onClick={() => remove(act.id)}
                  disabled={isPending}
                  className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 ? (
        <div className="flex items-center gap-2">
          <label htmlFor="add-mission" className="text-sm font-medium text-stone-700">
            Add mission:
          </label>
          <select
            id="add-mission"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
            value=""
            onChange={(e) => {
              const id = parseInt(e.target.value, 10);
              if (id) add(id);
              e.target.value = "";
            }}
            disabled={isPending}
          >
            <option value="">Choose activity…</option>
            {available.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>
      ) : (
        allActivities.length === 0 && (
          <p className="text-sm text-stone-500">No activities in the system. Add some in Activities first.</p>
        )
      )}

      {isPending && (
        <p className="text-sm text-stone-500">Updating…</p>
      )}
    </div>
  );
}
