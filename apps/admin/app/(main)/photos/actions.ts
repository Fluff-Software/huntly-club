"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

const STATUS_FOR_REVIEW = 0;
const STATUS_APPROVED = 1;
const STATUS_REJECTED = 2;

const USER_PHOTOS_BUCKET = "user-activity-photos";

/** Extract storage file path from a Supabase public URL (object/public/bucket/path). */
function getStoragePathFromPublicUrl(url: string, bucket: string): string | null {
  if (!url || typeof url !== "string") return null;
  const prefix = `/object/public/${bucket}/`;
  const i = url.indexOf(prefix);
  if (i === -1) return null;
  return url.slice(i + prefix.length).trim() || null;
}

export type ReviewActionResult = { error?: string };

export async function approvePhoto(
  _prev: ReviewActionResult,
  photoId: number
): Promise<ReviewActionResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("user_activity_photos")
      .update({ status: STATUS_APPROVED })
      .eq("photo_id", photoId);

    if (error) return { error: error.message };
    revalidatePath("/photos");
    revalidatePath("/photos/review");
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to approve photo",
    };
  }
  return {};
}

export async function denyPhoto(
  _prev: ReviewActionResult,
  photoId: number,
  reason?: string | null
): Promise<ReviewActionResult> {
  const reasonTrimmed = (reason ?? "").trim();
  if (!reasonTrimmed) {
    return { error: "A reason for denial is required." };
  }
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("user_activity_photos")
      .update({
        status: STATUS_REJECTED,
        reason: reasonTrimmed,
      })
      .eq("photo_id", photoId);

    if (error) return { error: error.message };
    // Best-effort: notify the user via email that their photo was denied.
    // This should not block the admin action or surface errors to the UI.
    try {
      await supabase.functions.invoke("photo-denied-email", {
        body: { photoIds: [photoId] },
      });
    } catch (e) {
      console.error("Failed to invoke photo-denied-email function:", e);
    }
    revalidatePath("/photos");
    revalidatePath("/photos/review");
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to deny photo",
    };
  }
  return {};
}

export async function moveToForReview(
  _prev: ReviewActionResult,
  photoId: number
): Promise<ReviewActionResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("user_activity_photos")
      .update({ status: STATUS_FOR_REVIEW })
      .eq("photo_id", photoId);

    if (error) return { error: error.message };
    revalidatePath("/photos");
    revalidatePath("/photos/review");
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to move to for review",
    };
  }
  return {};
}

export async function deletePhoto(
  _prev: ReviewActionResult,
  photoId: number
): Promise<ReviewActionResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: row } = await supabase
      .from("user_activity_photos")
      .select("photo_url")
      .eq("photo_id", photoId)
      .single();

    if (row?.photo_url) {
      const path = getStoragePathFromPublicUrl(row.photo_url, USER_PHOTOS_BUCKET);
      if (path) {
        try {
          await supabase.storage.from(USER_PHOTOS_BUCKET).remove([path]);
        } catch {
          // Best-effort: continue to delete row even if storage remove fails (e.g. file already gone)
        }
      }
    }

    const { error } = await supabase
      .from("user_activity_photos")
      .delete()
      .eq("photo_id", photoId);

    if (error) return { error: error.message };
    revalidatePath("/photos");
    revalidatePath("/photos/review");
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to delete photo",
    };
  }
  return {};
}

export async function bulkDenyPhotos(
  _prev: ReviewActionResult,
  photoIds: number[],
  reason?: string | null
): Promise<ReviewActionResult> {
  if (photoIds.length === 0) return {};
  const reasonTrimmed = (reason ?? "").trim();
  if (!reasonTrimmed) {
    return { error: "A reason for denial is required." };
  }
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("user_activity_photos")
      .update({
        status: STATUS_REJECTED,
        reason: reasonTrimmed,
      })
      .in("photo_id", photoIds);

    if (error) return { error: error.message };
    // Best-effort: notify each user whose photo was denied.
    try {
      await supabase.functions.invoke("photo-denied-email", {
        body: { photoIds },
      });
    } catch (e) {
      console.error("Failed to invoke photo-denied-email function (bulk):", e);
    }
    revalidatePath("/photos");
    revalidatePath("/photos/review");
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to deny photos",
    };
  }
  return {};
}

export async function bulkMoveToForReview(
  _prev: ReviewActionResult,
  photoIds: number[]
): Promise<ReviewActionResult> {
  if (photoIds.length === 0) return {};
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("user_activity_photos")
      .update({ status: STATUS_FOR_REVIEW })
      .in("photo_id", photoIds);

    if (error) return { error: error.message };
    revalidatePath("/photos");
    revalidatePath("/photos/review");
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to move to for review",
    };
  }
  return {};
}

export async function bulkDeletePhotos(
  _prev: ReviewActionResult,
  photoIds: number[]
): Promise<ReviewActionResult> {
  if (photoIds.length === 0) return {};
  try {
    const supabase = createServerSupabaseClient();
    const { data: rows } = await supabase
      .from("user_activity_photos")
      .select("photo_url")
      .in("photo_id", photoIds);

    if (rows?.length) {
      const paths: string[] = [];
      for (const row of rows) {
        if (row.photo_url) {
          const path = getStoragePathFromPublicUrl(row.photo_url, USER_PHOTOS_BUCKET);
          if (path) paths.push(path);
        }
      }
      if (paths.length > 0) {
        try {
          await supabase.storage.from(USER_PHOTOS_BUCKET).remove(paths);
        } catch {
          // Best-effort: continue to delete rows even if storage remove fails
        }
      }
    }

    const { error } = await supabase
      .from("user_activity_photos")
      .delete()
      .in("photo_id", photoIds);

    if (error) return { error: error.message };
    revalidatePath("/photos");
    revalidatePath("/photos/review");
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to delete photos",
    };
  }
  return {};
}

export type PhotoDetailsResult = {
  error?: string;
  photo?: {
    photo_id: number;
    photo_url: string;
    uploaded_at: string;
    status: number;
    reason: string | null;
    user_activity_id: number;
    profile_id: number;
    activity_id: number | null;
  };
  profile?: {
    id: number;
    name: string;
    nickname: string | null;
    colour: string;
    xp: number;
    team: number;
    user_id: string;
    created_at: string;
  };
  activity?: {
    id: number;
    name: string;
    title: string;
    description: string | null;
    xp: number | null;
  };
  user?: { email?: string };
};

export async function getPhotoDetails(
  photoId: number
): Promise<PhotoDetailsResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: photoRow, error: photoError } = await supabase
      .from("user_activity_photos")
      .select(
        `
        photo_id,
        photo_url,
        uploaded_at,
        status,
        reason,
        user_activity_id,
        profile_id,
        activity_id,
        profiles (
          id,
          name,
          nickname,
          colour,
          xp,
          team,
          user_id,
          created_at
        ),
        activities (
          id,
          name,
          title,
          description,
          xp
        )
      `
      )
      .eq("photo_id", photoId)
      .single();

    if (photoError || !photoRow) {
      return { error: photoError?.message ?? "Photo not found" };
    }

    const profile = (photoRow as { profiles: unknown }).profiles as PhotoDetailsResult["profile"] | null;
    const activity = (photoRow as { activities: unknown }).activities as PhotoDetailsResult["activity"] | null;

    let user: PhotoDetailsResult["user"];
    if (profile?.user_id) {
      try {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(profile.user_id);
        user = authUser ? { email: authUser.email } : undefined;
      } catch {
        user = undefined;
      }
    }

    return {
      photo: {
        photo_id: photoRow.photo_id,
        photo_url: photoRow.photo_url,
        uploaded_at: photoRow.uploaded_at,
        status: photoRow.status,
        reason: photoRow.reason ?? null,
        user_activity_id: photoRow.user_activity_id,
        profile_id: photoRow.profile_id,
        activity_id: photoRow.activity_id,
      },
      profile: profile ?? undefined,
      activity: activity ?? undefined,
      user,
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to load photo details",
    };
  }
}
