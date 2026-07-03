"use client";

import { useEffect, useMemo, useState } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { MissionThumb } from "./CampfirePickerModals";
import type { ActivityOption } from "../types";

type Props = {
  open: boolean;
  activities: ActivityOption[];
  selectedIds: number[];
  onClose: () => void;
  onChange: (missionIds: number[]) => void;
};

export function SessionMissionsModal({
  open,
  activities,
  selectedIds,
  onClose,
  onChange,
}: Props) {
  const [filter, setFilter] = useState("");

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setFilter("");
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
    );
  }, [activities, filter]);

  if (!open) return null;

  const selectedSet = new Set(selectedIds);

  function toggle(id: number) {
    const next = selectedSet.has(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange(next);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="session-missions-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(85vh,520px)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-stone-600 bg-stone-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-stone-700 px-4 py-3">
          <h2
            id="session-missions-modal-title"
            className="text-sm font-semibold text-stone-100"
          >
            Missions in scope
          </h2>
          <p className="mt-1 text-xs leading-snug text-stone-500">
            Mission cards and submissions can only use missions you enable here.
          </p>
        </div>

        {activities.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-stone-500">
            No missions available for this club yet.
          </p>
        ) : (
          <>
            <div className="shrink-0 border-b border-stone-800 px-4 py-3">
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-stone-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
                <input
                  type="search"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search missions…"
                  autoFocus
                  className="w-full rounded-lg border border-stone-600/80 bg-stone-950/60 py-2 pl-8 pr-3 text-sm text-stone-100 placeholder:text-stone-600 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/25"
                  aria-label="Search missions"
                />
              </div>
              <p className="mt-2 text-xs text-stone-500">
                <span className="font-medium tabular-nums text-stone-400">
                  {selectedIds.length}
                </span>{" "}
                selected
              </p>
            </div>

            <ul
              className="min-h-0 flex-1 overflow-y-auto p-2"
              role="group"
              aria-label="Available missions"
            >
              {filtered.length === 0 ? (
                <li className="px-2 py-6 text-center text-sm text-stone-500">
                  No missions match your search.
                </li>
              ) : (
                filtered.map((a) => {
                  const checked = selectedSet.has(a.id);
                  const inputId = `modal-mission-${a.id}`;
                  return (
                    <li key={a.id}>
                      <label
                        htmlFor={inputId}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                          checked
                            ? "bg-huntly-forest/15 text-stone-100"
                            : "text-stone-300 hover:bg-stone-800/60"
                        }`}
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(a.id)}
                          className="size-4 shrink-0 rounded border-stone-600 bg-stone-900 text-huntly-forest focus:ring-huntly-sage/40 focus:ring-offset-0"
                        />
                        <MissionThumb image={a.image} title={a.title} />
                        <span className="min-w-0 flex-1 leading-snug">
                          {a.title}
                          {a.release_date ? (
                            <span className="block text-[11px] text-stone-500">
                              Releases {formatReleaseDate(a.release_date)}
                            </span>
                          ) : (
                            <span className="block text-[11px] text-amber-600/90">
                              No release date set
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })
              )}
            </ul>
          </>
        )}

        <div className="flex shrink-0 justify-end border-t border-stone-700 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-huntly-forest px-4 py-2 text-sm font-medium text-huntly-cream hover:bg-huntly-leaf"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function formatReleaseDate(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy.slice(-2)}`;
  }
  return isoDate;
}
