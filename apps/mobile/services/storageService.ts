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
    let contentType = "image/jpeg";
    let shouldSetContentType = true;

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
      // Let fetch set the multipart/form-data content type with boundary
      shouldSetContentType = false;
    } else if (file && typeof file === "object" && "uri" in file) {
      // React Native file object - fetch the URI and convert to Blob
      const rnFile = file as { uri: string; type?: string; name?: string };
      console.log("Uploading React Native file object, fetching blob:", rnFile);

      const response = await fetch(rnFile.uri);
      const blob = await response.blob();

      uploadData = blob;
      contentType = rnFile.type || blob.type || "image/jpeg";
      console.log(
        "React Native file blob ready:",
        rnFile.uri,
        "contentType:",
        contentType
      );
    } else {
      // Blob or File
      uploadData = file;
      const inferredType =
        file && typeof (file as any).type === "string"
          ? (file as any).type
          : undefined;
      if (inferredType) {
        contentType = inferredType;
      }
      console.log(
        "Uploading blob/file, size:",
        (file as any)?.size,
        "contentType:",
        contentType
      );
    }

    const uploadOptions: {
      cacheControl: string;
      upsert: boolean;
      contentType?: string;
    } = {
      cacheControl: "3600",
      upsert: false,
    };

    if (shouldSetContentType) {
      uploadOptions.contentType = contentType;
    }

    const { data, error } = await supabase.storage
      .from(USER_PHOTOS_BUCKET)
      .upload(filePath, uploadData, uploadOptions);

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
