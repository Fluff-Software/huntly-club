import { supabase } from "./supabase";

const BUCKET_NAME = "activity-images";

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const uploadActivityImage = async (
  file: File | Blob,
  fileName: string,
  userId: string
): Promise<UploadResult> => {
  try {
    const fileExt = fileName.split(".").pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      return { success: false, error: error.message };
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error("Upload failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
};

export const getActivityImageUrl = (
  imageName: string | null
): string | null => {
  if (!imageName) return null;

  // If it's already a full URL, return as is
  if (imageName.startsWith("http")) {
    return imageName;
  }

  // For local activity images, construct the URL
  // Assuming images are stored in the root of the bucket
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(imageName);

  return data.publicUrl;
};

export const deleteActivityImage = async (
  filePath: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error("Delete error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Delete failed:", error);
    return false;
  }
};

// Helper function to get image source for React Native Image component
export const getImageSource = (imageName: string | null) => {
  if (!imageName) return null;

  const imageUrl = getActivityImageUrl(imageName);
  if (imageUrl) {
    return { uri: imageUrl };
  }

  return null;
};
