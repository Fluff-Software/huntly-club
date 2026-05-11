import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ImageAssetCard } from "./ImageAssetCard";

const STATUS_ORDER = [
  "needs_prompt",
  "prompt_ready",
  "awaiting_image",
  "image_uploaded",
  "approved",
] as const;

type ImageAssetStatus = (typeof STATUS_ORDER)[number];

const STATUS_CONFIG: Record<ImageAssetStatus, { label: string; classes: string }> = {
  needs_prompt: { label: "Needs prompt", classes: "bg-red-50 text-red-600 border-red-200" },
  prompt_ready: { label: "Prompt ready", classes: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  awaiting_image: { label: "Awaiting image", classes: "bg-orange-50 text-orange-700 border-orange-200" },
  image_uploaded: { label: "Image uploaded", classes: "bg-blue-50 text-blue-700 border-blue-200" },
  approved: { label: "Approved", classes: "bg-green-50 text-green-700 border-green-200" },
};

async function getSeason(id: number) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from("seasons").select("id, name").eq("id", id).single();
  return data;
}

async function getImageAssets(seasonId: number) {
  const supabase = createServerSupabaseClient();

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, week_number, title")
    .eq("season_id", seasonId)
    .order("week_number");

  const chapterIds = (chapters ?? []).map((c) => c.id);

  // Fetch season-level assets + chapter-level assets
  const conditions = [`and(entity_type.eq.season_hero,entity_id.eq.${seasonId})`];
  if (chapterIds.length > 0) {
    conditions.push(
      `and(entity_type.in.(chapter,story_slide,mission_step),entity_id.in.(${chapterIds.join(",")}))`
    );
  }

  const { data: assets } = await supabase
    .from("image_assets")
    .select("*")
    .or(conditions.join(","))
    .order("created_at", { ascending: false });

  return { assets: assets ?? [], chapters: chapters ?? [] };
}

export default async function ImageAssetsPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const seasonIdNum = parseInt(seasonId);

  const [season, { assets, chapters }] = await Promise.all([
    getSeason(seasonIdNum),
    getImageAssets(seasonIdNum),
  ]);

  if (!season) notFound();

  const chapterMap = new Map(chapters.map((c) => [c.id, c]));

  const byStatus = STATUS_ORDER.reduce(
    (acc, s) => {
      acc[s] = assets.filter((a) => a.status === s);
      return acc;
    },
    {} as Record<ImageAssetStatus, typeof assets>
  );

  const approvedCount = byStatus.approved.length;

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-stone-500">
        <Link href={`/season-builder/${seasonId}`} className="hover:text-stone-700">
          {season.name}
        </Link>
        <span>/</span>
        <span>Image assets</span>
      </div>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Image assets</h1>
          <p className="mt-1 text-sm text-stone-500">
            {assets.length} assets · {approvedCount} approved ·{" "}
            {assets.length - approvedCount} remaining
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
          <span>🧭</span>
          <span>Compass generates images from approved prompts using Flux</span>
        </div>
      </div>

      {assets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No image assets yet. Compass generates image prompts alongside story pages and missions.
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {STATUS_ORDER.map((status) => {
            const group = byStatus[status];
            if (group.length === 0) return null;
            const config = STATUS_CONFIG[status];
            return (
              <section key={status}>
                <div className="mb-4 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${config.classes}`}
                  >
                    {config.label}
                  </span>
                  <span className="text-sm text-stone-400">{group.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.map((asset) => {
                    const chapter = asset.entity_type === "chapter" || asset.entity_type === "story_slide"
                      ? chapterMap.get(asset.entity_id)
                      : null;
                    return (
                      <ImageAssetCard
                        key={asset.id}
                        asset={asset}
                        seasonId={seasonIdNum}
                        chapterLabel={chapter ? `Week ${chapter.week_number}` : undefined}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
