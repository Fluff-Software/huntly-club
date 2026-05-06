"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ContentStatus } from "@/components/StatusPill";

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
  toStatus: ContentStatus,
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
