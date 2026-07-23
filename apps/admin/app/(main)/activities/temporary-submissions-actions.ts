"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export type TemporarySubmissionPhoto = {
  id: number;
  photo_url: string;
  sort_order: number;
};

export type TemporarySubmissionItem = {
  id: number;
  activity_id: number;
  display_name: string;
  team_id: number;
  team_name: string | null;
  submitted_at: string;
  xp: number;
  team_xp_awarded: number;
  photos: TemporarySubmissionPhoto[];
};

export type TeamOption = {
  id: number;
  name: string;
};

export type TemporarySubmissionFormState = {
  error?: string;
  success?: boolean;
};

async function adjustTeamXp(teamId: number, amount: number): Promise<string | null> {
  if (amount === 0) return null;
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc("add_team_xp", {
    team_id: teamId,
    xp_amount: amount,
  });
  return error?.message ?? null;
}

export async function listTeams(): Promise<TeamOption[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, name")
    .order("id", { ascending: true });
  if (error) {
    console.error("listTeams:", error.message);
    return [];
  }
  return (data ?? []).map((t) => ({ id: t.id, name: t.name ?? "" }));
}

export async function listTemporarySubmissions(
  activityId: number
): Promise<TemporarySubmissionItem[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("temporary_submissions")
    .select(
      `
      id,
      activity_id,
      display_name,
      team_id,
      submitted_at,
      xp,
      team_xp_awarded,
      teams(name),
      temporary_submission_photos(id, photo_url, sort_order)
    `
    )
    .eq("activity_id", activityId)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("listTemporarySubmissions:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const teamRow = row.teams as { name: string } | { name: string }[] | null;
    const teamName = Array.isArray(teamRow) ? teamRow[0]?.name : teamRow?.name;
    const photosRaw = row.temporary_submission_photos as
      | TemporarySubmissionPhoto[]
      | null;
    const photos = [...(photosRaw ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order || a.id - b.id
    );
    return {
      id: row.id,
      activity_id: row.activity_id,
      display_name: row.display_name,
      team_id: row.team_id,
      team_name: teamName ?? null,
      submitted_at: row.submitted_at,
      xp: row.xp,
      team_xp_awarded: row.team_xp_awarded,
      photos,
    };
  });
}

function parsePhotoUrls(formData: FormData): string[] {
  const urls = formData
    .getAll("photo_url")
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
  return [...new Set(urls)];
}

function parseSubmittedAt(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function createTemporarySubmission(
  activityId: number,
  _prev: TemporarySubmissionFormState,
  formData: FormData
): Promise<TemporarySubmissionFormState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const teamId = Number(formData.get("team_id"));
  const submittedAtRaw = String(formData.get("submitted_at") ?? "");
  const photoUrls = parsePhotoUrls(formData);

  if (!displayName) return { error: "Display name is required." };
  if (!Number.isFinite(teamId) || teamId <= 0) return { error: "Select a team." };
  if (photoUrls.length === 0) return { error: "Upload at least one photo." };

  const submittedAt = parseSubmittedAt(submittedAtRaw) ?? new Date().toISOString();

  const supabase = createServerSupabaseClient();
  const { data: activity, error: activityError } = await supabase
    .from("activities")
    .select("xp")
    .eq("id", activityId)
    .single();

  if (activityError || !activity) {
    return { error: activityError?.message ?? "Mission not found." };
  }

  const xp = Math.max(0, Number(activity.xp) || 0);
  const teamXpAwarded = Math.floor(xp * 0.5);

  const { data: submission, error: insertError } = await supabase
    .from("temporary_submissions")
    .insert({
      activity_id: activityId,
      display_name: displayName,
      team_id: teamId,
      submitted_at: submittedAt,
      xp,
      team_xp_awarded: teamXpAwarded,
    })
    .select("id")
    .single();

  if (insertError || !submission) {
    return { error: insertError?.message ?? "Failed to create submission." };
  }

  const photoRows = photoUrls.map((photo_url, index) => ({
    temporary_submission_id: submission.id,
    photo_url,
    sort_order: index,
  }));

  const { error: photosError } = await supabase
    .from("temporary_submission_photos")
    .insert(photoRows);

  if (photosError) {
    await supabase.from("temporary_submissions").delete().eq("id", submission.id);
    return { error: photosError.message };
  }

  const xpError = await adjustTeamXp(teamId, teamXpAwarded);
  if (xpError) {
    await supabase.from("temporary_submissions").delete().eq("id", submission.id);
    return { error: `Failed to award team XP: ${xpError}` };
  }

  revalidatePath(`/activities/${activityId}/edit`);
  return { success: true };
}

export async function updateTemporarySubmission(
  activityId: number,
  submissionId: number,
  _prev: TemporarySubmissionFormState,
  formData: FormData
): Promise<TemporarySubmissionFormState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const teamId = Number(formData.get("team_id"));
  const submittedAtRaw = String(formData.get("submitted_at") ?? "");
  const photoUrls = parsePhotoUrls(formData);

  if (!displayName) return { error: "Display name is required." };
  if (!Number.isFinite(teamId) || teamId <= 0) return { error: "Select a team." };
  if (photoUrls.length === 0) return { error: "Upload at least one photo." };

  const submittedAt = parseSubmittedAt(submittedAtRaw);
  if (!submittedAt) return { error: "Invalid submission time." };

  const supabase = createServerSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("temporary_submissions")
    .select("id, team_id, team_xp_awarded, xp")
    .eq("id", submissionId)
    .eq("activity_id", activityId)
    .single();

  if (existingError || !existing) {
    return { error: existingError?.message ?? "Submission not found." };
  }

  const { error: updateError } = await supabase
    .from("temporary_submissions")
    .update({
      display_name: displayName,
      team_id: teamId,
      submitted_at: submittedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (updateError) return { error: updateError.message };

  const { error: deletePhotosError } = await supabase
    .from("temporary_submission_photos")
    .delete()
    .eq("temporary_submission_id", submissionId);

  if (deletePhotosError) return { error: deletePhotosError.message };

  const photoRows = photoUrls.map((photo_url, index) => ({
    temporary_submission_id: submissionId,
    photo_url,
    sort_order: index,
  }));

  const { error: photosError } = await supabase
    .from("temporary_submission_photos")
    .insert(photoRows);

  if (photosError) return { error: photosError.message };

  if (existing.team_id !== teamId) {
    const reverseError = await adjustTeamXp(
      existing.team_id,
      -Number(existing.team_xp_awarded || 0)
    );
    if (reverseError) return { error: `Failed to reverse old team XP: ${reverseError}` };

    const awardError = await adjustTeamXp(teamId, Number(existing.team_xp_awarded || 0));
    if (awardError) return { error: `Failed to award new team XP: ${awardError}` };
  }

  revalidatePath(`/activities/${activityId}/edit`);
  return { success: true };
}

export async function deleteTemporarySubmission(
  activityId: number,
  submissionId: number
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("temporary_submissions")
    .select("id, team_id, team_xp_awarded")
    .eq("id", submissionId)
    .eq("activity_id", activityId)
    .single();

  if (existingError || !existing) {
    return { error: existingError?.message ?? "Submission not found." };
  }

  const reverseError = await adjustTeamXp(
    existing.team_id,
    -Number(existing.team_xp_awarded || 0)
  );
  if (reverseError) return { error: `Failed to reverse team XP: ${reverseError}` };

  const { error: deleteError } = await supabase
    .from("temporary_submissions")
    .delete()
    .eq("id", submissionId);

  if (deleteError) {
    // Best-effort re-apply XP so score stays consistent if delete failed.
    await adjustTeamXp(existing.team_id, Number(existing.team_xp_awarded || 0));
    return { error: deleteError.message };
  }

  revalidatePath(`/activities/${activityId}/edit`);
  return {};
}
