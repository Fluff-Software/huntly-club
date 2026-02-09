import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { updateChapter, setChapterActivities } from "../../actions";
import { Button } from "@/components/Button";
import { ChapterForm } from "../../ChapterForm";
import { ChapterMissions } from "./ChapterMissions";

async function getSeason(seasonId: number) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("seasons").select("id, name").eq("id", seasonId).single();
  if (error || !data) return null;
  return data;
}

async function getChapter(chapterId: number) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("chapters").select("*").eq("id", chapterId).single();
  if (error || !data) return null;
  return data;
}

async function getChapterActivityIds(chapterId: number) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("chapter_activities")
    .select("activity_id, order")
    .eq("chapter_id", chapterId)
    .order("order", { ascending: true });
  return (data ?? []).map((r) => r.activity_id);
}

async function getAllActivities() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("activities")
    .select("id, name, title")
    .order("id");
  if (error) return [];
  return data ?? [];
}

export default async function EditChapterPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}) {
  const { id, chapterId } = await params;
  const seasonId = parseInt(id, 10);
  const chapterIdNum = parseInt(chapterId, 10);
  if (Number.isNaN(seasonId) || Number.isNaN(chapterIdNum)) notFound();

  const [season, chapter, activityIds, activities] = await Promise.all([
    getSeason(seasonId),
    getChapter(chapterIdNum),
    getChapterActivityIds(chapterIdNum),
    getAllActivities(),
  ]);

  if (!season || !chapter) notFound();

  async function submit(formData: FormData) {
    "use server";
    return updateChapter(chapterIdNum, seasonId, {}, formData);
  }

  return (
    <div>
      <Link
        href={`/seasons/${seasonId}/chapters`}
        className="text-sm font-medium text-stone-500 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-huntly-sage"
      >
        ← {season.name ?? `Season ${season.id}`} chapters
      </Link>
      <h1 className="mt-2 mb-8 text-2xl font-semibold text-stone-900">
        Edit chapter: Week {chapter.week_number}
      </h1>

      <ChapterForm
        action={submit}
        initial={{
          week_number: chapter.week_number,
          title: chapter.title,
          image: chapter.image,
          body: chapter.body,
          unlock_date: chapter.unlock_date,
        }}
      />

      <section className="mt-12 border-t border-stone-200 pt-12">
        <h2 className="mb-4 text-lg font-semibold text-stone-900">Missions</h2>
        <ChapterMissions
          chapterId={chapterIdNum}
          seasonId={seasonId}
          allActivities={activities}
          selectedActivityIds={activityIds}
          setChapterActivities={setChapterActivities}
        />
      </section>
    </div>
  );
}
