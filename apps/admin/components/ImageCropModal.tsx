"use client";

import "react-image-crop/dist/ReactCrop.css";
import ReactCrop, {
  type Crop,
  centerCrop,
  makeAspectCrop,
  convertToPixelCrop,
} from "react-image-crop";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

type Props = {
  open: boolean;
  file: File | null;
  title?: string;
  aspect?: number;
  onCancel: () => void;
  onConfirm: (croppedFile: File) => void;
};

function pickOutputType(file: File): "image/jpeg" | "image/webp" {
  // Keep "shrinkable" formats for upload payload size.
  // If the input is PNG/GIF, we'll still output JPEG to keep size down.
  return file.type === "image/webp" ? "image/webp" : "image/jpeg";
}

function outputExt(type: "image/jpeg" | "image/webp"): string {
  return type === "image/webp" ? "webp" : "jpg";
}

function fileBaseName(name: string): string {
  const base = name.replace(/\.[^/.]+$/, "");
  return base || "upload";
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function makeCenteredAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  const widthPct = 90;
  const crop = makeAspectCrop(
    {
      unit: "%",
      width: widthPct,
    },
    aspect,
    mediaWidth,
    mediaHeight
  );
  return centerCrop(crop, mediaWidth, mediaHeight);
}

async function getCroppedFile(
  input: File,
  imgEl: HTMLImageElement,
  crop: Crop,
  outputType: "image/jpeg" | "image/webp"
): Promise<File> {
  const imageUrl = URL.createObjectURL(input);
  try {
    // Ensure the underlying image is loaded; we already render <img>, but keep this safe.
    if (!imgEl.complete) {
      await new Promise<void>((resolve, reject) => {
        imgEl.onload = () => resolve();
        imgEl.onerror = () => reject(new Error("Failed to load image"));
      });
    }

    const pixelCrop = convertToPixelCrop(
      crop,
      imgEl.naturalWidth || imgEl.width,
      imgEl.naturalHeight || imgEl.height
    );

    const canvas = document.createElement("canvas");
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(pixelCrop.width * pixelRatio));
    canvas.height = Math.max(1, Math.round(pixelCrop.height * pixelRatio));

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      imgEl,
      clamp(pixelCrop.x, 0, (imgEl.naturalWidth || imgEl.width) - 1),
      clamp(pixelCrop.y, 0, (imgEl.naturalHeight || imgEl.height) - 1),
      clamp(pixelCrop.width, 1, imgEl.naturalWidth || imgEl.width),
      clamp(pixelCrop.height, 1, imgEl.naturalHeight || imgEl.height),
      0,
      0,
      canvas.width,
      canvas.height
    );

    const quality = outputType === "image/webp" ? 0.86 : 0.9;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Failed to encode image"))),
        outputType,
        quality
      );
    });

    const outName = `${fileBaseName(input.name)}-cropped.${outputExt(outputType)}`;
    return new File([blob], outName, { type: outputType, lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function ImageCropModal({
  open,
  file,
  title = "Crop image",
  aspect = 16 / 9,
  onCancel,
  onConfirm,
}: Props) {
  useBodyScrollLock(open);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [lockAspect, setLockAspect] = useState(true);
  const [imageAspect, setImageAspect] = useState<number | null>(null);
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) return;
    // Reset state when opening a new crop session
    setCrop(undefined);
    setLockAspect(true);
    setImageAspect(null);
    setImageSize(null);
    setError(null);
    setPending(false);
  }, [open, file]);

  if (!open) return null;

  const effectiveAspect = lockAspect ? (imageAspect ?? aspect) : undefined;

  function percentFromPixel(px: number, dimension: number) {
    if (!dimension) return 0;
    return (px / dimension) * 100;
  }

  function applyOriginalAspectToCurrentCrop(nextLockAspect: boolean) {
    if (!nextLockAspect) return;
    if (!imageAspect || !imageSize) {
      setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 });
      return;
    }

    const baseCrop = crop ?? { unit: "%", x: 0, y: 0, width: 100, height: 100 };
    const px = convertToPixelCrop(baseCrop, imageSize.w, imageSize.h);
    const cx = px.x + px.width / 2;
    const cy = px.y + px.height / 2;

    let newW = px.width;
    let newH = px.height;
    const currentAspect = px.width / Math.max(1, px.height);
    const targetAspect = imageAspect;

    if (currentAspect > targetAspect) {
      newW = newH * targetAspect;
    } else {
      newH = newW / targetAspect;
    }

    newW = Math.min(newW, imageSize.w);
    newH = Math.min(newH, imageSize.h);
    let x = cx - newW / 2;
    let y = cy - newH / 2;
    x = clamp(x, 0, imageSize.w - newW);
    y = clamp(y, 0, imageSize.h - newH);

    setCrop({
      unit: "%",
      x: percentFromPixel(x, imageSize.w),
      y: percentFromPixel(y, imageSize.h),
      width: percentFromPixel(newW, imageSize.w),
      height: percentFromPixel(newH, imageSize.h),
    });
  }

  async function handleConfirm() {
    if (!file || !crop || !imgRef.current) return;
    setPending(true);
    setError(null);
    try {
      const type = pickOutputType(file);
      const cropped = await getCroppedFile(file, imgRef.current, crop, type);
      onConfirm(cropped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to crop image");
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-0 sm:p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="image-crop-title"
      onClick={() => !pending && onCancel()}
    >
      <div
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[92dvh] sm:max-w-5xl sm:rounded-2xl sm:border sm:border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <h2 id="image-crop-title" className="text-sm font-semibold text-stone-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-4">
          {/* Give crop handles room so they don't get clipped at edges */}
          <div className="relative min-h-0 flex-1 rounded-lg bg-stone-900 p-3 sm:p-4">
            {previewUrl ? (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                aspect={effectiveAspect}
                keepSelection
                ruleOfThirds
                disabled={pending}
                className="max-h-full overflow-visible"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  alt="Crop preview"
                  src={previewUrl}
                  className="max-h-[58dvh] w-full select-none object-contain sm:max-h-[68dvh]"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    const w = img.naturalWidth || img.width;
                    const h = img.naturalHeight || img.height;
                    setImageAspect(w > 0 && h > 0 ? w / h : null);
                    setImageSize(w > 0 && h > 0 ? { w, h } : null);
                    // Start with the full image selected (no crop).
                    setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 });
                  }}
                />
              </ReactCrop>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-stone-200">No image selected</div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <p className="text-xs text-stone-500">
                Drag the crop box corners/edges to select the area. Then we’ll auto resize/compress before uploading.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    const next = !lockAspect;
                    setLockAspect(next);
                    applyOriginalAspectToCurrentCrop(next);
                    if (!next) {
                      // Keep the current selection when unlocking; if none yet, default to full image.
                      setCrop((prev) => prev ?? { unit: "%", x: 0, y: 0, width: 100, height: 100 });
                    }
                  }}
                  aria-pressed={lockAspect}
                  className="group inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-2 py-1.5 text-sm font-medium text-stone-800 shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-50"
                  title={lockAspect ? "Aspect ratio locked" : "Free crop"}
                >
                  <span className="text-xs text-stone-600">Original Ratio</span>
                  <span
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      lockAspect ? "bg-stone-800" : "bg-stone-300"
                    }`}
                  >
                    <span
                      className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        lockAspect ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                    <span className="absolute left-2 top-1.5 text-[10px] text-stone-700">
                      {lockAspect ? "" : " "}
                    </span>
                    <span className="absolute right-2 top-1.5 text-[10px] text-white/80">
                      {lockAspect ? "" : " "}
                    </span>
                  </span>
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={pending}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending || !file || !crop}
                className="rounded-lg border border-stone-300 bg-stone-800 px-3 py-2 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-50"
              >
                {pending ? "Cropping…" : "Use crop"}
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

