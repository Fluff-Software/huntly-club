"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { generateImage } from "@/lib/compass/actions/generate-image";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 15 * 1024 * 1024;

async function uploadImage(
  formData: FormData,
  bucket: string,
  prefix: string
): Promise<{ url?: string; error?: string }> {
  const file = formData.get("file") as File | null;

  if (!file?.size) return { error: "No file provided" };

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Invalid file type. Use JPEG, PNG, WebP or GIF." };
  }
  if (file.size > MAX_SIZE) {
    return { error: "File too large. Maximum size is 15MB." };
  }

  try {
    const supabase = createServerSupabaseClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${prefix}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (error) return { error: error.message };

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: urlData.publicUrl };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Upload failed",
    };
  }
}

export async function uploadSeasonImage(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const prefix = (formData.get("prefix") as string) || "heroes";
  return uploadImage(formData, "season-images", prefix);
}

export async function uploadActivityImage(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  return uploadImage(formData, "activity-images", "activities");
}

export async function uploadTemporarySubmissionPhoto(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const activityId = (formData.get("activityId") as string) || "misc";
  return uploadImage(
    formData,
    "temporary-submission-photos",
    `activities/${activityId}`
  );
}

export async function uploadCategoryIcon(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  return uploadImage(formData, "category-icons", "icons");
}

export async function uploadSlideImage(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const prefix = (formData.get("prefix") as string) || "temp";
  return uploadImage(formData, "story-slides", prefix);
}

const RESOURCE_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const RESOURCE_MAX_SIZE = 15 * 1024 * 1024;

async function uploadResourceFile(
  formData: FormData,
  prefix: string
): Promise<{ url?: string; error?: string }> {
  const file = formData.get("file") as File | null;

  if (!file?.size) return { error: "No file provided" };

  if (!RESOURCE_ALLOWED_TYPES.includes(file.type)) {
    return {
      error:
        "Invalid file type. Use PDF, JPEG, PNG, WebP or GIF.",
    };
  }
  if (file.size > RESOURCE_MAX_SIZE) {
    return { error: "File too large. Maximum size is 15MB." };
  }

  try {
    const supabase = createServerSupabaseClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const path = `${prefix}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("parent-resources")
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) return { error: error.message };

    const { data: urlData } = supabase.storage
      .from("parent-resources")
      .getPublicUrl(path);
    return { url: urlData.publicUrl };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Upload failed",
    };
  }
}

export async function uploadResourceFileAction(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const prefix = (formData.get("prefix") as string) || "resources";
  return uploadResourceFile(formData, prefix);
}

const CAMPFIRE_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/aac",
  "audio/m4a",
];
const CAMPFIRE_AUDIO_MAX_SIZE = 50 * 1024 * 1024;

export async function uploadCampfireAudio(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const file = formData.get("file") as File | null;

  if (!file?.size) return { error: "No file provided" };

  if (!CAMPFIRE_AUDIO_TYPES.includes(file.type)) {
    return {
      error: "Invalid file type. Use MP3, WAV, OGG, AAC, or M4A.",
    };
  }
  if (file.size > CAMPFIRE_AUDIO_MAX_SIZE) {
    return { error: "File too large. Maximum size is 50MB." };
  }

  try {
    const supabase = createServerSupabaseClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";
    const path = `sessions/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("campfire-audio")
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) return { error: error.message };

    const { data: urlData } = supabase.storage
      .from("campfire-audio")
      .getPublicUrl(path);
    return { url: urlData.publicUrl };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Upload failed",
    };
  }
}

const CAMPFIRE_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
];
const CAMPFIRE_VIDEO_MAX_SIZE = 100 * 1024 * 1024;

export async function uploadCampfireVideo(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const file = formData.get("file") as File | null;

  if (!file?.size) return { error: "No file provided" };

  if (!CAMPFIRE_VIDEO_TYPES.includes(file.type)) {
    return {
      error: "Invalid file type. Use MP4, WebM, or MOV.",
    };
  }
  if (file.size > CAMPFIRE_VIDEO_MAX_SIZE) {
    return { error: "File too large. Maximum size is 100MB." };
  }

  try {
    const supabase = createServerSupabaseClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const path = `sessions/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("campfire-video")
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) return { error: error.message };

    const { data: urlData } = supabase.storage
      .from("campfire-video")
      .getPublicUrl(path);
    return { url: urlData.publicUrl };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Upload failed",
    };
  }
}

export async function generateAdhocSlideImage(opts: {
  prompt: string;
}): Promise<{ url?: string; error?: string }> {
  try {
    const { result, error } = await generateImage({
      prompt: opts.prompt,
      quality: "fast",
      size: "1024x1024",
    });

    if (error) return { error };
    if (!result?.publicUrl) return { error: "Failed to generate image" };

    return { url: result.publicUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to generate image" };
  }
}
