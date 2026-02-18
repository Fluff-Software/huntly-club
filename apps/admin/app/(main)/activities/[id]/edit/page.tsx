import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { updateActivity } from "../../actions";
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

export default async function EditActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activityId = parseInt(id, 10);
  if (Number.isNaN(activityId)) notFound();

  const activity = await getActivity(activityId);
  if (!activity) notFound();

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
          categories: Array.isArray(activity.categories) ? activity.categories : [],
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
