"use client";

import { useEffect, useState } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { uploadCampfireAudio, uploadCampfireVideo } from "@/lib/upload-actions";
import {
  audioComponentHasFile,
  getAudioComponentData,
  snapAudioDurationMs,
} from "../lib/audio-component";
import {
  getAudioDurationMsFromFile,
  getAudioDurationMsFromUrl,
} from "../lib/audio-duration";
import {
  getVideoDurationMsFromFile,
  getVideoDurationMsFromUrl,
} from "../lib/video-duration";
import {
  formatTimeMs,
  parseTimeInput,
  SNAP_SEC,
  snapMs,
} from "../lib/campfire-timeline";
import {
  COMPONENT_TYPE_LABELS,
  type ActivityOption,
  type ApprovedPhotoOption,
  type CampfireComponentRow,
  type CampfireSessionRow,
  type CaptainOption,
} from "../types";

type Props = {
  open: boolean;
  component: CampfireComponentRow | null;
  session: CampfireSessionRow;
  activities: ActivityOption[];
  captains: CaptainOption[];
  approvedPhotos: ApprovedPhotoOption[];
  onClose: () => void;
  onChange: (comp: CampfireComponentRow) => void;
  onDelete: (id: number) => void;
};

export function CampfireComponentEditModal({
  open,
  component,
  session,
  activities,
  captains,
  approvedPhotos,
  onClose,
  onChange,
  onDelete,
}: Props) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) setUploadError(null);
  }, [open, component?.id]);

  const audioUrl =
    component?.type === "audio"
      ? getAudioComponentData(component).audioUrl
      : undefined;

  const videoUrl =
    component?.type === "video"
      ? ((component.data as Record<string, unknown>).videoUrl as string) || undefined
      : undefined;

  useEffect(() => {
    if (!open || !component || component.type !== "audio" || !audioUrl) return;

    let cancelled = false;
    const comp = component;
    getAudioDurationMsFromUrl(audioUrl)
      .then((ms) => {
        if (cancelled) return;
        const durationMs = snapAudioDurationMs(ms);
        if (durationMs !== comp.duration) {
          onChange({ ...comp, duration: durationMs });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when modal opens / URL changes
  }, [open, component?.id, audioUrl]);

  useEffect(() => {
    if (!open || !component || component.type !== "video" || !videoUrl) return;

    let cancelled = false;
    const comp = component;
    getVideoDurationMsFromUrl(videoUrl)
      .then((ms) => {
        if (cancelled) return;
        const durationMs = snapAudioDurationMs(ms);
        if (durationMs !== comp.duration) {
          onChange({ ...comp, duration: durationMs });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, component?.id, videoUrl]);

  if (!open || !component) return null;

  const data = component.data as Record<string, unknown>;
  const audioLocked =
    component.type === "audio" && audioComponentHasFile(component);
  const videoLocked =
    component.type === "video" && Boolean((data.videoUrl as string)?.trim());
  const missionOptions =
    session.missions.length > 0
      ? activities.filter((a) => session.missions.includes(a.id))
      : activities;

  const title =
    COMPONENT_TYPE_LABELS[component.type] ??
    component.type.replace("_", " ");

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };

  return (
    <>
    <ConfirmModal
      open={deleteConfirmOpen}
      onClose={() => setDeleteConfirmOpen(false)}
      onConfirm={() => {
        setDeleteConfirmOpen(false);
        onDelete(component.id);
        onClose();
      }}
      title="Delete component?"
      message="This component will be removed from the timeline. This cannot be undone."
      confirmLabel="Delete"
      variant="danger"
    />
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="campfire-component-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(90vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-stone-600 bg-stone-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-stone-700 px-4 py-3">
          <h2
            id="campfire-component-modal-title"
            className="text-sm font-semibold uppercase tracking-wide text-stone-100"
          >
            Edit {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <Field label="Start time">
            <input
              type="text"
              value={formatTimeMs(component.start_time)}
              onChange={(e) => {
                const ms = parseTimeInput(e.target.value);
                if (ms != null)
                  onChange({
                    ...component,
                    start_time: snapMs(ms),
                  });
              }}
              className={inputClass}
              placeholder="0.0s or 1:30"
            />
          </Field>
          {audioLocked || videoLocked ? (
            <Field label="Duration">
              <p className="rounded-lg border border-stone-700 bg-stone-800/50 px-3 py-2 text-sm text-stone-300">
                {formatTimeMs(component.duration)}{" "}
                <span className="text-stone-500">(from {audioLocked ? "audio" : "video"} file)</span>
              </p>
            </Field>
          ) : (
            <Field label="Duration (seconds)">
              <input
                type="number"
                min={SNAP_SEC}
                step={SNAP_SEC}
                value={component.duration / 1000}
                onChange={(e) => {
                  const sec = parseFloat(e.target.value);
                  if (!Number.isNaN(sec) && sec > 0)
                    onChange({
                      ...component,
                      duration: snapMs(sec * 1000),
                    });
                }}
                className={inputClass}
              />
            </Field>
          )}

          {component.type === "audio" && (
            <Field label="Audio file">
              <input
                type="file"
                accept="audio/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadError(null);

                  let durationMs = component.duration;
                  let durationReadFailed = false;
                  try {
                    const fileDurationMs =
                      await getAudioDurationMsFromFile(file);
                    durationMs = snapAudioDurationMs(fileDurationMs);
                  } catch {
                    durationReadFailed = true;
                  }

                  const fd = new FormData();
                  fd.set("file", file);
                  const { url, error: upErr } =
                    await uploadCampfireAudio(fd);
                  if (upErr) {
                    setUploadError(upErr);
                    return;
                  }
                  if (url) {
                    onChange({
                      ...component,
                      duration: durationMs,
                      data: { ...data, audioUrl: url },
                    });
                    if (durationReadFailed) {
                      setUploadError(
                        "Audio uploaded, but could not read file length — re-upload or remove the file to set duration manually."
                      );
                    }
                  }
                  e.target.value = "";
                }}
                className="text-xs text-stone-300"
              />
              {(data.audioUrl as string) && (
                <audio
                  src={data.audioUrl as string}
                  controls
                  className="mt-2 w-full"
                />
              )}
            </Field>
          )}

          {component.type === "video" && (
            <>
              <Field label="Display mode">
                <select
                  value={(data.displayMode as string) || "card"}
                  onChange={(e) =>
                    onChange({
                      ...component,
                      data: { ...data, displayMode: e.target.value },
                    })
                  }
                  className={inputClass}
                >
                  <option value="card">Card</option>
                  <option value="fullscreen">Fullscreen</option>
                </select>
              </Field>
              {((data.displayMode as string) || "card") === "card" && (
                <Field label="Ratio">
                  <select
                    value={(data.videoRatio as string) || "original"}
                    onChange={(e) =>
                      onChange({
                        ...component,
                        data: { ...data, videoRatio: e.target.value },
                      })
                    }
                    className={inputClass}
                  >
                    <option value="square">Square</option>
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                    <option value="original">Original</option>
                  </select>
                </Field>
              )}
              <Field label="Video file">
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadError(null);

                    let durationMs = component.duration;
                    let durationReadFailed = false;
                    try {
                      const fileDurationMs =
                        await getVideoDurationMsFromFile(file);
                      durationMs = snapAudioDurationMs(fileDurationMs);
                    } catch {
                      durationReadFailed = true;
                    }

                    const fd = new FormData();
                    fd.set("file", file);
                    const { url, error: upErr } =
                      await uploadCampfireVideo(fd);
                    if (upErr) {
                      setUploadError(upErr);
                      return;
                    }
                    if (url) {
                      onChange({
                        ...component,
                        duration: durationMs,
                        data: { ...data, videoUrl: url, displayMode: data.displayMode || "card" },
                      });
                      if (durationReadFailed) {
                        setUploadError(
                          "Video uploaded, but could not read file length — re-upload or remove the file to set duration manually."
                        );
                      }
                    }
                    e.target.value = "";
                  }}
                  className="text-xs text-stone-300"
                />
                {(data.videoUrl as string) && (
                  <video
                    src={data.videoUrl as string}
                    controls
                    className="mt-2 w-full rounded"
                  />
                )}
              </Field>
            </>
          )}

          {component.type === "captain" && (
            <>
              <Field label="Captain">
                <select
                  value={(data.captainId as number) ?? ""}
                  onChange={(e) => {
                    const id = e.target.value
                      ? parseInt(e.target.value, 10)
                      : undefined;
                    const cap = id
                      ? captains.find((c) => c.id === id)
                      : null;
                    onChange({
                      ...component,
                      data: {
                        ...data,
                        captainId: id,
                        captainSlug: cap?.slug,
                      },
                    });
                  }}
                  className={inputClass}
                >
                  <option value="">Select captain</option>
                  {captains.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

          {component.type === "subtitle" && (
            <Field label="Text">
              <textarea
                value={(data.text as string) ?? ""}
                rows={4}
                onChange={(e) =>
                  onChange({
                    ...component,
                    data: { ...data, text: e.target.value },
                  })
                }
                className={inputClass}
              />
            </Field>
          )}

          {component.type === "mission_card" && (
            <Field label="Mission">
              <select
                value={(data.activityId as number) ?? ""}
                onChange={(e) =>
                  onChange({
                    ...component,
                    data: {
                      ...data,
                      activityId: parseInt(e.target.value, 10),
                    },
                  })
                }
                className={inputClass}
              >
                <option value="">Select mission</option>
                {missionOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {component.type === "submission" && (
            <Field label="Approved photo">
              <select
                value={(data.photoId as number) ?? ""}
                onChange={(e) =>
                  onChange({
                    ...component,
                    data: {
                      ...data,
                      photoId: parseInt(e.target.value, 10),
                    },
                  })
                }
                className={inputClass}
              >
                <option value="">Select photo</option>
                {approvedPhotos.map((p) => (
                  <option key={p.photo_id} value={p.photo_id}>
                    {p.nickname ?? "Explorer"} —{" "}
                    {p.activity_title ?? "Mission"}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {uploadError && (
            <p className="text-xs text-red-400" role="alert">
              {uploadError}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-stone-700 px-4 py-3">
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-300 hover:bg-red-900/50"
          >
            Delete component
          </button>
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
    </>
  );
}

const inputClass =
  "w-full rounded-lg border border-stone-600 bg-stone-800/80 px-3 py-2 text-sm text-stone-100 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage/30";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-stone-400">
        {label}
      </label>
      {children}
    </div>
  );
}
