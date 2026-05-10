import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Button } from "@/components/Button";
import { StatusPill, type ContentStatus } from "@/components/StatusPill";

async function getSeasons() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("seasons")
    .select("id, name, slug, content_status, target_age_min, target_age_max, updated_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function getChapterCounts() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from("chapters").select("season_id, content_status");
  return data ?? [];
}

export default async function SeasonsPage() {
  const [seasons, chapterRows] = await Promise.all([getSeasons(), getChapterCounts()]);

  function chapterStats(seasonId: number) {
    const chapters = chapterRows.filter((c) => c.season_id === seasonId);
    const approved = chapters.filter(
      (c) => c.content_status === "approved" || c.content_status === "published"
    ).length;
    return { total: chapters.length, approved };
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Seasons</h1>
          <p className="mt-1 text-sm text-stone-500">
            Plan, draft, and publish seasons with Compass AI assistance.
          </p>
        </div>
        <Button href="/season-builder/new" size="md" className="sm:shrink-0">
          New season
        </Button>
      </div>

      {seasons.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No seasons yet. Create one to get started.
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white shadow-sm">
          {seasons.map((season) => {
            const { total, approved } = chapterStats(season.id);
            const seasonStatus: ContentStatus =
              season.content_status === "published" ? "published" : "concept";
            return (
              <li
                key={season.id}
                className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:gap-3"
              >
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/season-builder/${season.id}`}
                      className="font-medium text-stone-900 hover:text-huntly-forest focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2 rounded"
                    >
                      {season.name ?? `Season ${season.id}`}
                    </Link>
                    <StatusPill
                      status={seasonStatus}
                      size="sm"
                    />
                  </div>
                  <div className="flex gap-4 text-xs text-stone-500">
                    {total > 0 && (
                      <span>{approved}/{total} chapters approved</span>
                    )}
                    {(season.target_age_min || season.target_age_max) && (
                      <span>Ages {season.target_age_min ?? "?"}–{season.target_age_max ?? "?"}</span>
                    )}
                    {season.updated_at && (
                      <span>Updated {new Date(season.updated_at).toLocaleDateString("en-GB")}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  <Button href={`/season-builder/${season.id}`} variant="primary" size="sm">
                    Open workspace
                  </Button>
                  <Button href={`/seasons/${season.id}/edit`} variant="secondary" size="sm">
                    Edit
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
