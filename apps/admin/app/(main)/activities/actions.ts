"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseCategoryIds(formData: FormData): number[] {
  const raw = formData.getAll("categories");
  const ids: number[] = [];
  for (const v of raw) {
    if (v == null || v === "") continue;
    const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
    if (!Number.isNaN(n) && n > 0) ids.push(n);
  }
  return ids;
}

export type ActivityFormState = { error?: string };

export async function deleteActivity(id: number): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/activities");
  redirect("/activities");
}

export async function createActivity(
  _prev: ActivityFormState,
  formData: FormData
): Promise<ActivityFormState> {
  const name = (formData.get("name") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  if (!name || !title) return { error: "Name and title are required" };

  const description = (formData.get("description") as string)?.trim() || null;
  const image = (formData.get("image") as string)?.trim() || null;
  const xp = parseInt(String(formData.get("xp")), 10);
  const categoryIds = parseCategoryIds(formData);

  const introUrgentMessage = (formData.get("intro_urgent_message") as string)?.trim() || null;
  const introCharacterName = (formData.get("intro_character_name") as string)?.trim() || null;
  const introCaptain = (formData.get("intro_captain") as string)?.trim() || null;
  const introCaptainPose = (formData.get("intro_captain_pose") as string)?.trim() || null;
  const introDialogue = (formData.get("intro_dialogue") as string)?.trim() || null;
  const estimatedDuration = (formData.get("estimated_duration") as string)?.trim() || null;
  const optionalItems = (formData.get("optional_items") as string)?.trim() || null;
  const debriefHeading = (formData.get("debrief_heading") as string)?.trim() || null;
  const debriefPhotoLabel = (formData.get("debrief_photo_label") as string)?.trim() || null;
  const debriefQuestion1 = (formData.get("debrief_question_1") as string)?.trim() || null;
  const debriefQuestion2 = (formData.get("debrief_question_2") as string)?.trim() || null;

  const prepTitles = (formData.getAll("prep_title") as string[]).map((s) => s?.trim() ?? "");
  const prepDescriptions = (formData.getAll("prep_description") as string[]).map((s) => s?.trim() ?? "");
  const prepChecklist =
    prepTitles.length > 0
      ? prepTitles
          .map((title, i) => ({ title, description: prepDescriptions[i] ?? "" }))
          .filter((p) => p.title !== "" || p.description !== "")
      : null;

  const stepInstructions = (formData.getAll("step_instruction") as string[]).map((s) => s?.trim() ?? "");
  const stepTips = (formData.getAll("step_tip") as string[]).map((s) => s?.trim() ?? "");
  const stepMedias = (formData.getAll("step_media") as string[]).map((s) => s?.trim() ?? "");
  const steps =
    stepInstructions.length > 0 && stepInstructions.some((s) => s !== "")
      ? stepInstructions.map((instruction, i) => ({
          instruction,
          tip: stepTips[i] !== "" ? stepTips[i] : null,
          media_url: stepMedias[i] !== "" ? stepMedias[i] : null,
        }))
      : null;

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("activities").insert({
      name,
      title,
      description,
      image: image || null,
      xp: Number.isNaN(xp) ? 10 : xp,
      categories: categoryIds.length ? categoryIds : [],
      intro_urgent_message: introUrgentMessage,
      intro_character_name: introCharacterName,
      intro_captain: introCaptain,
      intro_captain_pose: introCaptainPose,
      intro_dialogue: introDialogue,
      estimated_duration: estimatedDuration,
      optional_items: optionalItems,
      prep_checklist: prepChecklist,
      steps,
      debrief_heading: debriefHeading,
      debrief_photo_label: debriefPhotoLabel,
      debrief_question_1: debriefQuestion1,
      debrief_question_2: debriefQuestion2,
    });

    if (error) return { error: error.message };
    revalidatePath("/activities");
    revalidatePath("/dashboard");
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to create mission",
    };
  }
  return {};
}

export async function updateActivity(
  id: number,
  _prev: ActivityFormState,
  formData: FormData
): Promise<ActivityFormState> {
  const name = (formData.get("name") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  if (!name || !title) return { error: "Name and title are required" };

  const description = (formData.get("description") as string)?.trim() || null;
  const image = (formData.get("image") as string)?.trim() || null;
  const xp = parseInt(String(formData.get("xp")), 10);
  const categoryIds = parseCategoryIds(formData);

  const introUrgentMessage = (formData.get("intro_urgent_message") as string)?.trim() || null;
  const introCharacterName = (formData.get("intro_character_name") as string)?.trim() || null;
  const introCaptain = (formData.get("intro_captain") as string)?.trim() || null;
  const introCaptainPose = (formData.get("intro_captain_pose") as string)?.trim() || null;
  const introDialogue = (formData.get("intro_dialogue") as string)?.trim() || null;
  const estimatedDuration = (formData.get("estimated_duration") as string)?.trim() || null;
  const optionalItems = (formData.get("optional_items") as string)?.trim() || null;
  const debriefHeading = (formData.get("debrief_heading") as string)?.trim() || null;
  const debriefPhotoLabel = (formData.get("debrief_photo_label") as string)?.trim() || null;
  const debriefQuestion1 = (formData.get("debrief_question_1") as string)?.trim() || null;
  const debriefQuestion2 = (formData.get("debrief_question_2") as string)?.trim() || null;

  const prepTitles = (formData.getAll("prep_title") as string[]).map((s) => s?.trim() ?? "");
  const prepDescriptions = (formData.getAll("prep_description") as string[]).map((s) => s?.trim() ?? "");
  const prepChecklist =
    prepTitles.length > 0
      ? prepTitles
          .map((title, i) => ({ title, description: prepDescriptions[i] ?? "" }))
          .filter((p) => p.title !== "" || p.description !== "")
      : null;

  const stepInstructions = (formData.getAll("step_instruction") as string[]).map((s) => s?.trim() ?? "");
  const stepTips = (formData.getAll("step_tip") as string[]).map((s) => s?.trim() ?? "");
  const stepMedias = (formData.getAll("step_media") as string[]).map((s) => s?.trim() ?? "");
  const steps =
    stepInstructions.length > 0 && stepInstructions.some((s) => s !== "")
      ? stepInstructions.map((instruction, i) => ({
          instruction,
          tip: stepTips[i] !== "" ? stepTips[i] : null,
          media_url: stepMedias[i] !== "" ? stepMedias[i] : null,
        }))
      : null;

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("activities")
      .update({
        name,
        title,
        description,
        image: image || null,
        xp: Number.isNaN(xp) ? 10 : xp,
        categories: categoryIds.length ? categoryIds : [],
        intro_urgent_message: introUrgentMessage,
        intro_character_name: introCharacterName,
        intro_captain: introCaptain,
        intro_captain_pose: introCaptainPose,
        intro_dialogue: introDialogue,
        estimated_duration: estimatedDuration,
        optional_items: optionalItems,
        prep_checklist: prepChecklist,
        steps,
        debrief_heading: debriefHeading,
        debrief_photo_label: debriefPhotoLabel,
        debrief_question_1: debriefQuestion1,
        debrief_question_2: debriefQuestion2,
      })
      .eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/activities");
    revalidatePath(`/activities/${id}/edit`);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to update mission",
    };
  }
  return {};
}
