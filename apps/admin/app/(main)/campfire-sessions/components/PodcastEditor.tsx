"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { createCampfirePodcastUploadUrl } from "@/lib/upload-actions";
import { getAudioDurationMsFromFile } from "../lib/audio-duration";
import type { FullEditorState } from "../lib/editor-draft";
import {
  DEFAULT_PODCAST_HOST,
  type ActivityOption,
  type AudioComponentData,
  type CampfireComponentRow,
  type CampfireListenStats,
  type CampfireSessionRow,
} from "../types";
import { CampfireDetailsPanel } from "./CampfireDetailsPanel";

const FONT_JUA = "var(--font-jua), sans-serif";
const FONT_COMIC_NEUE = "var(--font-comic-neue), sans-serif";

type Props = {
  draft: FullEditorState;
  updateDraft: (updater: (prev: FullEditorState) => FullEditorState) => void;
  nextTempId: () => number;
  activities: ActivityOption[];
  listenStats: CampfireListenStats | null;
};

function isPodcastMirror(c: CampfireComponentRow): boolean {
  return (
    c.type === "audio" && Boolean((c.data as AudioComponentData).podcastMirror)
  );
}

/**
 * Keeps one timeline audio component in step with the podcast recording so app
 * builds without the podcast player still play it over the campfire.
 */
function syncPodcastMirror(
  state: FullEditorState,
  audioUrl: string | null,
  durationMs: number | null,
  nextTempId: () => number
): FullEditorState {
  const mirror = state.components.find(isPodcastMirror);
  const others = state.components.filter((c) => !isPodcastMirror(c));

  if (!audioUrl || !durationMs || durationMs <= 0) {
    return { ...state, components: others };
  }

  const duration = Math.ceil(durationMs / 100) * 100;
  if (mirror) {
    return {
      ...state,
      components: [
        ...others,
        {
          ...mirror,
          start_time: 0,
          duration,
          data: { ...(mirror.data as AudioComponentData), audioUrl, podcastMirror: true },
        },
      ],
    };
  }

  const firstTrack = [...state.tracks].sort((a, b) => a.position - b.position)[0];
  if (!firstTrack) return state;

  return {
    ...state,
    components: [
      ...others,
      {
        id: nextTempId(),
        session_id: state.session.id,
        track_id: firstTrack.id,
        type: "audio",
        start_time: 0,
        duration,
        data: { audioUrl, podcastMirror: true },
      },
    ],
  };
}

export function PodcastEditor({
  draft,
  updateDraft,
  nextTempId,
  activities,
  listenStats,
}: Props) {
  const { session, components } = draft;
  const audioUrl = session.podcast_audio_url;
  const nonMirrorCount = components.filter((c) => !isPodcastMirror(c)).length;

  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setSession = (updates: Partial<CampfireSessionRow>) => {
    updateDraft((prev) => ({
      ...prev,
      session: { ...prev.session, ...updates },
    }));
  };

  const handleFile = async (file: File) => {
    setUploadError(null);
    setUploading(file.name);
    try {
      let durationMs: number | null = null;
      try {
        durationMs = await getAudioDurationMsFromFile(file);
      } catch {
        durationMs = null;
      }

      const signed = await createCampfirePodcastUploadUrl({
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      });
      if (signed.error || !signed.path || !signed.token || !signed.publicUrl) {
        setUploadError(signed.error ?? "Upload failed");
        return;
      }

      const { error } = await createClient()
        .storage.from("campfire-audio")
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type,
        });
      if (error) {
        setUploadError(error.message);
        return;
      }

      const url = signed.publicUrl;
      updateDraft((prev) =>
        syncPodcastMirror(
          {
            ...prev,
            session: { ...prev.session, podcast_audio_url: url },
          },
          url,
          durationMs,
          nextTempId
        )
      );
      if (durationMs == null) {
        setUploadError(
          "Uploaded, but the browser couldn't read the recording length. Older app versions need it — try exporting as MP3 or M4A."
        );
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const removeRecording = () => {
    updateDraft((prev) =>
      syncPodcastMirror(
        { ...prev, session: { ...prev.session, podcast_audio_url: null } },
        null,
        null,
        nextTempId
      )
    );
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="panel-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-6 lg:flex-row lg:items-start">
          <PodcastPhonePreview
            title={session.title}
            host={session.podcast_host}
            description={session.description}
            audioUrl={audioUrl}
          />

          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <section className="rounded-xl border border-stone-700 bg-stone-900/60 p-5">
              <h2 className="text-sm font-semibold text-stone-100">Recording</h2>
              <p className="mt-1 text-xs leading-snug text-stone-500">
                The audio explorers press play on. MP3 or M4A, up to 100MB.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void handleFile(file);
                }}
              />

              {audioUrl && !uploading ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 rounded-lg bg-stone-950/60 px-3 py-2.5 ring-1 ring-inset ring-stone-700">
                    <span className="text-lg" aria-hidden>
                      🎙️
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-stone-200">
                        {fileNameFromUrl(audioUrl)}
                      </p>
                      <p className="text-[11px] tabular-nums text-stone-500">
                        {formatDuration(session.duration)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-md border border-stone-600 bg-stone-800 px-2.5 py-1 text-xs font-medium text-stone-200 hover:bg-stone-700"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={removeRecording}
                      className="rounded-md px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-950/50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploading != null}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) void handleFile(file);
                  }}
                  className={`mt-4 flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors disabled:cursor-wait ${
                    dragOver
                      ? "border-huntly-sage bg-huntly-sage/10"
                      : "border-stone-700 bg-stone-950/40 hover:border-stone-500"
                  }`}
                >
                  {uploading ? (
                    <>
                      <span className="size-5 animate-spin rounded-full border-2 border-stone-600 border-t-huntly-sage" />
                      <span className="mt-2 text-sm font-medium text-stone-200">
                        Uploading {uploading}…
                      </span>
                      <span className="text-xs text-stone-500">
                        Keep this tab open until it finishes.
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl" aria-hidden>
                        🎙️
                      </span>
                      <span className="mt-1 text-sm font-medium text-stone-200">
                        Drop your recording here
                      </span>
                      <span className="text-xs text-stone-500">or click to choose a file</span>
                    </>
                  )}
                </button>
              )}

              {uploadError && (
                <p className="mt-3 text-xs text-red-300" role="alert">
                  {uploadError}
                </p>
              )}
              {nonMirrorCount > 0 && (
                <p className="mt-3 text-[11px] leading-snug text-amber-300/80">
                  This session still has {nonMirrorCount} timeline item
                  {nonMirrorCount === 1 ? "" : "s"} from the timeline editor. The
                  current app ignores them in podcast mode, but older app
                  versions will still show them.
                </p>
              )}
            </section>

            <ListenStatsCard stats={listenStats} />
          </div>
        </div>
      </div>

      <CampfireDetailsPanel
        session={session}
        activities={activities}
        timelineDurationMs={session.duration ?? undefined}
        onSessionChange={setSession}
      />
    </div>
  );
}

function PodcastPhonePreview({
  title,
  host,
  description,
  audioUrl,
}: {
  title: string;
  host: string | null;
  description: string | null;
  audioUrl: string | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setPositionMs(0);
    setDurationMs(0);
  }, [audioUrl]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el || !audioUrl) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  const skip = (deltaSec: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + deltaSec));
  };

  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  return (
    <div className="mx-auto w-[280px] shrink-0">
      <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wider text-stone-500">
        App preview
      </p>
      <div
        className="relative flex aspect-[9/19.5] flex-col overflow-hidden rounded-[2.25rem] border-[6px] border-stone-800 bg-black bg-cover bg-center shadow-2xl"
        style={{ backgroundImage: "url(/campfire-bg.jpg)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/10 to-black/75" />
        <div className="relative mt-auto px-4 pb-6">
          <div className="rounded-3xl bg-[#FFF8EE]/95 px-4 pb-4 pt-3.5 text-center shadow-lg">
            <span
              className="inline-flex items-center gap-1 rounded-full bg-[#C47A2A]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#8A4B12]"
              style={{ fontFamily: FONT_COMIC_NEUE }}
            >
              <span aria-hidden>📻</span>
              {host?.trim() || DEFAULT_PODCAST_HOST}
            </span>
            <p
              className="mt-1.5 text-lg leading-tight text-[#3B1A06]"
              style={{ fontFamily: FONT_JUA }}
            >
              {title || "Untitled episode"}
            </p>
            {description && (
              <p
                className="mt-1 line-clamp-2 text-[11px] font-bold leading-snug text-[#6B3D1A]"
                style={{ fontFamily: FONT_COMIC_NEUE }}
              >
                {description}
              </p>
            )}

            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-[#3B1A06]/15">
                <div
                  className="h-full rounded-full bg-[#2F6B43]"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] font-bold tabular-nums text-[#6B3D1A]">
                <span>{formatClock(positionMs)}</span>
                <span>{durationMs > 0 ? formatClock(durationMs) : "--:--"}</span>
              </div>
            </div>

            <div className="mt-1 flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={() => skip(-15)}
                disabled={!audioUrl}
                className="text-[11px] font-bold text-[#6B3D1A] disabled:opacity-40"
              >
                −15s
              </button>
              <button
                type="button"
                onClick={toggle}
                disabled={!audioUrl}
                aria-label={playing ? "Pause preview" : "Play preview"}
                className="flex size-14 items-center justify-center rounded-full bg-[#2F6B43] text-2xl text-[#F6EBDD] shadow-md disabled:opacity-40"
              >
                {playing ? "❚❚" : "▶"}
              </button>
              <button
                type="button"
                onClick={() => skip(15)}
                disabled={!audioUrl}
                className="text-[11px] font-bold text-[#6B3D1A] disabled:opacity-40"
              >
                +15s
              </button>
            </div>
          </div>
        </div>
      </div>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setPositionMs(e.currentTarget.currentTime * 1000)}
          onLoadedMetadata={(e) =>
            setDurationMs(
              Number.isFinite(e.currentTarget.duration)
                ? e.currentTarget.duration * 1000
                : 0
            )
          }
        />
      )}
      {!audioUrl && (
        <p className="mt-2 text-center text-[11px] text-stone-500">
          Upload a recording to preview it here.
        </p>
      )}
    </div>
  );
}

function ListenStatsCard({ stats }: { stats: CampfireListenStats | null }) {
  const s = stats;
  const tiles: { label: string; value: string; sub?: string }[] = [
    {
      label: "Opened",
      value: s ? String(s.opens) : "—",
      sub: s ? `${s.unique_users} account${s.unique_users === 1 ? "" : "s"}` : undefined,
    },
    {
      label: "Pressed play",
      value: s ? String(s.plays) : "—",
      sub: s ? `${s.unique_listeners} account${s.unique_listeners === 1 ? "" : "s"}` : undefined,
    },
    {
      label: "Avg listen",
      value: s ? formatDuration(s.avg_listened_ms) : "—",
      sub: "of those who played",
    },
    {
      label: "Finished",
      value: s ? String(s.completions) : "—",
      sub: s && s.plays > 0 ? `${Math.round((s.completions / s.plays) * 100)}% of plays` : undefined,
    },
    {
      label: "Total listening",
      value: s ? formatDuration(s.total_listened_ms) : "—",
    },
    {
      label: "Avg time on screen",
      value: s ? formatDuration(s.avg_view_ms) : "—",
    },
  ];

  return (
    <section className="rounded-xl border border-stone-700 bg-stone-900/60 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-100">Listening</h2>
        <span className="text-[11px] text-stone-500">
          {s?.last_opened_at
            ? `Last opened ${new Date(s.last_opened_at).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : "No listens yet"}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-lg bg-stone-950/50 px-3 py-2.5 ring-1 ring-inset ring-stone-800"
          >
            <dt className="text-[11px] text-stone-500">{t.label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-stone-100">
              {t.value}
            </dd>
            {t.sub && <dd className="text-[11px] text-stone-500">{t.sub}</dd>}
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] leading-snug text-stone-600">
        From the app&apos;s campfire screen. Refresh the page for the latest
        numbers.
      </p>
    </section>
  );
}

function fileNameFromUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? url);
  } catch {
    return url;
  }
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null || ms <= 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
