import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Button } from "@/components/Button";

async function getSeasonWithChapters(seasonId: number) {
  const supabase = createServerSupabaseClient();
  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("id", seasonId)
    .single();

  if (seasonError || !season) return null;

  const { data: chapters, error: chaptersError } = await supabase
    .from("chapters")
    .select("id, week_number, title, unlock_date")
    .eq("season_id", seasonId)
    .order("week_number", { ascending: true });

  if (chaptersError) return null;

  return { season, chapters: chapters ?? [] };
}

export default async function ChaptersListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const seasonId = parseInt(id, 10);
  if (Number.isNaN(seasonId)) notFound();

  const data = await getSeasonWithChapters(seasonId);
  if (!data) notFound();

  const { season, chapters } = data;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/seasons"
            className="text-sm font-medium text-stone-500 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-huntly-sage"
          >
            Seasons
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-stone-900">
            {season.name ?? `Season ${season.id}`} – Chapters
          </h1>
        </div>
        <Button href={`/seasons/${seasonId}/chapters/new`} size="md" className="sm:shrink-0">
          New chapter
        </Button>
      </div>

      {chapters.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No chapters yet. Add one for each week (1–12).
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white shadow-sm">
          {chapters.map((ch) => (
            <li
              key={ch.id}
              className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:gap-3"
            >
              <div className="min-w-0">
                <span className="font-medium text-stone-900">
                  Week {ch.week_number}: {ch.title}
                </span>
                <span className="ml-0 block text-sm text-stone-500 sm:ml-3 sm:inline">
                  Unlocks {new Date(ch.unlock_date).toLocaleDateString("en-GB")}
                </span>
              </div>
              <Button
                href={`/seasons/${seasonId}/chapters/${ch.id}/edit`}
                variant="secondary"
                size="sm"
              >
                Edit
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
