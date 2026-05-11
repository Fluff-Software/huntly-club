import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Button } from "@/components/Button";
import { StatusPill, type ContentStatus } from "@/components/StatusPill";
import { CompassPanel } from "@/components/compass/CompassPanel";
import { discardSeasonChapterArcDraftItem, createChapterFromSeasonChapterArcDraftItem, deleteChapter } from "../actions";

const ARC_ICONS: Record<string, string> = {
  setup: "🌱",
  rising: "📈",
  midpoint: "🔄",
  falling: "📉",
  climax: "⚡",
  resolution: "🌟",
};

type ChapterArcDraftItem = {
  week_number?: number;
  title?: string;
  summary?: string;
  arc_position?: string;
  key_themes?: string[];
};

async function getSeason(id: number) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("seasons")
    .select(
      "id, name, slug, brief, concept_summary, theme_keywords, target_age_min, target_age_max, content_status, updated_at, draft_payload"
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}

async function getChapters(seasonId: number) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("chapters")
    .select(
      "id, week_number, title, summary, arc_position, content_status"
    )
    .eq("season_id", seasonId)
    .order("week_number", { ascending: true });
  return data ?? [];
}

export default async function SeasonWorkspacePage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const id = parseInt(seasonId);
  const [season, chapters] = await Promise.all([getSeason(id), getChapters(id)]);

  if (!season) notFound();

  const seasonStatus: ContentStatus =
    season.content_status === "published" ? "published" : "concept";

  const draftChapterArc = (() => {
    const payload = (season as unknown as { draft_payload?: unknown }).draft_payload as
      | { chapter_arc?: ChapterArcDraftItem[] }
      | null
      | undefined;
    const items = payload?.chapter_arc;
    return Array.isArray(items) ? items : [];
  })();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/seasons"
              className="text-sm text-stone-500 hover:text-stone-700"
            >
              Seasons
            </Link>
            <span className="text-stone-400">/</span>
            <h1 className="text-xl font-semibold text-stone-900 truncate">
              {season.name}
            </h1>
            <StatusPill status={seasonStatus} />
          </div>
          {season.concept_summary && (
            <p className="text-sm text-stone-500 mt-1">{season.concept_summary}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            href={`/season-builder/${id}/brief`}
            variant="secondary"
            size="sm"
          >
            Edit brief
          </Button>
          <Button
            href={`/season-builder/${id}/publish`}
            variant="ghost"
            size="sm"
          >
            Publish
          </Button>
        </div>
      </div>

      {/* Three-panel workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[256px_1fr_288px]">
        {/* Left rail — season metadata */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
              Season Brief
            </h2>
            {season.brief ? (
              <p className="text-sm text-stone-700 line-clamp-6 whitespace-pre-line">
                {season.brief}
              </p>
            ) : (
              <p className="text-sm italic text-stone-400">No brief yet.</p>
            )}
            <Link
              href={`/season-builder/${id}/brief`}
              className="mt-3 block text-xs text-huntly-forest hover:underline"
            >
              Edit brief →
            </Link>
          </div>

          {season.theme_keywords && season.theme_keywords.length > 0 && (
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                Themes
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {(season.theme_keywords as string[]).map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full bg-huntly-forest/10 px-2 py-0.5 text-xs text-huntly-forest"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
              Target Ages
            </h2>
            <p className="text-sm text-stone-700">
              {season.target_age_min ?? 5}–{season.target_age_max ?? 10} years
            </p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
              Quick Links
            </h2>
            <div className="flex flex-col gap-1">
              {[
                { href: "images", label: "Image assets" },
                { href: "badges", label: "Badges" },
                { href: "approvals", label: "Approval log" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={`/season-builder/${id}/${href}`}
                  className="rounded-lg px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Centre — chapter strip */}
        <main className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-700">
              Chapters ({chapters.length}/12)
            </h2>
          </div>

          {chapters.length === 0 && draftChapterArc.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center">
              <p className="text-sm text-stone-500">
                No chapters yet. Ask Compass to generate the 12-chapter arc →
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {draftChapterArc.length > 0 &&
                draftChapterArc.map((draft, i) => {
                  const week = draft.week_number ?? i + 1;
                  const arc = draft.arc_position ?? "";
                  const arcLabel = arc
                    ? arc.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                    : "Draft";
                  return (
                    <div
                      key={`draft-${i}`}
                      className="flex flex-col gap-2 rounded-xl border border-dashed border-huntly-forest/30 bg-huntly-forest/5 p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-stone-500">
                          Draft · Week {week}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {arc && (
                            <span title={arc}>
                              {ARC_ICONS[arc] ?? ""}
                            </span>
                          )}
                          <span className="rounded-full border border-huntly-forest/20 bg-white px-2 py-0.5 text-[11px] font-medium text-huntly-forest">
                            {arcLabel}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-stone-900 line-clamp-2">
                        {draft.title ?? `Draft chapter ${week}`}
                      </p>
                      {draft.summary && (
                        <p className="text-xs text-stone-600 line-clamp-2">
                          {draft.summary}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <p className="text-[11px] text-stone-500">
                          Saved to season draft.
                        </p>
                        <div className="flex items-center gap-2">
                          <form
                            action={async () => {
                              "use server";
                              const result = await createChapterFromSeasonChapterArcDraftItem({
                                seasonId: id,
                                index: i,
                              });
                              if (result.error) throw new Error(result.error);
                            }}
                          >
                            <button
                              type="submit"
                              className="rounded-lg border border-huntly-forest/30 bg-white px-2.5 py-1 text-[11px] font-medium text-huntly-forest hover:bg-stone-50"
                            >
                              Create chapter
                            </button>
                          </form>
                          <form
                            action={async () => {
                              "use server";
                              await discardSeasonChapterArcDraftItem({ seasonId: id, index: i });
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
                    </div>
                  );
                })}
              {chapters.map((chapter) => {
                return (
                  <div
                    key={chapter.id}
                    className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-stone-400">
                        Week {chapter.week_number}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {chapter.arc_position && (
                          <span title={chapter.arc_position}>
                            {ARC_ICONS[chapter.arc_position] ?? ""}
                          </span>
                        )}
                        <StatusPill
                          status={
                            (chapter.content_status as ContentStatus) ?? "concept"
                          }
                          size="sm"
                        />
                      </div>
                    </div>
                    <Link
                      href={`/season-builder/${id}/chapters/${chapter.id}`}
                      className="flex-1"
                    >
                      <p className="text-sm font-medium text-stone-900 line-clamp-2 hover:underline">
                        {chapter.title ?? `Chapter ${chapter.week_number}`}
                      </p>
                      {chapter.summary && (
                        <p className="text-xs text-stone-500 line-clamp-2 mt-1">
                          {chapter.summary}
                        </p>
                      )}
                    </Link>
                    <div className="flex justify-end pt-1">
                        <form
                          action={async () => {
                            "use server";
                            await deleteChapter({ seasonId: id, chapterId: chapter.id });
                          }}
                        >
                          <button
                            type="submit"
                            className="text-[11px] text-stone-400 hover:text-red-500 transition-colors"
                          >
                            Remove
                          </button>
                        </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Right rail — Compass panel */}
        <aside>
          <CompassPanel
            scope="season"
            seasonId={id}
            seasonBrief={season.brief ?? ""}
            seasonName={season.name ?? ""}
            targetAgeMin={season.target_age_min ?? 5}
            targetAgeMax={season.target_age_max ?? 10}
          />
        </aside>
      </div>
    </div>
  );
}
