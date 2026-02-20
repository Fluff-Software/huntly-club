"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

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
    return { error: "File too large. Maximum size is 5MB." };
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

export async function uploadCategoryIcon(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  return uploadImage(formData, "activity-images", "categories");
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
