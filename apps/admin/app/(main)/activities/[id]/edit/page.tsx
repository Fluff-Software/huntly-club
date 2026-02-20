import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { updateActivity } from "../../actions";
import { getCategories } from "@/app/(main)/categories/actions";
import { Button } from "@/components/Button";
import { ActivityForm } from "../../ActivityForm";

async function getActivity(id: number) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}

function toCategoryIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is number => typeof x === "number" && x > 0);
}

export default async function EditActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activityId = parseInt(id, 10);
  if (Number.isNaN(activityId)) notFound();

  const [activity, categoriesList] = await Promise.all([
    getActivity(activityId),
    getCategories(),
  ]);
  if (!activity) notFound();

  const categoryOptions = categoriesList.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
  }));

  async function submit(formData: FormData) {
    "use server";
    return updateActivity(activityId, {}, formData);
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold text-stone-900">
        Edit mission: {activity.title}
      </h1>
      <ActivityForm
        action={submit}
        categoriesList={categoryOptions}
        initial={{
          name: activity.name,
          title: activity.title,
          description: activity.description,
          long_description: activity.long_description,
          hints: activity.hints,
          tips: activity.tips,
          trivia: activity.trivia,
          image: activity.image,
          xp: activity.xp,
          photo_required: activity.photo_required,
          categories: toCategoryIds(activity.categories),
        }}
      />
      <p className="mt-4">
        <Button href="/activities" variant="ghost" size="md">
          Back to missions
        </Button>
      </p>
    </div>
  );
}
