"use client";

import { useEffect, useMemo, useState } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import type {
  ActivityOption,
  ApprovedPhotoOption,
} from "../types";

type Props = {
  approvedPhotos: ApprovedPhotoOption[];
  missionOptions: ActivityOption[];
  photoId: number | undefined;
  onChange: (photoId: number | undefined) => void;
  onFlowOpenChange?: (open: boolean) => void;
};

type MissionWithCount = {
  activity: ActivityOption;
  photoCount: number;
};

function missionsWithApprovedPhotos(
  missionOptions: ActivityOption[],
  approvedPhotos: ApprovedPhotoOption[]
): MissionWithCount[] {
  const counts = new Map<number, number>();
  for (const p of approvedPhotos) {
    if (p.activity_id == null) continue;
    counts.set(p.activity_id, (counts.get(p.activity_id) ?? 0) + 1);
  }
  return missionOptions
    .filter((a) => counts.has(a.id))
    .map((activity) => ({
      activity,
      photoCount: counts.get(activity.id)!,
    }))
    .sort((a, b) => a.activity.title.localeCompare(b.activity.title));
}

export function SubmissionPhotoPicker({
  approvedPhotos,
  missionOptions,
  photoId,
  onChange,
  onFlowOpenChange,
}: Props) {
  const [missionModalOpen, setMissionModalOpen] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [pickedMission, setPickedMission] = useState<ActivityOption | null>(
    null
  );
  const [missionFilter, setMissionFilter] = useState("");

  const flowOpen = missionModalOpen || galleryModalOpen;

  useEffect(() => {
    onFlowOpenChange?.(flowOpen);
  }, [flowOpen, onFlowOpenChange]);

  useBodyScrollLock(flowOpen);

  const missions = useMemo(
    () => missionsWithApprovedPhotos(missionOptions, approvedPhotos),
    [missionOptions, approvedPhotos]
  );

  const selectedPhoto = useMemo(
    () =>
      photoId != null
        ? approvedPhotos.find((p) => p.photo_id === photoId) ?? null
        : null,
    [approvedPhotos, photoId]
  );

  const galleryPhotos = useMemo(() => {
    if (!pickedMission) return [];
    return approvedPhotos.filter((p) => p.activity_id === pickedMission.id);
  }, [approvedPhotos, pickedMission]);

  const filteredMissions = useMemo(() => {
    const q = missionFilter.trim().toLowerCase();
    if (!q) return missions;
    return missions.filter(
      ({ activity }) =>
        activity.title.toLowerCase().includes(q) ||
        activity.name.toLowerCase().includes(q)
    );
  }, [missions, missionFilter]);

  useEffect(() => {
    if (!flowOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (galleryModalOpen) {
        setGalleryModalOpen(false);
        setMissionModalOpen(true);
        return;
      }
      if (missionModalOpen) {
        closeFlow();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [flowOpen, galleryModalOpen, missionModalOpen]);

  function closeFlow() {
    setMissionModalOpen(false);
    setGalleryModalOpen(false);
    setPickedMission(null);
    setMissionFilter("");
  }

  function openMissionPicker() {
    setMissionFilter("");
    setPickedMission(null);
    setGalleryModalOpen(false);
    setMissionModalOpen(true);
  }

  function pickMission(activity: ActivityOption) {
    setPickedMission(activity);
    setMissionModalOpen(false);
    setGalleryModalOpen(true);
  }

  function pickPhoto(id: number) {
    onChange(id);
    closeFlow();
  }

  return (
    <>
      <div className="space-y-2">
        {selectedPhoto ? (
          <div className="overflow-hidden rounded-xl ring-1 ring-inset ring-stone-700/80">
            <div className="relative aspect-[4/3] w-full bg-stone-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhoto.photo_url}
                alt=""
                className="size-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-12">
                <p className="text-sm font-semibold text-white">
                  {selectedPhoto.nickname ?? "Explorer"}
                </p>
                {selectedPhoto.activity_title && (
                  <p className="mt-0.5 text-xs text-stone-300">
                    {selectedPhoto.activity_title}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-stone-700/80 bg-stone-800/60 px-2 py-2">
              <button
                type="button"
                onClick={openMissionPicker}
                disabled={missions.length === 0}
                className="flex-1 rounded-lg bg-huntly-forest px-3 py-2 text-xs font-medium text-huntly-cream hover:bg-huntly-leaf disabled:cursor-not-allowed disabled:opacity-40"
              >
                Change photo
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
            onClick={openMissionPicker}
            disabled={missions.length === 0}
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
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                />
              </svg>
            </span>
            <span className="text-sm font-medium text-stone-300">
              Choose photo
            </span>
            <span className="max-w-[220px] text-[11px] leading-snug text-stone-500">
              Pick a mission, then select an approved submission
            </span>
          </button>
        )}

        {missions.length === 0 && (
          <p className="text-[11px] leading-snug text-stone-600">
            No approved photos for missions in this session&apos;s scope yet.
          </p>
        )}
      </div>

      {missionModalOpen && (
        <PickerModal
          title="Choose mission"
          description="Pick the mission this submission was made for."
          onBackdropClick={closeFlow}
          zClass="z-[60]"
        >
          {missions.length > 6 && (
            <div className="shrink-0 border-b border-stone-800 px-4 py-3">
              <input
                type="search"
                value={missionFilter}
                onChange={(e) => setMissionFilter(e.target.value)}
                placeholder="Search missions…"
                autoFocus
                className={searchInputClass}
                aria-label="Search missions"
              />
            </div>
          )}
          <ul className="min-h-0 flex-1 overflow-y-auto p-2" role="list">
            {filteredMissions.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-stone-500">
                {missions.length === 0
                  ? "No missions with approved photos."
                  : "No missions match your search."}
              </li>
            ) : (
              filteredMissions.map(({ activity, photoCount }) => (
                <li key={activity.id}>
                  <button
                    type="button"
                    onClick={() => pickMission(activity)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-stone-800/70"
                  >
                    <MissionThumb image={activity.image} title={activity.title} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-stone-100">
                        {activity.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-stone-500">
                        {photoCount} approved{" "}
                        {photoCount === 1 ? "photo" : "photos"}
                      </span>
                    </span>
                    <svg
                      className="size-4 shrink-0 text-stone-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m8.25 4.5 7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </button>
                </li>
              ))
            )}
          </ul>
          <ModalFooter>
            <button
              type="button"
              onClick={closeFlow}
              className="rounded-lg px-4 py-2 text-sm font-medium text-stone-400 hover:text-stone-200"
            >
              Cancel
            </button>
          </ModalFooter>
        </PickerModal>
      )}

      {galleryModalOpen && pickedMission && (
        <PickerModal
          title={pickedMission.title}
          description="Select an approved submission photo."
          onBackdropClick={closeFlow}
          zClass="z-[60]"
          wide
        >
          <div className="shrink-0 border-b border-stone-800 px-4 py-2">
            <button
              type="button"
              onClick={() => {
                setGalleryModalOpen(false);
                setMissionModalOpen(true);
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-stone-200"
            >
              <svg
                className="size-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5 8.25 12l7.5-7.5"
                />
              </svg>
              All missions
            </button>
          </div>
          {galleryPhotos.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-stone-500">
              No approved photos for this mission.
            </p>
          ) : (
            <ul
              className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto p-3 sm:grid-cols-3"
              role="listbox"
              aria-label="Approved photos"
            >
              {galleryPhotos.map((photo) => {
                const selected = photo.photo_id === photoId;
                return (
                  <li key={photo.photo_id} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onClick={() => pickPhoto(photo.photo_id)}
                      className={`group relative w-full overflow-hidden rounded-lg text-left ring-2 transition-[ring-color,transform] hover:scale-[1.02] focus:outline-none focus-visible:ring-huntly-sage ${
                        selected
                          ? "ring-huntly-sage"
                          : "ring-transparent hover:ring-stone-600"
                      }`}
                    >
                      <div className="relative aspect-square w-full bg-stone-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.photo_url}
                          alt=""
                          className="size-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-6">
                          <p className="truncate text-xs font-medium text-white">
                            {photo.nickname ?? "Explorer"}
                          </p>
                        </div>
                        {selected && (
                          <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-huntly-forest text-[10px] text-white">
                            ✓
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <ModalFooter>
            <button
              type="button"
              onClick={closeFlow}
              className="rounded-lg px-4 py-2 text-sm font-medium text-stone-400 hover:text-stone-200"
            >
              Cancel
            </button>
          </ModalFooter>
        </PickerModal>
      )}
    </>
  );
}

function MissionThumb({
  image,
  title,
}: {
  image: string | null;
  title: string;
}) {
  return (
    <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-stone-800 ring-1 ring-inset ring-stone-700">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        <span
          className="flex size-full items-center justify-center text-[10px] font-medium text-stone-500"
          aria-hidden
        >
          {title.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function PickerModal({
  title,
  description,
  children,
  onBackdropClick,
  zClass,
  wide,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onBackdropClick: () => void;
  zClass: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-center justify-center bg-black/60 p-4`}
      aria-modal="true"
      role="dialog"
      onClick={onBackdropClick}
    >
      <div
        className={`flex max-h-[min(88vh,640px)] w-full flex-col overflow-hidden rounded-xl border border-stone-600 bg-stone-900 shadow-xl ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-stone-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-stone-100">{title}</h2>
          <p className="mt-1 text-xs leading-snug text-stone-500">
            {description}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 justify-end border-t border-stone-700 px-4 py-3">
      {children}
    </div>
  );
}

const searchInputClass =
  "w-full rounded-lg border border-stone-600/80 bg-stone-950/60 py-2 px-3 text-sm text-stone-100 placeholder:text-stone-600 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/25";
