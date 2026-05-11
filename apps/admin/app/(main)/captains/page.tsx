import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Button } from "@/components/Button";

async function getCaptains() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("captains")
    .select("id, slug, name, avatar_url, pose_options, updated_at")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export default async function CaptainsPage() {
  const captains = await getCaptains();

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Captains</h1>
          <p className="mt-1 text-sm text-stone-500">
            Each captain has a voice guide that Compass uses to generate in-character copy.
          </p>
        </div>
        <Button href="/captains/new" size="md" className="sm:shrink-0">
          New captain
        </Button>
      </div>

      {captains.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No captains yet. Create one to enable Compass voice features.
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white shadow-sm">
          {captains.map((captain) => (
            <li
              key={captain.id}
              className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              <div className="flex items-center gap-3 min-w-0">
                {captain.avatar_url && (
                  <img
                    src={captain.avatar_url}
                    alt={captain.name}
                    className="h-10 w-10 rounded-full object-cover shrink-0"
                  />
                )}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="font-medium text-stone-900">{captain.name}</p>
                  <p className="text-xs text-stone-500 font-mono">{captain.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {captain.pose_options && captain.pose_options.length > 0 && (
                  <span className="text-xs text-stone-400">
                    {captain.pose_options.length} pose{captain.pose_options.length !== 1 ? "s" : ""}
                  </span>
                )}
                <Button href={`/captains/${captain.id}`} variant="secondary" size="sm">
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
