"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DiffReviewer } from "./DiffReviewer";
import {
  generateChapterArc,
  type ChapterArcItem,
} from "@/lib/compass/actions/generate-chapter-arc";
import {
  generateStoryPages,
  type StorySlide,
} from "@/lib/compass/actions/generate-story-pages";
import {
  generateMissions,
  type GeneratedMission,
} from "@/lib/compass/actions/generate-missions";

type SeasonScope = {
  scope: "season";
  seasonId: number;
  seasonBrief: string;
  seasonName: string;
  targetAgeMin: number;
  targetAgeMax: number;
};

type ChapterScope = {
  scope: "chapter";
  seasonId: number;
  chapterId: number;
  seasonBrief: string;
  captainSlug?: string;
  chapterTitle: string;
  chapterSummary: string;
  arcPosition: string;
  targetAgeMin: number;
  targetAgeMax: number;
  currentSlides?: StorySlide[];
};

type MissionScope = {
  scope: "mission";
  seasonId: number;
  chapterId: number;
  activityId: number;
  seasonBrief: string;
  captainSlug?: string;
  chapterTitle: string;
  chapterSummary: string;
  targetAgeMin: number;
  targetAgeMax: number;
};

export type CompassPanelProps =
  | SeasonScope
  | ChapterScope
  | MissionScope;

type GenerationResult =
  | { type: "chapter_arc"; generationId: number; output: ChapterArcItem[]; costUsd: number }
  | { type: "story_pages"; generationId: number; output: StorySlide[]; costUsd: number }
  | { type: "missions"; generationId: number; output: GeneratedMission[]; costUsd: number; input: any };

export function CompassPanel(props: CompassPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState<GenerationResult | null>(null);
  const [lastRunInfo, setLastRunInfo] = useState<Record<string, { at: Date; cost: number }>>({});

  function runAction(actionKey: string, fn: () => Promise<GenerationResult>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await fn();
        setGeneration(result);
        setLastRunInfo((prev) => ({
          ...prev,
          [actionKey]: { at: new Date(), cost: result.costUsd },
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Compass encountered an error");
      }
    });
  }

  const actions =
    props.scope === "season"
      ? [
          {
            key: "chapter_arc",
            label: "Generate 12-chapter arc",
            description: "Compass plans the full season arc from your brief.",
            model: "Sonnet",
            estimatedCost: "$0.02–0.05",
            run: () =>
              runAction("chapter_arc", async () => {
                const r = await generateChapterArc({
                  seasonBrief: props.seasonBrief,
                  seasonName: props.seasonName,
                  targetAgeMin: props.targetAgeMin,
                  targetAgeMax: props.targetAgeMax,
                });
                return { type: "chapter_arc" as const, ...r };
              }),
          },
        ]
      : props.scope === "chapter"
      ? [
          {
            key: "story_pages",
            label: "Generate story pages",
            description: "Compass writes 5 story slides from the chapter summary.",
            model: "Sonnet",
            estimatedCost: "$0.01–0.03",
            run: () =>
              runAction("story_pages", async () => {
                const r = await generateStoryPages({
                  seasonBrief: props.seasonBrief,
                  captainSlug: props.captainSlug,
                  chapterTitle: props.chapterTitle,
                  chapterSummary: props.chapterSummary,
                  arcPosition: props.arcPosition,
                  targetAgeMin: props.targetAgeMin,
                  targetAgeMax: props.targetAgeMax,
                });
                return { type: "story_pages" as const, ...r };
              }),
          },
          {
            key: "missions",
            label: "Generate missions",
            description: "Compass creates 2 outdoor + 1 indoor mission with steps.",
            model: "Sonnet",
            estimatedCost: "$0.02–0.06",
            run: () =>
              runAction("missions", async () => {
                const r = await generateMissions({
                  seasonBrief: props.seasonBrief,
                  captainSlug: props.captainSlug,
                  chapterTitle: props.chapterTitle,
                  chapterSummary: props.chapterSummary,
                  targetAgeMin: props.targetAgeMin,
                  targetAgeMax: props.targetAgeMax,
                });
                return { type: "missions" as const, ...r };
              }),
          },
        ]
      : [
          {
            key: "missions",
            label: "Regenerate missions",
            description: "Compass rewrites missions for this chapter.",
            model: "Sonnet",
            estimatedCost: "$0.02–0.06",
            run: () =>
              runAction("missions", async () => {
                const r = await generateMissions({
                  seasonBrief: props.seasonBrief,
                  captainSlug: props.captainSlug,
                  chapterTitle: props.chapterTitle,
                  chapterSummary: props.chapterSummary,
                  targetAgeMin: props.targetAgeMin,
                  targetAgeMax: props.targetAgeMax,
                });
                return { type: "missions" as const, ...r };
              }),
          },
        ];

  return (
    <>
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3">
          <span className="text-lg">🧭</span>
          <div>
            <h2 className="text-sm font-semibold text-stone-900">Compass</h2>
            <p className="text-xs text-stone-500">AI drafting assistant</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col divide-y divide-stone-100">
          {actions.map((action) => {
            const lastRun = lastRunInfo[action.key];
            return (
              <div key={action.key} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-stone-900">{action.label}</p>
                  <p className="text-xs text-stone-500">{action.description}</p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-stone-400">
                    {action.model} · {action.estimatedCost}
                    {lastRun && (
                      <>
                        {" · "}
                        <span title={lastRun.at.toLocaleTimeString()}>
                          ${lastRun.cost.toFixed(4)} last run
                        </span>
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={action.run}
                    disabled={isPending}
                    className="shrink-0 rounded-lg border border-huntly-forest/30 bg-huntly-forest/5 px-3 py-1.5 text-xs font-medium text-huntly-forest transition-colors hover:bg-huntly-forest/10 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-huntly-sage"
                  >
                    {isPending ? "Working…" : "Ask Compass"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="border-t border-stone-100 px-4 py-3">
          <p className="text-xs text-stone-400">
            Compass drafts content for your review. You accept or reject each suggestion before it saves.
          </p>
        </div>
      </div>

      {generation && (
        <DiffReviewer
          generation={generation}
          seasonId={props.seasonId}
          entityId={
            props.scope === "season"
              ? props.seasonId
              : props.scope === "chapter"
              ? props.chapterId
              : props.activityId
          }
          entityType={props.scope === "season" ? "season" : "chapter"}
          onClose={() => setGeneration(null)}
          onAccepted={() => {
            setGeneration(null);
            router.refresh();
          }}
          onUpdateGeneration={(newGen: any) => setGeneration(newGen)}
        />
      )}
    </>
  );
}
