"use client";

import { useState, useTransition } from "react";
import type { ChapterArcItem } from "@/lib/compass/actions/generate-chapter-arc";
import type { StorySlide } from "@/lib/compass/actions/generate-story-pages";
import type { GeneratedMission } from "@/lib/compass/actions/generate-missions";
import { applyCompassGeneration, acceptCompassStoryPages } from "@/app/(main)/season-builder/actions";

type ChapterArcGeneration = {
  type: "chapter_arc";
  generationId: number;
  output: ChapterArcItem[];
  costUsd: number;
};

type StoryPagesGeneration = {
  type: "story_pages";
  generationId: number;
  output: StorySlide[];
  costUsd: number;
};

type MissionsGeneration = {
  type: "missions";
  generationId: number;
  output: GeneratedMission[];
  costUsd: number;
  input?: any;
};

type Generation = ChapterArcGeneration | StoryPagesGeneration | MissionsGeneration;

type Props = {
  generation: Generation;
  seasonId: number;
  entityId: number;
  entityType: "season" | "chapter" | "activity";
  onClose: () => void;
  onAccepted: () => void;
  onUpdateGeneration?: (newGen: any) => void;
};

export function DiffReviewer({ generation, seasonId, entityId, entityType, onClose, onAccepted, onUpdateGeneration }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (generation.type === "chapter_arc") {
    return (
      <ChapterArcReviewer
        generation={generation}
        seasonId={seasonId}
        entityId={entityId}
        isPending={isPending}
        startTransition={startTransition}
        error={error}
        setError={setError}
        onClose={onClose}
        onAccepted={onAccepted}
      />
    );
  }

  if (generation.type === "story_pages") {
    return (
      <StoryPagesReviewer
        generation={generation}
        seasonId={seasonId}
        entityId={entityId}
        isPending={isPending}
        startTransition={startTransition}
        error={error}
        setError={setError}
        onClose={onClose}
        onAccepted={onAccepted}
      />
    );
  }

  if (generation.type === "missions") {
    return (
      <MissionsReviewer
        generation={generation}
        seasonId={seasonId}
        entityId={entityId}
        isPending={isPending}
        startTransition={startTransition}
        error={error}
        setError={setError}
        onClose={onClose}
        onAccepted={onAccepted}
        onUpdateGeneration={onUpdateGeneration}
      />
    );
  }

  return null;
}

// ── Shared modal wrapper ──────────────────────────────────────────────────────

function Modal({
  title,
  costUsd,
  onClose,
  children,
  footer,
}: {
  title: string;
  costUsd: number;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              🧭 {title}
            </h2>
            <p className="text-xs text-stone-500">
              Cost: ${costUsd.toFixed(4)} · Review and accept or reject each item.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-stone-400 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-huntly-sage"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">{children}</div>

        <div className="border-t border-stone-200 px-6 py-4">{footer}</div>
      </div>
    </div>
  );
}

// ── Chapter Arc Reviewer ──────────────────────────────────────────────────────

type ReviewerCommonProps = {
  seasonId: number;
  entityId: number;
  isPending: boolean;
  startTransition: (fn: () => void) => void;
  error: string | null;
  setError: (e: string | null) => void;
  onClose: () => void;
  onAccepted: () => void;
  onUpdateGeneration?: (newGen: any) => void;
};

function ChapterArcReviewer({
  generation,
  isPending,
  startTransition,
  error,
  setError,
  onClose,
  onAccepted,
  seasonId,
}: { generation: ChapterArcGeneration } & ReviewerCommonProps) {
  const [accepted, setAccepted] = useState<Record<number, boolean>>(
    Object.fromEntries(generation.output.map((_, i) => [i, true]))
  );
  const [edits, setEdits] = useState<Record<number, ChapterArcItem>>(
    Object.fromEntries(generation.output.map((item, i) => [i, { ...item }]))
  );

  const acceptedItems = Object.entries(accepted)
    .filter(([, v]) => v)
    .map(([i]) => edits[parseInt(i)]);

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await applyCompassGeneration({
        generationId: generation.generationId,
        entityType: "season",
        entityId: seasonId,
        seasonId,
        acceptedFields: { draft_payload: { chapter_arc: acceptedItems } },
        summary: `Compass: accepted ${acceptedItems.length} chapter arc items`,
      });
      if (result.error) {
        setError(result.error);
      } else {
        onAccepted();
      }
    });
  }

  return (
    <Modal
      title="Chapter Arc Review"
      costUsd={generation.costUsd}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-4">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-stone-500">
              {acceptedItems.length}/{generation.output.length} accepted
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={isPending || acceptedItems.length === 0}
              className="rounded-lg bg-huntly-forest px-4 py-2 text-sm font-medium text-white hover:bg-huntly-leaf disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Accept & save draft"}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 pb-2 border-b border-stone-100">
          <button
            type="button"
            className="text-xs text-huntly-forest hover:underline"
            onClick={() =>
              setAccepted(Object.fromEntries(generation.output.map((_, i) => [i, true])))
            }
          >
            Accept all
          </button>
          <span className="text-stone-300">·</span>
          <button
            type="button"
            className="text-xs text-stone-500 hover:underline"
            onClick={() =>
              setAccepted(Object.fromEntries(generation.output.map((_, i) => [i, false])))
            }
          >
            Reject all
          </button>
        </div>
        {generation.output.map((item, i) => (
          <div
            key={i}
            className={`rounded-xl border p-3 transition-colors ${
              accepted[i]
                ? "border-huntly-forest/20 bg-huntly-forest/5"
                : "border-stone-200 bg-stone-50 opacity-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={!!accepted[i]}
                onChange={(e) =>
                  setAccepted((prev) => ({ ...prev, [i]: e.target.checked }))
                }
                className="mt-1 h-4 w-4 rounded border-stone-300 text-huntly-forest focus:ring-huntly-sage"
              />
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-stone-500">
                    Week {item.week_number}
                  </span>
                  <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-600">
                    {item.arc_position}
                  </span>
                </div>
                <input
                  type="text"
                  value={edits[i]?.title ?? item.title}
                  onChange={(e) =>
                    setEdits((prev) => ({
                      ...prev,
                      [i]: { ...prev[i], title: e.target.value },
                    }))
                  }
                  className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-sm font-medium text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
                />
                <textarea
                  rows={2}
                  value={edits[i]?.summary ?? item.summary}
                  onChange={(e) =>
                    setEdits((prev) => ({
                      ...prev,
                      [i]: { ...prev[i], summary: e.target.value },
                    }))
                  }
                  className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-600 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
                />
                {item.key_themes && (
                  <div className="flex flex-wrap gap-1">
                    {item.key_themes.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-white border border-stone-200 px-2 py-0.5 text-xs text-stone-500"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

      </div>
    </Modal>
  );
}

// ── Story Pages Reviewer ──────────────────────────────────────────────────────

function StoryPagesReviewer({
  generation,
  isPending,
  startTransition,
  error,
  setError,
  onClose,
  onAccepted,
  seasonId,
  entityId,
}: { generation: StoryPagesGeneration } & ReviewerCommonProps) {
  const [accepted, setAccepted] = useState<Record<number, boolean>>(
    Object.fromEntries(generation.output.map((_, i) => [i, true]))
  );
  const [edits, setEdits] = useState<Record<number, StorySlide>>(
    Object.fromEntries(generation.output.map((item, i) => [i, { ...item }]))
  );

  const acceptedSlides = Object.entries(accepted)
    .filter(([, v]) => v)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([i]) => edits[parseInt(i)]);

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptCompassStoryPages({
        generationId: generation.generationId,
        seasonId,
        chapterId: entityId,
        slides: acceptedSlides,
      });
      if (result.error) setError(result.error);
      else onAccepted();
    });
  }

  return (
    <Modal
      title="Story Pages Review"
      costUsd={generation.costUsd}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-4">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-stone-500">
              {acceptedSlides.length}/{generation.output.length} slides
            </span>
            <button type="button" onClick={onClose} className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50">
              Discard
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={isPending || acceptedSlides.length === 0}
              className="rounded-lg bg-huntly-forest px-4 py-2 text-sm font-medium text-white hover:bg-huntly-leaf disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Accept & save"}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 pb-2 border-b border-stone-100">
          <button type="button" className="text-xs text-huntly-forest hover:underline" onClick={() => setAccepted(Object.fromEntries(generation.output.map((_, i) => [i, true])))}>Accept all</button>
          <span className="text-stone-300">·</span>
          <button type="button" className="text-xs text-stone-500 hover:underline" onClick={() => setAccepted(Object.fromEntries(generation.output.map((_, i) => [i, false])))}>Reject all</button>
        </div>
        {generation.output.map((slide, i) => (
          <div
            key={i}
            className={`rounded-xl border p-3 transition-colors ${
              accepted[i] ? "border-huntly-forest/20 bg-huntly-forest/5" : "border-stone-200 bg-stone-50 opacity-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={!!accepted[i]}
                onChange={(e) => setAccepted((prev) => ({ ...prev, [i]: e.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-stone-300 text-huntly-forest focus:ring-huntly-sage"
              />
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-stone-500">Slide {i + 1}</span>
                  <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-600">{slide.type}</span>
                </div>
                <textarea
                  rows={3}
                  value={edits[i]?.value ?? slide.value}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [i]: { ...prev[i], value: e.target.value } }))}
                  className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
                />
                {slide.image_prompt && (
                  <p className="text-xs text-stone-400 italic">
                    Image prompt: {slide.image_prompt}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

      </div>
    </Modal>
  );
}

// ── Missions Reviewer ─────────────────────────────────────────────────────────

import { generateMissions } from "@/lib/compass/actions/generate-missions";

function MissionsReviewer({
  generation,
  isPending,
  startTransition,
  error,
  setError,
  onClose,
  onAccepted,
  onUpdateGeneration,
  seasonId,
  entityId,
}: { generation: MissionsGeneration } & ReviewerCommonProps) {
  const [accepted, setAccepted] = useState<Record<number, boolean>>(
    Object.fromEntries(generation.output.map((_, i) => [i, true]))
  );
  const [refinePrompt, setRefinePrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  const acceptedMissions = Object.entries(accepted)
    .filter(([, v]) => v)
    .map(([i]) => generation.output[parseInt(i)]);

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await applyCompassGeneration({
        generationId: generation.generationId,
        entityType: "chapter",
        entityId,
        seasonId,
        acceptedFields: { draft_payload: { missions: acceptedMissions } },
        summary: `Compass: accepted ${acceptedMissions.length} missions as draft`,
      });
      if (result.error) setError(result.error);
      else onAccepted();
    });
  }

  async function handleRefine() {
    if (!refinePrompt.trim() || !generation.input || !onUpdateGeneration) return;
    setError(null);
    setIsRefining(true);
    try {
      const result = await generateMissions({
        ...generation.input,
        refinement: {
          previousMissions: generation.output,
          prompt: refinePrompt,
        },
      });
      setRefinePrompt("");
      onUpdateGeneration({ type: "missions", ...result });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refine missions");
    } finally {
      setIsRefining(false);
    }
  }

  return (
    <Modal
      title="Missions Review"
      costUsd={generation.costUsd}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-4">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <p className="text-xs text-stone-500">
            Accepted missions are saved as a draft. You&apos;ll create the actual activity records from the chapter editor.
          </p>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button type="button" onClick={onClose} className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50">Discard</button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={isPending || acceptedMissions.length === 0}
              className="rounded-lg bg-huntly-forest px-4 py-2 text-sm font-medium text-white hover:bg-huntly-leaf disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Accept & save draft"}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 pb-2 border-b border-stone-100">
          <button type="button" className="text-xs text-huntly-forest hover:underline" onClick={() => setAccepted(Object.fromEntries(generation.output.map((_, i) => [i, true])))}>Accept all</button>
          <span className="text-stone-300">·</span>
          <button type="button" className="text-xs text-stone-500 hover:underline" onClick={() => setAccepted(Object.fromEntries(generation.output.map((_, i) => [i, false])))}>Reject all</button>
        </div>
        {generation.output.map((mission, i) => (
          <div
            key={i}
            className={`rounded-xl border p-4 transition-colors ${
              accepted[i] ? "border-huntly-forest/20 bg-huntly-forest/5" : "border-stone-200 bg-stone-50 opacity-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={!!accepted[i]}
                onChange={(e) => setAccepted((prev) => ({ ...prev, [i]: e.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-stone-300 text-huntly-forest focus:ring-huntly-sage"
              />
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-stone-900">{mission.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    mission.mission_type === "outdoor"
                      ? "bg-green-100 text-green-700"
                      : mission.mission_type === "indoor"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-purple-100 text-purple-700"
                  }`}>
                    {mission.mission_type}
                  </span>
                  <span className="text-xs text-stone-400">{mission.estimated_duration}</span>
                </div>
                <p className="text-xs text-stone-600">{mission.description}</p>
                {mission.safety_notes && (
                  <p className="text-xs text-orange-600">⚠️ {mission.safety_notes}</p>
                )}
                {mission.steps && (
                  <p className="text-xs text-stone-400">{mission.steps.length} steps</p>
                )}
                {mission.supplies && mission.supplies.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {mission.supplies.map((s) => (
                      <span key={s.name} className="rounded-full bg-white border border-stone-200 px-2 py-0.5 text-xs text-stone-500">
                        {s.required ? "●" : "○"} {s.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Refinement Area */}
        {generation.input && onUpdateGeneration && (
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <label className="text-xs font-semibold text-stone-700">Refine with AI</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Make the outdoor missions focus more on finding bugs..."
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleRefine();
                  }
                }}
                disabled={isPending || isRefining}
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage disabled:bg-stone-100"
              />
              <button
                type="button"
                onClick={handleRefine}
                disabled={isPending || isRefining || !refinePrompt.trim()}
                className="shrink-0 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
              >
                {isRefining ? "Refining…" : "Refine"}
              </button>
            </div>
            <p className="text-xs text-stone-500">
              Compass will read these generated missions and adjust them based on your feedback.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
