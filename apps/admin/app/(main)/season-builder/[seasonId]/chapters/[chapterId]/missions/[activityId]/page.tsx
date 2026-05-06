import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { StatusPill, type ContentStatus } from "@/components/StatusPill";
import { CompassPanel } from "@/components/compass/CompassPanel";
import { MissionEditorFields } from "./MissionEditorFields";

async function getActivity(activityId: number) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("activities")
    .select(
      "id, name, title, description, mission_type, safety_notes, content_status, estimated_duration, steps, prep_checklist, intro_captain, intro_captain_pose, intro_dialogue, debrief_question_1, debrief_question_2, optional_items"
    )
    .eq("id", activityId)
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

async function getChapter(chapterId: number) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("chapters")
    .select("id, week_number, title, summary")
    .eq("id", chapterId)
    .single();
  return data;
}

export default async function MissionEditorPage({
  params,
}: {
  params: Promise<{ seasonId: string; chapterId: string; activityId: string }>;
}) {
  const { seasonId, chapterId, activityId } = await params;
  const seasonIdNum = parseInt(seasonId);
  const chapterIdNum = parseInt(chapterId);
  const activityIdNum = parseInt(activityId);

  const [activity, season, chapter] = await Promise.all([
    getActivity(activityIdNum),
    getSeason(seasonIdNum),
    getChapter(chapterIdNum),
  ]);

  if (!activity) notFound();

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-500 flex-wrap">
        <Link href="/seasons" className="hover:text-stone-700">Seasons</Link>
        <span>/</span>
        <Link href={`/season-builder/${seasonId}`} className="hover:text-stone-700">
          {season?.name ?? `Season ${seasonId}`}
        </Link>
        <span>/</span>
        <Link href={`/season-builder/${seasonId}/chapters/${chapterId}`} className="hover:text-stone-700">
          Week {chapter?.week_number ?? chapterId}
        </Link>
        <span>/</span>
        <span>{activity.title ?? activity.name}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_288px]">
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold text-stone-900">
                  {activity.title ?? activity.name}
                </h1>
                <StatusPill
                  status={(activity.content_status as ContentStatus) ?? "concept"}
                />
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/activities/${activityId}/edit`}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
                >
                  Full edit →
                </Link>
              </div>
            </div>

            <MissionEditorFields
              activityId={activityIdNum}
              seasonId={seasonIdNum}
              chapterId={chapterIdNum}
              initialMissionType={(activity.mission_type as "outdoor" | "indoor" | "hybrid") ?? null}
              initialSafetyNotes={activity.safety_notes ?? ""}
              initialDescription={activity.description ?? ""}
              initialEstimatedDuration={activity.estimated_duration ?? ""}
              initialContentStatus={(activity.content_status as ContentStatus) ?? "concept"}
            />
          </div>
        </div>

        <aside>
          <CompassPanel
            scope="mission"
            seasonId={seasonIdNum}
            chapterId={chapterIdNum}
            activityId={activityIdNum}
            seasonBrief={season?.brief ?? ""}
            chapterTitle={chapter?.title ?? ""}
            chapterSummary={chapter?.summary ?? ""}
            targetAgeMin={season?.target_age_min ?? 5}
            targetAgeMax={season?.target_age_max ?? 10}
          />
        </aside>
      </div>
    </div>
  );
}
