"use client";

import { useEffect, useMemo, useState } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import type { ActivityOption } from "../types";
import {
  CampfireMissionPickerModal,
  type MissionPickerRow,
} from "./CampfirePickerModals";

type Props = {
  missionOptions: ActivityOption[];
  activityId: number | undefined;
  onChange: (activityId: number | undefined) => void;
  onFlowOpenChange?: (open: boolean) => void;
};

function missionSubtitle(activity: ActivityOption): string | undefined {
  if (activity.xp != null) return `${activity.xp} XP`;
  if (activity.description?.trim()) {
    const d = activity.description.trim();
    return d.length > 48 ? `${d.slice(0, 48)}…` : d;
  }
  return undefined;
}

export function MissionCardPicker({
  missionOptions,
  activityId,
  onChange,
  onFlowOpenChange,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    onFlowOpenChange?.(modalOpen);
  }, [modalOpen, onFlowOpenChange]);

  useBodyScrollLock(modalOpen);

  const selectedMission = useMemo(
    () =>
      activityId != null
        ? missionOptions.find((a) => a.id === activityId) ?? null
        : null,
    [missionOptions, activityId]
  );

  const pickerRows: MissionPickerRow[] = useMemo(
    () =>
      [...missionOptions]
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((activity) => ({
          activity,
          subtitle: missionSubtitle(activity),
        })),
    [missionOptions]
  );

  function pickMission(activity: ActivityOption) {
    onChange(activity.id);
    setModalOpen(false);
  }

  return (
    <>
      <div className="space-y-2">
        {selectedMission ? (
          <div className="overflow-hidden rounded-xl ring-1 ring-inset ring-stone-700/80">
            <div className="relative aspect-[4/3] w-full bg-stone-950">
              {selectedMission.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedMission.image}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-stone-800/80">
                  <span className="text-sm font-medium text-stone-500">
                    No mission image
                  </span>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-12">
                <p className="text-sm font-semibold text-white">
                  {selectedMission.title}
                </p>
                {selectedMission.xp != null && (
                  <p className="mt-1 inline-block rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-stone-200">
                    {selectedMission.xp} XP
                  </p>
                )}
              </div>
            </div>
            {selectedMission.description?.trim() && (
              <p className="border-t border-stone-700/80 bg-stone-800/40 px-3 py-2 text-xs leading-snug text-stone-400 line-clamp-2">
                {selectedMission.description.trim()}
              </p>
            )}
            <div className="flex items-center gap-2 border-t border-stone-700/80 bg-stone-800/60 px-2 py-2">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                disabled={missionOptions.length === 0}
                className="flex-1 rounded-lg bg-huntly-forest px-3 py-2 text-xs font-medium text-huntly-cream hover:bg-huntly-leaf disabled:cursor-not-allowed disabled:opacity-40"
              >
                Change mission
              </button>
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="rounded-lg px-3 py-2 text-xs font-medium text-stone-400 ring-1 ring-inset ring-stone-600/80 hover:bg-stone-700/50 hover:text-stone-200"
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={missionOptions.length === 0}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stone-600/80 bg-stone-950/40 px-4 py-8 text-center transition-colors hover:border-stone-500 hover:bg-stone-800/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-stone-800 text-stone-400 ring-1 ring-inset ring-stone-700">
              <svg
                className="size-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"
                />
              </svg>
            </span>
            <span className="text-sm font-medium text-stone-300">
              Choose mission
            </span>
            <span className="max-w-[220px] text-[11px] leading-snug text-stone-500">
              Missions in this session&apos;s scope
            </span>
          </button>
        )}

        {missionOptions.length === 0 && (
          <p className="text-[11px] leading-snug text-stone-600">
            Add missions in the session panel before choosing a mission card.
          </p>
        )}
      </div>

      <CampfireMissionPickerModal
        open={modalOpen}
        title="Choose mission"
        description="This card will show the selected mission in the campfire preview."
        rows={pickerRows}
        emptyMessage="No missions in this session's scope."
        onSelect={pickMission}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
