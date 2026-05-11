"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ContentStatus } from "@/components/StatusPill";
import { generateMissionCoverPrompt } from "@/lib/compass/actions/generate-mission-cover-prompt";

export type SeasonBuilderFormState = {
  error?: string;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createSeasonDraft(
  _prev: SeasonBuilderFormState,
  formData: FormData
): Promise<SeasonBuilderFormState> {
  const name = (formData.get("name") as string)?.trim();
  const brief = (formData.get("brief") as string)?.trim() || null;
  const targetAgeMin = parseInt(formData.get("target_age_min") as string) || 5;
  const targetAgeMax = parseInt(formData.get("target_age_max") as string) || 10;
  const keywords = (formData.get("theme_keywords") as string)
    ?.split(",")
    .map((k) => k.trim())
    .filter(Boolean) ?? [];

  if (!name) return { error: "Season name is required" };

  const supabase = createServerSupabaseClient();

  const baseSlug = slugify(name);
  // Append a timestamp suffix to avoid unique constraint conflicts
  const slug = `${baseSlug}-${Date.now()}`;

  const { data, error } = await supabase
    .from("seasons")
    .insert({
      name,
      slug,
      brief,
      target_age_min: targetAgeMin,
      target_age_max: targetAgeMax,
      theme_keywords: keywords.length > 0 ? keywords : null,
      content_status: "concept",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/seasons");
  redirect(`/season-builder/${data.id}`);
}

export async function updateSeasonBrief(
  seasonId: number,
  _prev: SeasonBuilderFormState,
  formData: FormData
): Promise<SeasonBuilderFormState> {
  const brief = (formData.get("brief") as string)?.trim() || null;
  const conceptSummary = (formData.get("concept_summary") as string)?.trim() || null;
  const targetAgeMin = parseInt(formData.get("target_age_min") as string) || 5;
  const targetAgeMax = parseInt(formData.get("target_age_max") as string) || 10;
  const keywords = (formData.get("theme_keywords") as string)
    ?.split(",")
    .map((k) => k.trim())
    .filter(Boolean) ?? [];
  const publishAtRaw = (formData.get("publish_at") as string)?.trim() || null;
  const publishAt = publishAtRaw ? new Date(publishAtRaw).toISOString() : null;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("seasons")
    .update({
      brief,
      concept_summary: conceptSummary,
      target_age_min: targetAgeMin,
      target_age_max: targetAgeMax,
      theme_keywords: keywords.length > 0 ? keywords : null,
      publish_at: publishAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", seasonId);

  if (error) return { error: error.message };
  revalidatePath(`/season-builder/${seasonId}`);
  revalidatePath(`/season-builder/${seasonId}/brief`);
  return {};
}

export async function advanceSeasonStatus(
  seasonId: number,
  toStatus: "concept" | "published",
  note?: string
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { data: season, error: fetchError } = await supabase
    .from("seasons")
    .select("content_status")
    .eq("id", seasonId)
    .single();

  if (fetchError || !season) return { error: "Season not found" };

  const { error: updateError } = await supabase
    .from("seasons")
    .update({ content_status: toStatus, updated_at: new Date().toISOString() })
    .eq("id", seasonId);

  if (updateError) return { error: updateError.message };

  await supabase.from("approvals").insert({
    entity_type: "season",
    entity_id: seasonId,
    from_status: season.content_status,
    to_status: toStatus,
    note: note ?? null,
  });

  revalidatePath("/seasons");
  revalidatePath(`/season-builder/${seasonId}`);
  return {};
}

export async function advanceChapterStatus(
  chapterId: number,
  seasonId: number,
  toStatus: ContentStatus,
  note?: string
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { data: chapter, error: fetchError } = await supabase
    .from("chapters")
    .select("content_status")
    .eq("id", chapterId)
    .single();

  if (fetchError || !chapter) return { error: "Chapter not found" };

  const { error: updateError } = await supabase
    .from("chapters")
    .update({ content_status: toStatus, updated_at: new Date().toISOString() })
    .eq("id", chapterId);

  if (updateError) return { error: updateError.message };

  await supabase.from("approvals").insert({
    entity_type: "chapter",
    entity_id: chapterId,
    from_status: chapter.content_status,
    to_status: toStatus,
    note: note ?? null,
  });

  revalidatePath(`/season-builder/${seasonId}`);
  revalidatePath(`/season-builder/${seasonId}/chapters/${chapterId}`);
  return {};
}

export async function advanceActivityStatus(
  activityId: number,
  seasonId: number,
  chapterId: number,
  toStatus: ContentStatus,
  note?: string
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { data: activity, error: fetchError } = await supabase
    .from("activities")
    .select("content_status")
    .eq("id", activityId)
    .single();

  if (fetchError || !activity) return { error: "Mission not found" };

  const { error: updateError } = await supabase
    .from("activities")
    .update({ content_status: toStatus, updated_at: new Date().toISOString() })
    .eq("id", activityId);

  if (updateError) return { error: updateError.message };

  await supabase.from("approvals").insert({
    entity_type: "activity",
    entity_id: activityId,
    from_status: activity.content_status,
    to_status: toStatus,
    note: note ?? null,
  });

  revalidatePath(`/season-builder/${seasonId}`);
  revalidatePath(`/season-builder/${seasonId}/chapters/${chapterId}`);
  revalidatePath(
    `/season-builder/${seasonId}/chapters/${chapterId}/missions/${activityId}`
  );
  revalidatePath(`/season-builder/${seasonId}/publish`);
  return {};
}

export async function saveChapterDraft(
  chapterId: number,
  seasonId: number,
  _prev: SeasonBuilderFormState,
  formData: FormData
): Promise<SeasonBuilderFormState> {
  const title = (formData.get("title") as string)?.trim() || null;
  const summary = (formData.get("summary") as string)?.trim() || null;
  const arcPosition = (formData.get("arc_position") as string)?.trim() || null;
  const bodySlides = formData.get("body_slides") as string | null;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("chapters")
    .update({
      title,
      summary,
      arc_position: arcPosition,
      body_slides: bodySlides ? JSON.parse(bodySlides) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", chapterId);

  if (error) return { error: error.message };

  // Snapshot in revisions
  const { data: snap } = await supabase
    .from("chapters")
    .select("*")
    .eq("id", chapterId)
    .single();

  if (snap) {
    await supabase.from("revisions").insert({
      entity_type: "chapter",
      entity_id: chapterId,
      snapshot: snap as object,
      summary: "Manual chapter save",
    });
  }

  revalidatePath(`/season-builder/${seasonId}`);
  revalidatePath(`/season-builder/${seasonId}/chapters/${chapterId}`);
  return {};
}

export async function acceptCompassStoryPages(opts: {
  generationId: number;
  seasonId: number;
  chapterId: number;
  slides: Array<{
    type: "text" | "image" | "text-image";
    value: string;
    image_prompt?: string;
  }>;
}): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const normalizedSlides = opts.slides.map((s) => {
    const text = (s.value ?? "").trim();
    const prompt = s.image_prompt?.trim() || undefined;
    if (s.type === "text") return { type: "text", value: text };
    if (s.type === "image") return { type: "image", value: "", image_prompt: prompt };
    return { type: "text-image", text, image: "", image_prompt: prompt };
  });

  const { error: updateError } = await supabase
    .from("chapters")
    .update({
      body_slides: normalizedSlides,
      last_compass_generation_id: opts.generationId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.chapterId);

  if (updateError) return { error: updateError.message };

  const prompts = opts.slides
    .map((s, i) => ({
      type: s.type,
      slotKey: `slide-${i + 1}`,
      prompt: (s.image_prompt ?? "").trim(),
    }))
    .filter((p) => p.type !== "text" && !!p.prompt);

  if (prompts.length > 0) {
    const slotKeys = prompts.map((p) => p.slotKey);
    const { data: existingAssets } = await supabase
      .from("image_assets")
      .select("slot_key")
      .eq("entity_type", "story_slide")
      .eq("entity_id", opts.chapterId)
      .in("slot_key", slotKeys);

    const existingKeys = new Set(
      (existingAssets ?? [])
        .map((a) => a.slot_key)
        .filter((k): k is string => typeof k === "string")
    );

    const toInsert = prompts
      .filter((p) => !existingKeys.has(p.slotKey))
      .map((p) => ({
        entity_type: "story_slide",
        entity_id: opts.chapterId,
        slot_key: p.slotKey,
        prompt: p.prompt,
        prompt_status: "approved",
        status: "prompt_ready",
      }));

    if (toInsert.length > 0) {
      await supabase.from("image_assets").insert(toInsert);
    }
  }

  await supabase
    .from("compass_generations")
    .update({ accepted: true, accepted_at: new Date().toISOString() })
    .eq("id", opts.generationId);

  const { data: snap } = await supabase
    .from("chapters")
    .select("*")
    .eq("id", opts.chapterId)
    .single();

  if (snap) {
    await supabase.from("revisions").insert({
      entity_type: "chapter",
      entity_id: opts.chapterId,
      snapshot: snap as object,
      summary: `Compass: accepted ${normalizedSlides.length} story slides`,
    });
  }

  revalidatePath(`/season-builder/${opts.seasonId}`);
  revalidatePath(`/season-builder/${opts.seasonId}/chapters/${opts.chapterId}`);
  revalidatePath(`/season-builder/${opts.seasonId}/images`);
  return {};
}

export async function applyCompassGeneration(opts: {
  generationId: number;
  entityType: "season" | "chapter" | "activity";
  entityId: number;
  seasonId: number;
  acceptedFields: Record<string, unknown>;
  summary: string;
}): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const table =
    opts.entityType === "season"
      ? "seasons"
      : opts.entityType === "chapter"
      ? "chapters"
      : "activities";

  const { error: updateError } = await supabase
    .from(table)
    .update({
      ...opts.acceptedFields,
      last_compass_generation_id: opts.generationId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.entityId);

  if (updateError) return { error: updateError.message };

  // If story pages were accepted, create image assets for slide prompts.
  if (opts.entityType === "chapter") {
    const maybeSlides = (opts.acceptedFields as { body_slides?: unknown }).body_slides;
    if (Array.isArray(maybeSlides) && maybeSlides.length > 0) {
      const prompts = maybeSlides
        .map((s, i) => {
          const obj = s as Record<string, unknown> | null;
          const type =
            obj && typeof obj === "object" && typeof obj.type === "string"
              ? obj.type
              : "";
          const imagePrompt =
            obj && typeof obj === "object" && typeof obj.image_prompt === "string"
              ? obj.image_prompt.trim()
              : "";
          return { slotKey: `slide-${i + 1}`, prompt: imagePrompt };
        })
        .filter((p, i) => {
          const obj = maybeSlides[i] as Record<string, unknown> | null;
          const type =
            obj && typeof obj === "object" && typeof obj.type === "string"
              ? obj.type
              : "";
          return type !== "text" && !!p.prompt;
        });

      if (prompts.length > 0) {
        const slotKeys = prompts.map((p) => p.slotKey);
        const { data: existingAssets } = await supabase
          .from("image_assets")
          .select("slot_key")
          .eq("entity_type", "story_slide")
          .eq("entity_id", opts.entityId)
          .in("slot_key", slotKeys);

        const existingKeys = new Set(
          (existingAssets ?? [])
            .map((a) => a.slot_key)
            .filter((k): k is string => typeof k === "string")
        );

        const toInsert = prompts
          .filter((p) => !existingKeys.has(p.slotKey))
          .map((p) => ({
            entity_type: "story_slide",
            entity_id: opts.entityId,
            slot_key: p.slotKey,
            prompt: p.prompt,
            prompt_status: "approved",
            status: "prompt_ready",
          }));

        if (toInsert.length > 0) {
          await supabase.from("image_assets").insert(toInsert);
        }
      }
    }
  }

  // Mark generation accepted
  await supabase
    .from("compass_generations")
    .update({ accepted: true, accepted_at: new Date().toISOString() })
    .eq("id", opts.generationId);

  // Snapshot revision
  const { data: snap } = await supabase
    .from(table)
    .select("*")
    .eq("id", opts.entityId)
    .single();

  if (snap) {
    await supabase.from("revisions").insert({
      entity_type: opts.entityType,
      entity_id: opts.entityId,
      snapshot: snap as object,
      summary: opts.summary,
    });
  }

  revalidatePath(`/season-builder/${opts.seasonId}`);
  revalidatePath(`/season-builder/${opts.seasonId}/images`);
  return {};
}

export async function discardSeasonChapterArcDraftItem(opts: {
  seasonId: number;
  index: number;
}): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { data: season, error: fetchError } = await supabase
    .from("seasons")
    .select("draft_payload")
    .eq("id", opts.seasonId)
    .single();

  if (fetchError || !season) return { error: "Season not found" };

  const draftPayload = (season as { draft_payload?: unknown }).draft_payload as
    | { chapter_arc?: unknown }
    | null
    | undefined;

  const existing = (draftPayload as { chapter_arc?: unknown[] } | null | undefined)
    ?.chapter_arc;

  if (!Array.isArray(existing)) return {};
  if (opts.index < 0 || opts.index >= existing.length) return {};

  const nextArc = existing.filter((_, i) => i !== opts.index);
  const nextPayload =
    nextArc.length === 0
      ? null
      : {
          ...(draftPayload ?? {}),
          chapter_arc: nextArc,
        };

  const { error: updateError } = await supabase
    .from("seasons")
    .update({
      draft_payload: nextPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.seasonId);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/season-builder/${opts.seasonId}`);
  return {};
}

export async function discardChapterMissionsDraft(opts: {
  seasonId: number;
  chapterId: number;
}): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { data: chapter, error: fetchError } = await supabase
    .from("chapters")
    .select("draft_payload")
    .eq("id", opts.chapterId)
    .single();

  if (fetchError || !chapter) return { error: "Chapter not found" };

  const draftPayload = (chapter as { draft_payload?: unknown }).draft_payload as
    | Record<string, unknown>
    | null
    | undefined;

  if (!draftPayload || typeof draftPayload !== "object") return {};

  const { missions: _missions, ...rest } = draftPayload;
  const nextPayload = Object.keys(rest).length === 0 ? null : rest;

  const { error: updateError } = await supabase
    .from("chapters")
    .update({
      draft_payload: nextPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.chapterId);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/season-builder/${opts.seasonId}`);
  revalidatePath(`/season-builder/${opts.seasonId}/chapters/${opts.chapterId}`);
  return {};
}

export async function discardChapterMissionDraftItem(opts: {
  seasonId: number;
  chapterId: number;
  index: number;
}): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { data: chapter, error: fetchError } = await supabase
    .from("chapters")
    .select("draft_payload")
    .eq("id", opts.chapterId)
    .single();

  if (fetchError || !chapter) return { error: "Chapter not found" };

  const draftPayload = (chapter as { draft_payload?: unknown }).draft_payload as
    | Record<string, unknown>
    | null
    | undefined;

  const existing = (draftPayload as { missions?: unknown[] } | null | undefined)
    ?.missions;

  if (!Array.isArray(existing)) return {};
  if (opts.index < 0 || opts.index >= existing.length) return {};

  const nextMissions = existing.filter((_, i) => i !== opts.index);

  const nextPayload = (() => {
    if (!draftPayload || typeof draftPayload !== "object") return null;
    const rest = { ...draftPayload, missions: nextMissions };
    if (nextMissions.length === 0) {
      // Drop missions key entirely if empty
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { missions: _m, ...withoutMissions } = rest;
      return Object.keys(withoutMissions).length === 0 ? null : withoutMissions;
    }
    return rest;
  })();

  const { error: updateError } = await supabase
    .from("chapters")
    .update({
      draft_payload: nextPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.chapterId);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/season-builder/${opts.seasonId}`);
  revalidatePath(`/season-builder/${opts.seasonId}/chapters/${opts.chapterId}`);
  return {};
}

type DraftMission = {
  name?: string;
  title?: string;
  description?: string;
  mission_type?: "outdoor" | "indoor" | "hybrid" | string;
  estimated_duration?: string;
  safety_notes?: string;
  optional_items?: string;
  intro_character_name?: string;
  intro_captain?: string;
  intro_captain_pose?: string;
  intro_dialogue?: string;
  preparation_message?: string;
  reminder_message?: string;
  prep_checklist?: Array<{ title?: string; description?: string }>;
  steps?: Array<
    | { instruction?: string; tip?: string; media_url?: string }
    | {
        order?: number;
        title?: string;
        instruction?: string;
        tip?: string;
        captain_line?: string;
      }
  >;
  intro_captain_dialogue?: string;
  supplies?: Array<{ name?: string; required?: boolean; note?: string }>;
  debrief_heading?: string;
  debrief_photo_label?: string;
  debrief_question_1?: string;
  debrief_question_2?: string;
  xp?: number;
};

export async function createMissionFromChapterMissionDraftItem(opts: {
  seasonId: number;
  chapterId: number;
  index: number;
}): Promise<{ error?: string; activityId?: number }> {
  const supabase = createServerSupabaseClient();

  const { data: chapter, error: fetchError } = await supabase
    .from("chapters")
    .select("draft_payload")
    .eq("id", opts.chapterId)
    .single();

  if (fetchError || !chapter) return { error: "Chapter not found" };

  const draftPayload = (chapter as { draft_payload?: unknown }).draft_payload as
    | Record<string, unknown>
    | null
    | undefined;

  const existing = (draftPayload as { missions?: unknown[] } | null | undefined)
    ?.missions;

  if (!Array.isArray(existing)) return { error: "No mission drafts found" };
  if (opts.index < 0 || opts.index >= existing.length) return { error: "Draft item not found" };

  const raw = existing[opts.index] as DraftMission | null;
  if (!raw || typeof raw !== "object") return { error: "Invalid draft item" };

  const baseName = slugify((raw.name ?? raw.title ?? "mission").trim() || "mission");
  const preferredName = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : baseName;
  const title = (raw.title ?? raw.name ?? "").trim() || "Untitled mission";

  const optionalItems = (() => {
    if (typeof raw.optional_items === "string" && raw.optional_items.trim()) {
      return raw.optional_items.trim();
    }
    const supplies = Array.isArray(raw.supplies) ? raw.supplies : [];
    const optional = supplies.filter((s) => !s?.required && typeof s?.name === "string");
    const opt = optional.map((s) => (s.name ?? "").trim()).filter(Boolean);
    return opt.length ? opt.join(", ") : null;
  })();

  const prepChecklist = (() => {
    if (Array.isArray(raw.prep_checklist) && raw.prep_checklist.length > 0) {
      const items = raw.prep_checklist
        .map((p) => ({
          title: typeof p?.title === "string" ? p.title.trim() : "",
          description: typeof p?.description === "string" ? p.description.trim() : "",
        }))
        .filter((p) => p.title !== "" || p.description !== "");
      return items.length ? items : null;
    }
    const supplies = Array.isArray(raw.supplies) ? raw.supplies : [];
    const items = supplies
      .map((s) => ({
        title: typeof s?.name === "string" ? s.name.trim() : "",
        description: typeof s?.note === "string" ? s.note.trim() : "",
      }))
      .filter((s) => s.title !== "" || s.description !== "");
    return items.length > 0 ? items : null;
  })();

  const steps = (() => {
    const rawSteps = Array.isArray(raw.steps) ? raw.steps : [];
    if (rawSteps.length === 0) return null;
    const looksLikeActivitySteps =
      rawSteps.length > 0 &&
      rawSteps.every((s) => s && typeof s === "object" && "instruction" in (s as object) && !("order" in (s as object)));
    if (looksLikeActivitySteps) {
      const mapped = rawSteps
        .map((s) => {
          const obj = s as { instruction?: string; tip?: string; media_url?: string };
          const instruction = typeof obj.instruction === "string" ? obj.instruction.trim() : "";
          if (!instruction) return null;
          const tip = typeof obj.tip === "string" ? obj.tip.trim() : "";
          const media = typeof obj.media_url === "string" ? obj.media_url.trim() : "";
          return {
            instruction,
            tip: tip || null,
            media_url: media || null,
          };
        })
        .filter(Boolean) as Array<{ instruction: string; tip: string | null; media_url: string | null }>;
      return mapped.length ? mapped : null;
    }

    const sorted = [...rawSteps].sort((a, b) => {
      const ao = typeof (a as { order?: unknown })?.order === "number" ? (a as { order: number }).order : 0;
      const bo = typeof (b as { order?: unknown })?.order === "number" ? (b as { order: number }).order : 0;
      return ao - bo;
    });

    const mapped = sorted
      .map((s) => {
        const obj = s as {
          title?: string;
          instruction?: string;
          tip?: string;
          captain_line?: string;
        };
        const stepTitle = typeof obj.title === "string" ? obj.title.trim() : "";
        const instruction = typeof obj.instruction === "string" ? obj.instruction.trim() : "";
        const tip = typeof obj.tip === "string" ? obj.tip.trim() : "";
        const captain = typeof obj.captain_line === "string" ? obj.captain_line.trim() : "";
        const instructionText =
          stepTitle && instruction ? `${stepTitle}: ${instruction}` : stepTitle || instruction;
        const tipText = [tip, captain].filter(Boolean).join("\n");
        if (!instructionText) return null;
        return {
          instruction: instructionText,
          tip: tipText || null,
          media_url: null,
        };
      })
      .filter(Boolean) as Array<{ instruction: string; tip: string | null; media_url: null }>;
    return mapped.length ? mapped : null;
  })();

  const activityInsert = {
    name: preferredName,
    title,
    description: (raw.description ?? "").trim() || null,
    xp: typeof raw.xp === "number" && Number.isFinite(raw.xp) ? raw.xp : 10,
    categories: [],
    mission_type: (raw.mission_type ?? null) as string | null,
    safety_notes: (raw.safety_notes ?? "").trim() || null,
    estimated_duration: (raw.estimated_duration ?? "").trim() || null,
    optional_items: optionalItems,
    prep_checklist: prepChecklist,
    steps,
    intro_character_name: (raw.intro_character_name ?? "").trim() || null,
    intro_captain: (raw.intro_captain ?? "").trim() || null,
    intro_captain_pose: (raw.intro_captain_pose ?? "").trim() || null,
    intro_dialogue: ((raw.intro_dialogue ?? raw.intro_captain_dialogue) ?? "").trim() || null,
    preparation_message: (raw.preparation_message ?? "").trim() || null,
    reminder_message: (raw.reminder_message ?? "").trim() || null,
    debrief_heading: (raw.debrief_heading ?? "").trim() || null,
    debrief_photo_label: (raw.debrief_photo_label ?? "").trim() || null,
    debrief_question_1: (raw.debrief_question_1 ?? "").trim() || null,
    debrief_question_2: (raw.debrief_question_2 ?? "").trim() || null,
  };

  const tryInsert = async (nameToUse: string) =>
    supabase
      .from("activities")
      .insert({ ...activityInsert, name: nameToUse })
      .select("id")
      .single();

  let inserted;
  let insertError;
  {
    const r = await tryInsert(preferredName);
    inserted = r.data;
    insertError = r.error;
  }

  if (insertError) {
    const message = insertError.message ?? "";
    const looksLikeUnique = /duplicate|unique/i.test(message);
    if (looksLikeUnique) {
      const fallback = `${preferredName}-${Date.now()}`;
      const r2 = await tryInsert(fallback);
      inserted = r2.data;
      insertError = r2.error;
    }
  }

  if (insertError || !inserted) return { error: insertError?.message ?? "Failed to create mission" };

  const activityId = inserted.id as number;

  // Create an image asset prompt for the mission cover (if missing).
  // Note: requires `image_assets.entity_type` to allow 'activity'.
  {
    const { data: existingAsset } = await supabase
      .from("image_assets")
      .select("id")
      .eq("entity_type", "activity")
      .eq("entity_id", activityId)
      .eq("slot_key", "cover")
      .maybeSingle();

    if (!existingAsset?.id) {
      const { data: chapterMeta } = await supabase
        .from("chapters")
        .select("title, summary, season_id")
        .eq("id", opts.chapterId)
        .single();

      const { data: seasonMeta } = await supabase
        .from("seasons")
        .select("brief, target_age_min, target_age_max")
        .eq("id", chapterMeta?.season_id ?? opts.seasonId)
        .single();

      const compass = await generateMissionCoverPrompt({
        seasonBrief: (seasonMeta?.brief ?? "").toString(),
        chapterTitle: (chapterMeta?.title ?? "").toString(),
        chapterSummary: (chapterMeta?.summary ?? "").toString(),
        targetAgeMin: Number(seasonMeta?.target_age_min ?? 5),
        targetAgeMax: Number(seasonMeta?.target_age_max ?? 10),
        mission: {
          title,
          description: (raw.description ?? "").trim() || undefined,
          mission_type: (raw.mission_type ?? null) as string | null,
          estimated_duration: (raw.estimated_duration ?? "").trim() || undefined,
          safety_notes: (raw.safety_notes ?? "").trim() || undefined,
          optional_items: (raw.optional_items ?? "").trim() || undefined,
          steps: Array.isArray(raw.steps) ? (raw.steps as any) : undefined,
          supplies: Array.isArray(raw.supplies) ? (raw.supplies as any) : undefined,
        },
      });

      const prompt = compass.output.prompt;

      await supabase.from("image_assets").insert({
        entity_type: "activity",
        entity_id: activityId,
        slot_key: "cover",
        prompt,
        prompt_status: "approved",
        status: "prompt_ready",
      });
    }
  }

  const { data: lastLink } = await supabase
    .from("chapter_activities")
    .select("order")
    .eq("chapter_id", opts.chapterId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder =
    typeof (lastLink as { order?: unknown } | null)?.order === "number"
      ? ((lastLink as { order: number }).order ?? 0) + 1
      : 0;

  const { error: linkError } = await supabase.from("chapter_activities").insert({
    chapter_id: opts.chapterId,
    activity_id: activityId,
    order: nextOrder,
  });

  if (linkError) return { error: linkError.message };

  const nextMissions = existing.filter((_, i) => i !== opts.index);
  const nextPayload = (() => {
    if (!draftPayload || typeof draftPayload !== "object") return null;
    if (nextMissions.length === 0) {
      const { missions: _m, ...withoutMissions } = draftPayload;
      return Object.keys(withoutMissions).length === 0 ? null : withoutMissions;
    }
    return { ...draftPayload, missions: nextMissions };
  })();

  const { error: payloadUpdateError } = await supabase
    .from("chapters")
    .update({
      draft_payload: nextPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.chapterId);

  if (payloadUpdateError) return { error: payloadUpdateError.message };

  revalidatePath(`/season-builder/${opts.seasonId}`);
  revalidatePath(`/season-builder/${opts.seasonId}/chapters/${opts.chapterId}`);
  revalidatePath(
    `/season-builder/${opts.seasonId}/chapters/${opts.chapterId}/missions/${activityId}`
  );
  return { activityId };
}

export async function createChapterFromSeasonChapterArcDraftItem(opts: {
  seasonId: number;
  index: number;
}): Promise<{ error?: string; chapterId?: number }> {
  const supabase = createServerSupabaseClient();

  const { data: season, error: fetchError } = await supabase
    .from("seasons")
    .select("draft_payload")
    .eq("id", opts.seasonId)
    .single();

  if (fetchError || !season) return { error: "Season not found" };

  const draftPayload = (season as { draft_payload?: unknown }).draft_payload as
    | { chapter_arc?: unknown }
    | null
    | undefined;

  const existingArc = (draftPayload as { chapter_arc?: unknown[] } | null | undefined)
    ?.chapter_arc;

  if (!Array.isArray(existingArc)) return { error: "No chapter arc draft found" };
  if (opts.index < 0 || opts.index >= existingArc.length) return { error: "Draft item not found" };

  const raw = existingArc[opts.index] as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") return { error: "Invalid draft item" };

  const weekNumber =
    typeof raw.week_number === "number" && Number.isFinite(raw.week_number)
      ? raw.week_number
      : opts.index + 1;

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const summary = typeof raw.summary === "string" ? raw.summary.trim() : "";
  const arcPosition =
    typeof raw.arc_position === "string" ? raw.arc_position.trim() : "";

  if (weekNumber < 1 || weekNumber > 12) return { error: "Week must be 1–12" };

  const { data: existingChapter } = await supabase
    .from("chapters")
    .select("id")
    .eq("season_id", opts.seasonId)
    .eq("week_number", weekNumber)
    .maybeSingle();

  if (existingChapter?.id) {
    return { error: `Week ${weekNumber} already exists` };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("chapters")
    .insert({
      season_id: opts.seasonId,
      week_number: weekNumber,
      title: title || `Chapter ${weekNumber}`,
      summary: summary || null,
      arc_position: arcPosition || null,
      unlock_date: "2100-01-01",
      content_status: "concept",
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };

  // Remove the draft item so it can't be applied twice
  const nextArc = existingArc.filter((_, i) => i !== opts.index);
  const nextPayload =
    nextArc.length === 0
      ? null
      : {
          ...(draftPayload ?? {}),
          chapter_arc: nextArc,
        };

  const { error: payloadUpdateError } = await supabase
    .from("seasons")
    .update({
      draft_payload: nextPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.seasonId);

  if (payloadUpdateError) return { error: payloadUpdateError.message };

  revalidatePath(`/season-builder/${opts.seasonId}`);
  revalidatePath(`/season-builder/${opts.seasonId}/chapters/${inserted.id}`);
  return { chapterId: inserted.id };
}

export async function deleteChapter(opts: {
  seasonId: number;
  chapterId: number;
}): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  await supabase
    .from("chapter_activities")
    .delete()
    .eq("chapter_id", opts.chapterId);

  const { error } = await supabase
    .from("chapters")
    .delete()
    .eq("id", opts.chapterId);

  if (error) return { error: error.message };

  revalidatePath(`/season-builder/${opts.seasonId}`);
  return {};
}

export async function publishSeason(
  seasonId: number
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { data: season, error: seasonFetchError } = await supabase
    .from("seasons")
    .select("publish_at, content_status")
    .eq("id", seasonId)
    .single();

  if (seasonFetchError || !season) return { error: "Season not found" };
  if (!season.publish_at) return { error: "Season start date is required before publishing" };

  const startDate = new Date(season.publish_at);

  const { error: sError } = await supabase
    .from("seasons")
    .update({ content_status: "published", updated_at: new Date().toISOString() })
    .eq("id", seasonId);

  if (sError) return { error: sError.message };

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, week_number, unlock_date")
    .eq("season_id", seasonId);

  if (chapters && chapters.length > 0) {
    // Assign unlock dates to chapters that don't have one yet, based on week_number
    for (const chapter of chapters) {
      if (!chapter.unlock_date) {
        const unlockDate = new Date(startDate);
        unlockDate.setDate(unlockDate.getDate() + (chapter.week_number - 1) * 7);
        await supabase
          .from("chapters")
          .update({
            content_status: "published",
            unlock_date: unlockDate.toISOString().slice(0, 10),
          })
          .eq("id", chapter.id);
      } else {
        await supabase
          .from("chapters")
          .update({ content_status: "published" })
          .eq("id", chapter.id);
      }
    }

    const chapterIds = chapters.map((c) => c.id);
    const { data: caRows } = await supabase
      .from("chapter_activities")
      .select("activity_id")
      .in("chapter_id", chapterIds);

    if (caRows && caRows.length > 0) {
      await supabase
        .from("activities")
        .update({ content_status: "published" })
        .in("id", caRows.map((r) => r.activity_id));
    }
  }

  await supabase.from("approvals").insert({
    entity_type: "season",
    entity_id: seasonId,
    from_status: season.content_status,
    to_status: "published",
    note: "Season published",
  });

  revalidatePath("/seasons");
  revalidatePath(`/season-builder/${seasonId}`);
  revalidatePath(`/season-builder/${seasonId}/publish`);
  return {};
}
