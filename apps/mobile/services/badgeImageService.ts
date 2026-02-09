import { supabase } from "./supabase";
import { Badge } from "./badgeService";

export interface BadgeImageUpload {
  badgeId: number;
  file: File | Blob;
  fileName: string;
}

export const uploadBadgeImage = async (
  badgeId: number,
  file: File | Blob,
  fileName: string
): Promise<string> => {
  try {
    const fileExt = fileName.split(".").pop();
    const filePath = `${badgeId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("badges")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Error uploading badge image:", error);
      throw new Error(`Failed to upload badge image: ${error.message}`);
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("badges")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error in uploadBadgeImage:", error);
    throw error;
  }
};

export const updateBadgeImageUrl = async (
  badgeId: number,
  imageUrl: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from("badges")
      .update({
        image_url: imageUrl,
        uses_custom_image: true,
      })
      .eq("id", badgeId);

    if (error) {
      console.error("Error updating badge image URL:", error);
      throw new Error(`Failed to update badge image URL: ${error.message}`);
    }
  } catch (error) {
    console.error("Error in updateBadgeImageUrl:", error);
    throw error;
  }
};

export const deleteBadgeImage = async (filePath: string): Promise<void> => {
  try {
    const { error } = await supabase.storage.from("badges").remove([filePath]);

    if (error) {
      console.error("Error deleting badge image:", error);
      throw new Error(`Failed to delete badge image: ${error.message}`);
    }
  } catch (error) {
    console.error("Error in deleteBadgeImage:", error);
    throw error;
  }
};

export const getBadgeImageUrl = (badge: Badge): string | null => {
  if (badge.uses_custom_image && badge.image_url) {
    return badge.image_url;
  }
  return null;
};

export const getBadgeDisplay = (
  badge: Badge
): {
  type: "emoji" | "image";
  content: string;
} => {
  if (badge.uses_custom_image && badge.image_url) {
    return {
      type: "image",
      content: badge.image_url,
    };
  } else {
    return {
      type: "emoji",
      content: badge.image_url || "🏆",
    };
  }
};
