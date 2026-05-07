import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { StatusPill, type ContentStatus } from "@/components/StatusPill";
import { CompassPanel } from "@/components/compass/CompassPanel";
import { ChapterEditorForm } from "./ChapterEditorForm";

const ARC_POSITIONS = [
  { value: "setup", label: "Setup" },
  { value: "rising", label: "Rising" },
  { value: "midpoint", label: "Midpoint" },
  { value: "falling", label: "Falling" },
  { value: "climax", label: "Climax" },
  { value: "resolution", label: "Resolution" },
];

async function getChapter(chapterId: number) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("chapters")
    .select(
      "id, season_id, week_number, title, summary, arc_position, body_slides, content_status, draft_payload"
    )
    .eq("id", chapterId)
    .single();
  if (error || !data) return null;
  return data;
}

async function getSeason(seasonId: number) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("seasons")
    .select("id, name, brief, target_age_min, target_age_max")
    .eq("id", seasonId)
    .single();
  return data;
}

async function getChapterActivities(chapterId: number) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("chapter_activities")
    .select("id, order, activity_id, activities(id, title, name, mission_type, content_status)")
    .eq("chapter_id", chapterId)
    .order("order", { ascending: true });
  return data ?? [];
}

export default async function ChapterEditorPage({
  params,
}: {
  params: Promise<{ seasonId: string; chapterId: string }>;
}) {
  const { seasonId, chapterId } = await params;
  const seasonIdNum = parseInt(seasonId);
  const chapterIdNum = parseInt(chapterId);

  const [chapter, season, activities] = await Promise.all([
    getChapter(chapterIdNum),
    getSeason(seasonIdNum),
    getChapterActivities(chapterIdNum),
  ]);

  if (!chapter) notFound();

  const draftMissions = (() => {
    const payload = (chapter as unknown as { draft_payload?: unknown }).draft_payload as
      | { missions?: unknown }
      | null
      | undefined;
    const missions = payload?.missions;
    return Array.isArray(missions) ? missions : [];
  })();

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Link href="/seasons" className="hover:text-stone-700">Seasons</Link>
        <span>/</span>
        <Link href={`/season-builder/${seasonId}`} className="hover:text-stone-700">
          {season?.name ?? `Season ${seasonId}`}
        </Link>
        <span>/</span>
        <span>Week {chapter.week_number}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_288px]">
        {/* Main editor */}
        <div className="flex flex-col gap-6">
          {/* Chapter header */}
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-stone-500">
                  Week {chapter.week_number}
                </span>
                <StatusPill
                  status={(chapter.content_status as ContentStatus) ?? "concept"}
                />
              </div>
              <div className="flex gap-2">
                {chapter.content_status !== "approved" && chapter.content_status !== "published" && (
                  <form
                    action={async () => {
                      "use server";
                      const { advanceChapterStatus } = await import("../../../actions");
                      await advanceChapterStatus(
                        chapterIdNum,
                        seasonIdNum,
                        "in_review"
                      );
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
                    >
                      Submit for review
                    </button>
                  </form>
                )}
                {chapter.content_status === "in_review" && (
                  <form
                    action={async () => {
                      "use server";
                      const { advanceChapterStatus } = await import("../../../actions");
                      await advanceChapterStatus(
                        chapterIdNum,
                        seasonIdNum,
                        "approved"
                      );
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                      Approve chapter ✓
                    </button>
                  </form>
                )}
              </div>
            </div>

            <ChapterEditorForm
              chapterId={chapterIdNum}
              seasonId={seasonIdNum}
              initialTitle={chapter.title ?? ""}
              initialSummary={chapter.summary ?? ""}
              initialArcPosition={chapter.arc_position ?? ""}
              initialSlides={(chapter.body_slides as unknown[]) ?? []}
              arcPositions={ARC_POSITIONS}
            />
          </div>

          {/* Mission strip */}
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-900">
                Missions ({activities.length})
              </h2>
            </div>

            {draftMissions.length > 0 && (
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Draft missions (Compass)
                  </p>
                  <p className="text-xs text-stone-400">
                    {draftMissions.length} saved to chapter draft
                  </p>
                </div>
                <ul className="grid grid-cols-1 gap-2">
                  {draftMissions.map((m, i) => {
                    const mission = m as {
                      title?: string;
                      name?: string;
                      mission_type?: string;
                      estimated_duration?: string;
                      description?: string;
                    } | null;
                    const title =
                      (mission?.title ?? "").trim() ||
                      (mission?.name ?? "").trim() ||
                      `Draft mission ${i + 1}`;
                    return (
                      <li
                        key={`draft-mission-${i}`}
                        className="rounded-xl border border-dashed border-huntly-forest/30 bg-huntly-forest/5 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-900 truncate">
                              {title}
                            </p>
                            {(mission?.mission_type || mission?.estimated_duration) && (
                              <p className="mt-0.5 text-xs text-stone-500">
                                {mission?.mission_type ? (
                                  <span className="capitalize">{mission.mission_type}</span>
                                ) : null}
                                {mission?.mission_type && mission?.estimated_duration ? " · " : null}
                                {mission?.estimated_duration ?? null}
                              </p>
                            )}
                            {mission?.description && (
                              <p className="mt-1 text-xs text-stone-600 line-clamp-2">
                                {mission.description}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            <form
                              action={async () => {
                                "use server";
                                const { discardChapterMissionDraftItem } = await import("../../../actions");
                                const result = await discardChapterMissionDraftItem({
                                  seasonId: seasonIdNum,
                                  chapterId: chapterIdNum,
                                  index: i,
                                });
                                if (result.error) throw new Error(result.error);
                              }}
                            >
                              <button
                                type="submit"
                                className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-50"
                              >
                                Discard
                              </button>
                            </form>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {activities.length === 0 ? (
              <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-8 text-center text-sm text-stone-500">
                No missions yet. Ask Compass to generate missions →
              </p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {activities.map((ca) => {
                  const rawActivity = ca.activities;
                  const activity = (Array.isArray(rawActivity) ? rawActivity[0] : rawActivity) as {
                    id: number;
                    title: string;
                    name: string;
                    mission_type: string | null;
                    content_status: string | null;
                  } | null;
                  if (!activity) return null;
                  return (
                    <li
                      key={ca.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <Link
                          href={`/season-builder/${seasonId}/chapters/${chapterId}/missions/${activity.id}`}
                          className="text-sm font-medium text-stone-900 hover:text-huntly-forest truncate"
                        >
                          {activity.title ?? activity.name}
                        </Link>
                        {activity.mission_type && (
                          <span className="text-xs text-stone-400 capitalize">
                            {activity.mission_type}
                          </span>
                        )}
                      </div>
                      <StatusPill
                        status={(activity.content_status as ContentStatus) ?? "concept"}
                        size="sm"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Compass panel */}
        <aside>
          <CompassPanel
            scope="chapter"
            seasonId={seasonIdNum}
            chapterId={chapterIdNum}
            seasonBrief={season?.brief ?? ""}
            chapterTitle={chapter.title ?? ""}
            chapterSummary={chapter.summary ?? ""}
            arcPosition={chapter.arc_position ?? ""}
            targetAgeMin={season?.target_age_min ?? 5}
            targetAgeMax={season?.target_age_max ?? 10}
          />
        </aside>
      </div>
    </div>
  );
}
