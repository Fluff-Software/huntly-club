import { redirect } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createChapter } from "../actions";
import { Button } from "@/components/Button";
import { ChapterForm } from "../ChapterForm";

async function getSeason(seasonId: number) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("seasons").select("id, name").eq("id", seasonId).single();
  if (error || !data) return null;
  return data;
}

export default async function NewChapterPage({
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
    const result = await createChapter(seasonId, {}, formData);
    if (result.error) return result;
    redirect(`/seasons/${seasonId}/chapters`);
  }

  return (
    <div>
      <Link
        href={`/seasons/${seasonId}/chapters`}
        className="text-sm font-medium text-stone-500 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-huntly-sage"
      >
        ← {season.name ?? `Season ${season.id}`}
      </Link>
      <h1 className="mt-2 mb-8 text-2xl font-semibold text-stone-900">
        New chapter
      </h1>
      <ChapterForm action={submit} />
      <p className="mt-4">
        <Button href={`/seasons/${seasonId}/chapters`} variant="ghost" size="md">
          Cancel
        </Button>
      </p>
    </div>
  );
}
