export type ResizeForUploadOptions = {
  maxWidth?: number;
  maxHeight?: number;
  /**
   * Target max payload size (bytes) for the resulting File.
   * Keep this comfortably below Next.js Server Action body limits.
   */
  maxBytes?: number;
  /**
   * Output mime type for re-encoded images (jpeg/webp).
   * PNG input will be converted unless you skip via `allowPngPassthrough`.
   */
  outputType?: "image/jpeg" | "image/webp";
  /**
   * If true and the input is a PNG, we keep it as-is (no resize/re-encode).
   * Useful if you need to preserve alpha/transparency.
   */
  allowPngPassthrough?: boolean;
};

const DEFAULTS: Required<
  Pick<ResizeForUploadOptions, "maxWidth" | "maxHeight" | "maxBytes" | "outputType" | "allowPngPassthrough">
> = {
  maxWidth: 2560,
  maxHeight: 2560,
  maxBytes: 4_800_000, // < 5MB server-side check and < 6MB Server Action limit
  outputType: "image/webp",
  allowPngPassthrough: false,
};

function pickOutputName(originalName: string, outputType: "image/jpeg" | "image/webp") {
  const base = originalName.replace(/\.[^/.]+$/, "");
  const ext = outputType === "image/jpeg" ? "jpg" : "webp";
  return `${base}.${ext}`;
}

async function fileToImageBitmap(file: File): Promise<ImageBitmap> {
  // Prefer createImageBitmap for speed + EXIF orientation handling in modern browsers.
  // Fallback: HTMLImageElement for older browsers.
  if ("createImageBitmap" in window) {
    return await createImageBitmap(file);
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Failed to decode image"));
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(img, 0, 0);
    return await createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function computeFitSize(
  srcW: number,
  srcH: number,
  maxW: number,
  maxH: number
): { w: number; h: number; scale: number } {
  const scale = Math.min(1, maxW / srcW, maxH / srcH);
  return { w: Math.max(1, Math.round(srcW * scale)), h: Math.max(1, Math.round(srcH * scale)), scale };
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to encode image"))),
      type,
      quality
    );
  });
}

/**
 * Resize (downscale) + compress large images on the client so Server Actions don't reject them.
 *
 * - GIFs are returned as-is (we avoid breaking animation).
 * - If the file is already under maxBytes and within max dimensions, it is returned unchanged.
 */
export async function resizeImageFileForUpload(file: File, opts: ResizeForUploadOptions = {}): Promise<File> {
  const { maxWidth, maxHeight, maxBytes, outputType, allowPngPassthrough } = { ...DEFAULTS, ...opts };

  if (file.type === "image/gif") return file;
  if (allowPngPassthrough && file.type === "image/png") return file;

  // Quick accept: keep as-is if it's already comfortably small.
  if (file.size > 0 && file.size <= maxBytes) {
    // Still might exceed dimensions; we'll check dimensions before deciding.
    try {
      const bmp = await fileToImageBitmap(file);
      const fit = computeFitSize(bmp.width, bmp.height, maxWidth, maxHeight);
      bmp.close?.();
      if (fit.scale === 1) return file;
    } catch {
      // If decode fails, just let the server validate.
      return file;
    }
  }

  const bitmap = await fileToImageBitmap(file);
  try {
    const { w, h, scale } = computeFitSize(bitmap.width, bitmap.height, maxWidth, maxHeight);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    // Better downscaling quality in most browsers.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);

    // If we didn't actually scale and original is already smaller than maxBytes, keep original.
    if (scale === 1 && file.size <= maxBytes) return file;

    // Encode; if still too big, reduce quality iteratively.
    let quality = 0.85;
    let blob = await canvasToBlob(canvas, outputType, quality);
    while (blob.size > maxBytes && quality > 0.55) {
      quality = Math.max(0.55, quality - 0.07);
      blob = await canvasToBlob(canvas, outputType, quality);
    }

    // If it's *still* too big, do a last-resort downscale step (reduce dimensions).
    if (blob.size > maxBytes) {
      const shrink = 0.85;
      const canvas2 = document.createElement("canvas");
      canvas2.width = Math.max(1, Math.round(w * shrink));
      canvas2.height = Math.max(1, Math.round(h * shrink));
      const ctx2 = canvas2.getContext("2d");
      if (!ctx2) throw new Error("Canvas 2D context unavailable");
      ctx2.imageSmoothingEnabled = true;
      ctx2.imageSmoothingQuality = "high";
      ctx2.drawImage(canvas, 0, 0, canvas2.width, canvas2.height);
      blob = await canvasToBlob(canvas2, outputType, 0.72);
    }

    const outName = pickOutputName(file.name || "upload", outputType);
    return new File([blob], outName, { type: outputType, lastModified: Date.now() });
  } finally {
    bitmap.close?.();
  }
}

