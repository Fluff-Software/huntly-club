import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";

async function getSeason(id: number) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from("seasons").select("id, name").eq("id", id).single();
  return data;
}

async function getApprovals(seasonId: number) {
  const supabase = createServerSupabaseClient();

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id")
    .eq("season_id", seasonId);

  const chapterIds = (chapters ?? []).map((c) => c.id);

  // Approvals for the season itself
  const { data: seasonApprovals } = await supabase
    .from("approvals")
    .select("id, entity_type, entity_id, from_status, to_status, note, created_at")
    .eq("entity_type", "season")
    .eq("entity_id", seasonId)
    .order("created_at", { ascending: false });

  // Approvals for its chapters
  let chapterApprovals: typeof seasonApprovals = [];
  if (chapterIds.length > 0) {
    const { data } = await supabase
      .from("approvals")
      .select("id, entity_type, entity_id, from_status, to_status, note, created_at")
      .eq("entity_type", "chapter")
      .in("entity_id", chapterIds)
      .order("created_at", { ascending: false });
    chapterApprovals = data ?? [];
  }

  const all = [...(seasonApprovals ?? []), ...chapterApprovals].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return all;
}

async function getRevisions(seasonId: number) {
  const supabase = createServerSupabaseClient();

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id")
    .eq("season_id", seasonId);

  const chapterIds = (chapters ?? []).map((c) => c.id);

  const { data: seasonRevisions } = await supabase
    .from("revisions")
    .select("id, entity_type, entity_id, summary, created_at")
    .eq("entity_type", "season")
    .eq("entity_id", seasonId)
    .order("created_at", { ascending: false })
    .limit(20);

  let chapterRevisions: typeof seasonRevisions = [];
  if (chapterIds.length > 0) {
    const { data } = await supabase
      .from("revisions")
      .select("id, entity_type, entity_id, summary, created_at")
      .eq("entity_type", "chapter")
      .in("entity_id", chapterIds)
      .order("created_at", { ascending: false })
      .limit(20);
    chapterRevisions = data ?? [];
  }

  return [...(seasonRevisions ?? []), ...chapterRevisions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export default async function ApprovalsPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const seasonIdNum = parseInt(seasonId);

  const [season, approvals, revisions] = await Promise.all([
    getSeason(seasonIdNum),
    getApprovals(seasonIdNum),
    getRevisions(seasonIdNum),
  ]);

  if (!season) notFound();

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-stone-500">
        <Link href={`/season-builder/${seasonId}`} className="hover:text-stone-700">
          {season.name}
        </Link>
        <span>/</span>
        <span>Approval log</span>
      </div>

      <h1 className="mb-8 text-2xl font-semibold text-stone-900">Approval log</h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Approvals */}
        <div>
          <h2 className="mb-4 text-sm font-semibold text-stone-700">
            Status transitions ({approvals.length})
          </h2>
          {approvals.length === 0 ? (
            <p className="text-sm text-stone-500">No approvals yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {approvals.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-stone-500 capitalize">
                      {a.entity_type} #{a.entity_id}
                    </span>
                    <span className="text-xs text-stone-400">
                      {a.from_status} → {a.to_status}
                    </span>
                  </div>
                  {a.note && (
                    <p className="mt-1 text-xs text-stone-500 italic">{a.note}</p>
                  )}
                  <p className="mt-1 text-xs text-stone-400">
                    {new Date(a.created_at).toLocaleString("en-GB")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Revisions */}
        <div>
          <h2 className="mb-4 text-sm font-semibold text-stone-700">
            Content revisions ({revisions.length})
          </h2>
          {revisions.length === 0 ? (
            <p className="text-sm text-stone-500">No revisions yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {revisions.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-3"
                >
                  <p className="text-xs font-medium text-stone-700 capitalize">
                    {r.entity_type} #{r.entity_id}
                  </p>
                  {r.summary && (
                    <p className="mt-0.5 text-xs text-stone-500">{r.summary}</p>
                  )}
                  <p className="mt-1 text-xs text-stone-400">
                    {new Date(r.created_at).toLocaleString("en-GB")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
