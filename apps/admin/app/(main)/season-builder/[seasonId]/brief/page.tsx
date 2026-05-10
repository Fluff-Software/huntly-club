import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { BriefForm } from "./BriefForm";

async function getSeason(id: number) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("seasons")
    .select("id, name, brief, concept_summary, theme_keywords, target_age_min, target_age_max, publish_at")
    .eq("id", id)
    .single();
  return data;
}

export default async function SeasonBriefPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const id = parseInt(seasonId);
  const season = await getSeason(id);

  if (!season) notFound();

  const initial = {
    brief: season.brief ?? "",
    concept_summary: season.concept_summary ?? "",
    theme_keywords: ((season.theme_keywords as string[] | null) ?? []).join(", "),
    target_age_min: season.target_age_min ?? 5,
    target_age_max: season.target_age_max ?? 10,
    publish_at: season.publish_at
      ? new Date(season.publish_at).toISOString().slice(0, 10)
      : "",
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-stone-500">
        <Link href={`/season-builder/${seasonId}`} className="hover:text-stone-700">
          {season.name}
        </Link>
        <span>/</span>
        <span>Brief</span>
      </div>

      <h1 className="mb-2 text-2xl font-semibold text-stone-900">Season brief</h1>
      <p className="mb-8 text-sm text-stone-500">
        The brief is the anchor for all Compass prompts. Be specific about themes, tone, arc shape, and what children should discover.
      </p>

      <BriefForm seasonId={id} initial={initial} />
    </div>
  );
}
