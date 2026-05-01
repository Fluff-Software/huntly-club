"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

type BadgeRequirementType =
  | "xp_gained"
  | "packs_completed"
  | "activities_completed"
  | "team_xp"
  | "team_contribution"
  | "activities_by_category";

const REQUIREMENT_TYPES: BadgeRequirementType[] = [
  "xp_gained",
  "packs_completed",
  "activities_completed",
  "team_xp",
  "team_contribution",
  "activities_by_category",
];

async function uploadBadgeImageFile(file: File): Promise<string> {
  const supabase = createServerSupabaseClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `admin/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("badges").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("badges").getPublicUrl(path);
  return data.publicUrl;
}

function parseRequirementType(value: FormDataEntryValue | null): BadgeRequirementType {
  const raw = typeof value === "string" ? value : "";
  return REQUIREMENT_TYPES.includes(raw as BadgeRequirementType)
    ? (raw as BadgeRequirementType)
    : "xp_gained";
}

function normalizeRequirementType(requirementType: BadgeRequirementType): BadgeRequirementType {
  // Team-wide XP badges are deprecated; only individual contribution should be used.
  return requirementType === "team_xp" ? "team_contribution" : requirementType;
}

function deriveCategoryFromRequirementType(requirementType: BadgeRequirementType) {
  return requirementType === "xp_gained"
    ? "xp"
    : requirementType === "packs_completed"
      ? "pack"
      : requirementType === "team_xp" || requirementType === "team_contribution"
        ? "team"
        : "special";
}

function shouldForceHiddenUntilAwarded(params: {
  badgeType: string;
  requirementType: BadgeRequirementType;
}) {
  if (params.badgeType === "manual") return true;
  return false;
}

export async function getBadgesAdminData() {
  const supabase = createServerSupabaseClient();
  const [badgesRes, profilesRes, categoriesRes, awardsRes] = await Promise.all([
    supabase
      .from("badges")
      .select("*")
      .order("sort_group", { ascending: true }),
    supabase.from("profiles").select("id, name, nickname, user_id").order("id"),
    supabase.from("categories").select("id, name").order("id"),
    supabase
      .from("user_badges")
      .select(
        "badge_id, profile_id, earned_at, profiles(id, name, nickname), badges(name)"
      )
      .order("earned_at", { ascending: false })
      .limit(300),
  ]);
  return {
    badges: badgesRes.data ?? [],
    profiles: profilesRes.data ?? [],
    categories: categoriesRes.data ?? [],
    awards: awardsRes.data ?? [],
  };
}

export async function createBadge(formData: FormData): Promise<{ error?: string }> {
  try {
    const supabase = createServerSupabaseClient();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Badge name is required." };

    const file = formData.get("image_file");
    const imageUrlInput = String(formData.get("image_url") ?? "").trim();
    const image_url =
      file instanceof File && file.size > 0
        ? await uploadBadgeImageFile(file)
        : imageUrlInput || "🏆";

    const requirement_type = normalizeRequirementType(
      parseRequirementType(
      formData.get("requirement_type") ?? formData.get("track")
      )
    );
    const requirement_value = Math.max(
      0,
      Number.parseInt(
        String(formData.get("requirement_value") ?? formData.get("target_value") ?? "0"),
        10
      ) || 0
    );
    const requirement_category =
      requirement_type === "activities_by_category"
        ? String(formData.get("requirement_category") ?? "").trim() || null
        : null;
    const badge_type = String(formData.get("badge_type") ?? "milestone");
    const categoryFromTrack = deriveCategoryFromRequirementType(requirement_type);
    const forceHidden = shouldForceHiddenUntilAwarded({
      badgeType: badge_type,
      requirementType: requirement_type,
    });

    const { error } = await supabase.from("badges").insert({
      name,
      description: String(formData.get("description") ?? "").trim() || "Badge unlocked",
      image_url,
      category: String(formData.get("category") ?? categoryFromTrack),
      requirement_type,
      requirement_value,
      requirement_category,
      badge_type,
      is_hidden_until_awarded:
        forceHidden || formData.get("is_hidden_until_awarded") === "on",
      is_active: true,
      sort_group:
        String(
          formData.get("sort_group") ??
            (badge_type === "manual" ? "Special" : "Milestones")
        ).trim() || "General",
      uses_custom_image: image_url.startsWith("http"),
    });

    if (error) return { error: error.message };
    revalidatePath("/badges");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create badge" };
  }
}

export async function updateBadge(formData: FormData): Promise<{ error?: string }> {
  try {
    const supabase = createServerSupabaseClient();
    const id = Number.parseInt(String(formData.get("id") ?? "0"), 10);
    if (!id) return { error: "Missing badge id." };

    const file = formData.get("image_file");
    const imageUrlInput = String(formData.get("image_url") ?? "").trim();
    const updatePayload: Record<string, unknown> = {
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      requirement_type: normalizeRequirementType(
        parseRequirementType(formData.get("requirement_type"))
      ),
      requirement_value:
        Number.parseInt(String(formData.get("requirement_value") ?? "0"), 10) || 0,
      requirement_category:
        String(formData.get("requirement_type") ?? "") === "activities_by_category"
          ? String(formData.get("requirement_category") ?? "").trim() || null
          : null,
      badge_type: String(formData.get("badge_type") ?? "milestone"),
      is_active: formData.get("is_active") === "on",
      sort_group: String(formData.get("sort_group") ?? "General").trim() || "General",
    };
    updatePayload.category = deriveCategoryFromRequirementType(
      updatePayload.requirement_type as BadgeRequirementType
    );
    updatePayload.is_hidden_until_awarded =
      shouldForceHiddenUntilAwarded({
        badgeType: updatePayload.badge_type as string,
        requirementType: updatePayload.requirement_type as BadgeRequirementType,
      }) || formData.get("is_hidden_until_awarded") === "on";

    if (file instanceof File && file.size > 0) {
      const uploaded = await uploadBadgeImageFile(file);
      updatePayload.image_url = uploaded;
      updatePayload.uses_custom_image = true;
    } else if (imageUrlInput) {
      updatePayload.image_url = imageUrlInput;
      updatePayload.uses_custom_image = imageUrlInput.startsWith("http");
    }

    const { error } = await supabase.from("badges").update(updatePayload).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/badges");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update badge" };
  }
}

export async function deleteBadge(formData: FormData): Promise<void> {
  const supabase = createServerSupabaseClient();
  const id = Number.parseInt(String(formData.get("id") ?? "0"), 10);
  if (!id) throw new Error("Missing badge id.");

  const { error } = await supabase.from("badges").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/badges");
}

export async function assignBadgeToProfile(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    const supabase = createServerSupabaseClient();
    const badgeId = Number.parseInt(String(formData.get("badge_id") ?? "0"), 10);
    const profileId = Number.parseInt(String(formData.get("profile_id") ?? "0"), 10);
    if (!badgeId || !profileId) {
      return { error: "Select badge and profile." };
    }
    const reason = String(formData.get("grant_reason") ?? "").trim();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, user_id")
      .eq("id", profileId)
      .single();
    if (profileError || !profile) {
      return { error: profileError?.message || "Profile not found." };
    }

    const { error } = await supabase.from("user_badges").upsert(
      {
        user_id: profile.user_id,
        profile_id: profileId,
        badge_id: badgeId,
        grant_type: "manual",
        grant_reason: reason || null,
        earned_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,profile_id,badge_id",
      }
    );
    if (error) {
      return { error: error.message };
    }
    revalidatePath("/badges");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to assign badge" };
  }
}

export async function renameBadgeGroup(formData: FormData): Promise<void> {
  const supabase = createServerSupabaseClient();
  const oldGroup = String(formData.get("old_group") ?? "").trim();
  const newGroup = String(formData.get("new_group") ?? "").trim();

  if (!oldGroup) throw new Error("Missing current badge group.");
  if (!newGroup) throw new Error("New badge group name is required.");
  if (oldGroup === newGroup) return;

  const { error } = await supabase
    .from("badges")
    .update({ sort_group: newGroup })
    .eq("sort_group", oldGroup);

  if (error) throw new Error(error.message);
  revalidatePath("/badges");
}
