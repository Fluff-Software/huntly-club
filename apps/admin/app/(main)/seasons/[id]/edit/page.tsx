import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { updateSeason } from "../../actions";
import { Button } from "@/components/Button";
import { SeasonForm } from "../../SeasonForm";

async function getSeason(id: number) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("seasons").select("*").eq("id", id).single();
  if (error || !data) return null;
  return data;
}

export default async function EditSeasonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const seasonId = parseInt(id, 10);
  if (Number.isNaN(seasonId)) notFound();

  const season = await getSeason(seasonId);
  if (!season) notFound();

  async function submit(formData: FormData) {
    "use server";
    return updateSeason(seasonId, {}, formData);
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold text-stone-900">
        Edit season
      </h1>
      <SeasonForm
        action={submit}
        initial={{
          name: season.name,
          hero_image: season.hero_image,
        }}
      />
      <p className="mt-4">
        <Link
          href={`/seasons/${seasonId}/chapters`}
          className="text-sm font-medium text-huntly-forest hover:underline focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2"
        >
          View chapters
        </Link>
        {" · "}
        <Button href="/seasons" variant="ghost" size="md">
          Back to seasons
        </Button>
      </p>
    </div>
  );
}
