import { createServerSupabaseClient } from "@/lib/supabase-server";

async function getStats() {
  const supabase = createServerSupabaseClient();

  const [profilesRes, seasonsRes, chaptersRes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("seasons").select("id", { count: "exact", head: true }),
    supabase.from("chapters").select("id", { count: "exact", head: true }),
  ]);

  return {
    users: profilesRes.count ?? 0,
    seasons: seasonsRes.count ?? 0,
    chapters: chaptersRes.count ?? 0,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold text-stone-900">
        Dashboard
      </h1>
      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard label="Total users" value={stats.users} />
        <StatCard label="Seasons" value={stats.seasons} />
        <StatCard label="Chapters" value={stats.chapters} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-huntly-forest">{value}</p>
    </div>
  );
}
