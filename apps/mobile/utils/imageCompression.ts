import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

async function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
}

export type CompressedImageResult = ImageManipulator.ImageResult;

export async function compressImageAsync(uri: string): Promise<CompressedImageResult> {
  try {
    const actions: ImageManipulator.Action[] = [];

    try {
      const { width, height } = await getImageSize(uri);
      const isLandscape = width >= height;

      if (isLandscape && width > MAX_DIMENSION) {
        actions.push({ resize: { width: MAX_DIMENSION } });
      } else if (!isLandscape && height > MAX_DIMENSION) {
        actions.push({ resize: { height: MAX_DIMENSION } });
      }
    } catch {
      // If we can't determine size, fall back to compression-only below.
    }

    const result = await ImageManipulator.manipulateAsync(
      uri,
      actions,
      {
        compress: JPEG_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return result;
  } catch (error) {
    console.warn("compressImageAsync failed; using original image", error);
    return {
      uri,
      width: 0,
      height: 0,
    };
  }
}

