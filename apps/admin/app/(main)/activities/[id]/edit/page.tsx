import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { updateActivity } from "../../actions";
import { getCategories } from "@/app/(main)/categories/actions";
import { Button } from "@/components/Button";
import { ActivityForm } from "../../ActivityForm";
import { DeleteMissionButton } from "../../DeleteMissionButton";

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
          image: activity.image,
          xp: activity.xp,
          categories: toCategoryIds(activity.categories),
          intro_urgent_message: activity.intro_urgent_message ?? null,
          intro_character_name: activity.intro_character_name ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          intro_captain: (activity as any).intro_captain ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          intro_captain_pose: (activity as any).intro_captain_pose ?? null,
          intro_dialogue: activity.intro_dialogue ?? null,
          estimated_duration: activity.estimated_duration ?? null,
          optional_items: activity.optional_items ?? null,
          prep_checklist: Array.isArray(activity.prep_checklist) ? activity.prep_checklist : null,
          steps: Array.isArray(activity.steps) ? activity.steps : null,
          debrief_heading: activity.debrief_heading ?? null,
          debrief_photo_label: activity.debrief_photo_label ?? null,
          debrief_question_1: activity.debrief_question_1 ?? null,
          debrief_question_2: activity.debrief_question_2 ?? null,
        }}
      />
      <div className="mt-4 flex items-center justify-between">
        <Button href="/activities" variant="ghost" size="md">
          Back to missions
        </Button>
        <DeleteMissionButton id={activityId} />
      </div>
    </div>
  );
}
