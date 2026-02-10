import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Button } from "@/components/Button";

async function getSeasons() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("seasons")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export default async function SeasonsPage() {
  const seasons = await getSeasons();

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">Seasons</h1>
        <Button href="/seasons/new" size="md" className="sm:shrink-0">
          New season
        </Button>
      </div>

      {seasons.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No seasons yet. Create one to get started.
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white shadow-sm">
          {seasons.map((season) => (
            <li
              key={season.id}
              className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:gap-3"
            >
              <Link
                href={`/seasons/${season.id}/chapters`}
                className="font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2"
              >
                {season.name ?? `Season ${season.id}`}
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-sm text-stone-500">
                  {new Date(season.created_at).toLocaleDateString("en-GB")}
                </span>
                <Button href={`/seasons/${season.id}/edit`} variant="secondary" size="sm">
                  Edit
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
