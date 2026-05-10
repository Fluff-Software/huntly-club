import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { CaptainForm } from "../CaptainForm";
import { updateCaptain, deleteCaptain } from "../actions";

async function getCaptain(id: number) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("captains")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data;
}

export default async function EditCaptainPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const captain = await getCaptain(parseInt(id));
  if (!captain) notFound();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">{captain.name}</h1>
          <p className="mt-1 font-mono text-xs text-stone-500">{captain.slug}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await deleteCaptain(parseInt(id));
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            onClick={(e) => {
              if (!confirm("Delete this captain? This cannot be undone.")) {
                e.preventDefault();
              }
            }}
          >
            Delete
          </button>
        </form>
      </div>
      <CaptainForm
        action={updateCaptain.bind(null, parseInt(id))}
        initial={{
          name: captain.name,
          slug: captain.slug,
          voice_guide: captain.voice_guide,
          avatar_url: captain.avatar_url,
          pose_options: captain.pose_options ?? [],
        }}
      />
    </div>
  );
}
