import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { StatusPill, type ContentStatus } from "@/components/StatusPill";

async function getSeason(id: number) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from("seasons").select("id, name").eq("id", id).single();
  return data;
}

async function getSeasonBadges(seasonId: number) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("badges")
    .select("id, name, description, image_url, badge_type, content_status, chapter_id")
    .eq("season_id", seasonId)
    .order("name");
  return data ?? [];
}

export default async function SeasonBadgesPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const seasonIdNum = parseInt(seasonId);
  const [season, badges] = await Promise.all([
    getSeason(seasonIdNum),
    getSeasonBadges(seasonIdNum),
  ]);

  if (!season) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-stone-500">
        <Link href={`/season-builder/${seasonId}`} className="hover:text-stone-700">
          {season.name}
        </Link>
        <span>/</span>
        <span>Badges</span>
      </div>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Badges</h1>
          <p className="mt-1 text-sm text-stone-500">
            {badges.length} badges linked to this season.
          </p>
        </div>
        <Link
          href="/badges"
          className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
        >
          Manage all badges →
        </Link>
      </div>

      {badges.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No badges linked to this season yet.
          <br />
          <span className="text-xs mt-1 block">
            Link badges by setting season_id on existing badges from the{" "}
            <Link href="/badges" className="text-huntly-forest hover:underline">
              badges page
            </Link>
            .
          </span>
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white shadow-sm">
          {badges.map((badge) => (
            <li
              key={badge.id}
              className="flex items-center gap-3 px-4 py-3 sm:px-6"
            >
              {badge.image_url && (
                <img
                  src={badge.image_url}
                  alt={badge.name}
                  className="h-10 w-10 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900">{badge.name}</p>
                {badge.description && (
                  <p className="text-xs text-stone-500 truncate">{badge.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-stone-400 capitalize">{badge.badge_type}</span>
                <StatusPill
                  status={(badge.content_status as ContentStatus) ?? "concept"}
                  size="sm"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
