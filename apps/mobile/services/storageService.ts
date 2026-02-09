import { supabase } from "./supabase";

const ACTIVITY_IMAGES_BUCKET = "activity-images";
const USER_PHOTOS_BUCKET = "user-activity-photos";

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
      .from(ACTIVITY_IMAGES_BUCKET)
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
      .from(ACTIVITY_IMAGES_BUCKET)
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

export const uploadUserActivityPhoto = async (
  file:
    | File
    | Blob
    | string
    | FormData
    | { uri: string; type: string; name: string },
  fileName: string,
  userId: string
): Promise<UploadResult> => {
  try {
    // Check authentication status
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return { success: false, error: "User not authenticated" };
    }

    console.log(
      "Uploading photo for user:",
      userId,
      "Authenticated user:",
      user.id
    );

    const fileExt = fileName.split(".").pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    console.log("Uploading to path:", filePath);

    // Handle different file types
    let uploadData: any;
    if (typeof file === "string") {
      // Base64 string
      uploadData = file;
      console.log("Uploading base64 data, length:", file.length);
    } else if (file instanceof FormData) {
      // FormData - extract the file from it
      const formDataEntry = (file as any).get("file");
      if (formDataEntry) {
        uploadData = formDataEntry;
        console.log("Uploading FormData file:", formDataEntry);
      } else {
        return { success: false, error: "No file found in FormData" };
      }
    } else if (file && typeof file === "object" && "uri" in file) {
      // React Native file object
      uploadData = file;
      console.log("Uploading React Native file object:", file);
    } else {
      // Blob or File
      uploadData = file;
      console.log("Uploading blob/file, size:", file.size);
    }

    const { data, error } = await supabase.storage
      .from(USER_PHOTOS_BUCKET)
      .upload(filePath, uploadData, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg",
      });

    if (error) {
      console.error("Upload error:", error);
      return { success: false, error: error.message };
    }

    console.log("Upload successful, data:", data);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(USER_PHOTOS_BUCKET)
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
  const { data } = supabase.storage
    .from(ACTIVITY_IMAGES_BUCKET)
    .getPublicUrl(imageName);

  return data.publicUrl;
};

export const deleteActivityImage = async (
  filePath: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(ACTIVITY_IMAGES_BUCKET)
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

export const deleteUserPhoto = async (filePath: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(USER_PHOTOS_BUCKET)
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
