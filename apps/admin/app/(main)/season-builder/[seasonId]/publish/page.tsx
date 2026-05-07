import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { publishSeason } from "../../actions";

type CheckItem = {
  label: string;
  passed: boolean;
  detail?: string;
  href?: string;
};

async function getSeason(id: number) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("seasons")
    .select("id, name, brief, content_status, publish_at")
    .eq("id", id)
    .single();
  return data;
}

async function getReadinessChecks(seasonId: number) {
  const supabase = createServerSupabaseClient();

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, week_number, title, body_slides, summary, content_status")
    .eq("season_id", seasonId)
    .order("week_number");

  const checks: CheckItem[] = [];

  // Season brief
  const { data: season } = await supabase
    .from("seasons")
    .select("brief, content_status, publish_at")
    .eq("id", seasonId)
    .single();

  checks.push({
    label: "Season has a brief",
    passed: !!season?.brief,
    href: `/season-builder/${seasonId}/brief`,
  });

  checks.push({
    label: "Season has a start date",
    passed: !!season?.publish_at,
    detail: season?.publish_at
      ? `Week 1 unlocks ${new Date(season.publish_at).toLocaleDateString("en-GB")}`
      : "Required to assign chapter unlock dates",
    href: `/season-builder/${seasonId}/brief`,
  });

  // Chapters
  const chaptersArr = chapters ?? [];

  checks.push({
    label: `Has at least 6 chapters (${chaptersArr.length} found)`,
    passed: chaptersArr.length >= 6,
    href: `/season-builder/${seasonId}`,
  });

  const chaptersWithSlides = chaptersArr.filter((c) => {
    const slides = c.body_slides as unknown[];
    return Array.isArray(slides) && slides.length >= 3;
  });

  checks.push({
    label: `All chapters have ≥3 story slides (${chaptersWithSlides.length}/${chaptersArr.length})`,
    passed: chaptersArr.length > 0 && chaptersWithSlides.length === chaptersArr.length,
    href: chaptersArr.length > 0
      ? `/season-builder/${seasonId}/chapters/${chaptersArr[0]?.id}`
      : undefined,
  });

  const chaptersApproved = chaptersArr.filter(
    (c) => c.content_status === "approved" || c.content_status === "published"
  );

  checks.push({
    label: `All chapters approved (${chaptersApproved.length}/${chaptersArr.length})`,
    passed: chaptersArr.length > 0 && chaptersApproved.length === chaptersArr.length,
  });

  // Activities
  if (chaptersArr.length > 0) {
    const chapterIds = chaptersArr.map((c) => c.id);
    const { data: caRows } = await supabase
      .from("chapter_activities")
      .select("activity_id")
      .in("chapter_id", chapterIds);

    const activityIds = (caRows ?? []).map((r) => r.activity_id);

    if (activityIds.length > 0) {
      const { data: activities } = await supabase
        .from("activities")
        .select("id, safety_notes, steps, content_status")
        .in("id", activityIds);

      const activitiesArr = activities ?? [];
      const withSafety = activitiesArr.filter((a) => !!a.safety_notes);
      const withSteps = activitiesArr.filter((a) => {
        const steps = a.steps as unknown[];
        return Array.isArray(steps) && steps.length > 0;
      });
      const activitiesApproved = activitiesArr.filter(
        (a) => a.content_status === "approved" || a.content_status === "published"
      );

      checks.push({
        label: `All missions have safety notes (${withSafety.length}/${activitiesArr.length})`,
        passed: activitiesArr.length === 0 || withSafety.length === activitiesArr.length,
      });

      checks.push({
        label: `All missions have steps (${withSteps.length}/${activitiesArr.length})`,
        passed: activitiesArr.length === 0 || withSteps.length === activitiesArr.length,
      });

      checks.push({
        label: `All missions approved (${activitiesApproved.length}/${activitiesArr.length})`,
        passed: activitiesArr.length === 0 || activitiesApproved.length === activitiesArr.length,
      });
    }
  }

  // Image assets
  const { data: imageAssets } = await supabase
    .from("image_assets")
    .select("id, status")
    .eq("entity_type", "season_hero");

  const allAssetsApproved = (imageAssets ?? []).every((a) => a.status === "approved");
  const pendingAssets = (imageAssets ?? []).filter((a) => a.status !== "approved");

  if ((imageAssets ?? []).length > 0) {
    checks.push({
      label: `All image assets approved (${pendingAssets.length} pending)`,
      passed: allAssetsApproved,
      href: `/season-builder/${seasonId}/images`,
    });
  }

  return checks;
}

export default async function PublishPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const seasonIdNum = parseInt(seasonId);
  const [season, checks] = await Promise.all([
    getSeason(seasonIdNum),
    getReadinessChecks(seasonIdNum),
  ]);

  if (!season) notFound();

  const allPassed = checks.every((c) => c.passed);
  const passedCount = checks.filter((c) => c.passed).length;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-stone-500">
        <Link href={`/season-builder/${seasonId}`} className="hover:text-stone-700">
          {season.name}
        </Link>
        <span>/</span>
        <span>Publish</span>
      </div>

      <h1 className="mb-2 text-2xl font-semibold text-stone-900">Publish readiness</h1>
      <p className="mb-6 text-sm text-stone-500">
        {passedCount}/{checks.length} checks passing. All must pass before publishing.
      </p>

      {season.publish_at && (
        <div className="mb-8 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
          <span className="font-medium">Season schedule: </span>
          Week 1 unlocks{" "}
          <span className="font-medium">
            {new Date(season.publish_at).toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          . Each chapter unlocks 7 days after the previous.
        </div>
      )}

      <div className="mb-8 flex flex-col gap-2">
        {checks.map((check, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
              check.passed
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <span className={`mt-0.5 text-lg ${check.passed ? "text-green-500" : "text-red-500"}`}>
              {check.passed ? "✓" : "✗"}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  check.passed ? "text-green-800" : "text-red-800"
                }`}
              >
                {check.label}
              </p>
              {check.detail && (
                <p className="text-xs text-stone-500 mt-0.5">{check.detail}</p>
              )}
            </div>
            {!check.passed && check.href && (
              <Link
                href={check.href}
                className="shrink-0 rounded-lg border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                Fix →
              </Link>
            )}
          </div>
        ))}
      </div>

      {season.content_status === "published" ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          ✓ This season is already published.
        </div>
      ) : (
        <form
          action={async () => {
            "use server";
            await publishSeason(seasonIdNum);
          }}
        >
          <button
            type="submit"
            disabled={!allPassed}
            className="rounded-xl bg-huntly-forest px-6 py-3 text-sm font-semibold text-white hover:bg-huntly-leaf disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-huntly-sage"
          >
            {allPassed ? "Publish season →" : `${checks.length - passedCount} checks remaining`}
          </button>
        </form>
      )}
    </div>
  );
}
