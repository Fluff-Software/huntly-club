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
  enableBlur?: boolean;
  confirmLabel?: string;
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
  outputType: "image/jpeg" | "image/webp",
  blur?: { maskCanvas: HTMLCanvasElement; blurPx: number }
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

    if (blur && blur.blurPx > 0) {
      const blurCanvas = document.createElement("canvas");
      blurCanvas.width = canvas.width;
      blurCanvas.height = canvas.height;
      const bctx = blurCanvas.getContext("2d");
      if (!bctx) throw new Error("Canvas 2D context unavailable");
      bctx.imageSmoothingEnabled = true;
      bctx.imageSmoothingQuality = "high";
      bctx.filter = `blur(${Math.max(0, blur.blurPx) * pixelRatio}px)`;
      bctx.drawImage(canvas, 0, 0);

      const maskCrop = document.createElement("canvas");
      maskCrop.width = canvas.width;
      maskCrop.height = canvas.height;
      const mctx = maskCrop.getContext("2d");
      if (!mctx) throw new Error("Canvas 2D context unavailable");
      mctx.imageSmoothingEnabled = true;
      mctx.imageSmoothingQuality = "high";
      mctx.drawImage(
        blur.maskCanvas,
        clamp(pixelCrop.x, 0, blur.maskCanvas.width - 1),
        clamp(pixelCrop.y, 0, blur.maskCanvas.height - 1),
        clamp(pixelCrop.width, 1, blur.maskCanvas.width),
        clamp(pixelCrop.height, 1, blur.maskCanvas.height),
        0,
        0,
        maskCrop.width,
        maskCrop.height
      );

      const blurLayer = document.createElement("canvas");
      blurLayer.width = canvas.width;
      blurLayer.height = canvas.height;
      const blctx = blurLayer.getContext("2d");
      if (!blctx) throw new Error("Canvas 2D context unavailable");
      blctx.drawImage(blurCanvas, 0, 0);
      blctx.globalCompositeOperation = "destination-in";
      blctx.drawImage(maskCrop, 0, 0);

      ctx.drawImage(blurLayer, 0, 0);
    }

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
  enableBlur = false,
  confirmLabel = "Use crop",
  onCancel,
  onConfirm,
}: Props) {
  useBodyScrollLock(open);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const imgBoxRef = useRef<HTMLDivElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [lockAspect, setLockAspect] = useState(true);
  const [isCropping, setIsCropping] = useState(false);
  const [isBlurring, setIsBlurring] = useState(false);
  const [blurPx, setBlurPx] = useState(14);
  const [brushSize, setBrushSize] = useState(46); // in CSS px, mapped to natural pixels on paint
  const [brushPos, setBrushPos] = useState<{ x: number; y: number } | null>(null);
  const [imageAspect, setImageAspect] = useState<number | null>(null);
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPortrait = imageAspect != null ? imageAspect < 1 : false;
  const blurMaskRef = useRef<HTMLCanvasElement | null>(null); // natural-pixel-space alpha mask
  const blurOverlayRef = useRef<HTMLCanvasElement | null>(null); // display-space preview overlay

  function requestCancel() {
    if (pending || isCropping || isBlurring) return;
    onCancel();
  }

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
      if (e.key === "Escape") requestCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, requestCancel]);

  useEffect(() => {
    if (!open) return;
    // Reset state when opening a new crop session
    setCrop(undefined);
    setLockAspect(true);
    setIsCropping(false);
    setIsBlurring(false);
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
      const blur =
        enableBlur && blurMaskRef.current && blurPx > 0
          ? { maskCanvas: blurMaskRef.current, blurPx }
          : undefined;
      const cropped = await getCroppedFile(file, imgRef.current, crop, type, blur);
      onConfirm(cropped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to crop image");
      setPending(false);
    }
  }

  function handleResetCrop() {
    if (pending) return;
    setError(null);
    setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 });
    if (enableBlur && blurMaskRef.current) {
      const m = blurMaskRef.current.getContext("2d");
      m?.clearRect(0, 0, blurMaskRef.current.width, blurMaskRef.current.height);
    }
    if (blurOverlayRef.current) {
      const o = blurOverlayRef.current.getContext("2d");
      o?.clearRect(0, 0, blurOverlayRef.current.width, blurOverlayRef.current.height);
    }
  }

  function renderBlurOverlay() {
    if (!enableBlur) return;
    const img = imgRef.current;
    const overlay = blurOverlayRef.current;
    const mask = blurMaskRef.current;
    if (!img || !overlay || !mask) return;

    const rect = img.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (overlay.width !== w || overlay.height !== h) {
      overlay.width = w;
      overlay.height = h;
    }
    const octx = overlay.getContext("2d");
    if (!octx) return;
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, w, h);

    const temp = document.createElement("canvas");
    temp.width = w;
    temp.height = h;
    const tctx = temp.getContext("2d");
    if (!tctx) return;
    tctx.imageSmoothingEnabled = true;
    tctx.imageSmoothingQuality = "high";
    tctx.filter = `blur(${Math.max(0, blurPx) * dpr}px)`;
    tctx.drawImage(img, 0, 0, w, h);
    tctx.globalCompositeOperation = "destination-in";
    tctx.filter = "none";
    tctx.drawImage(mask, 0, 0, mask.width, mask.height, 0, 0, w, h);

    octx.drawImage(temp, 0, 0);
  }

  function paintBlurAt(clientX: number, clientY: number) {
    if (!enableBlur || !isBlurring) return;
    const img = imgRef.current;
    const mask = blurMaskRef.current;
    if (!img || !mask) return;

    const rect = img.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * mask.width;
    const ny = ((clientY - rect.top) / rect.height) * mask.height;
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) return;

    const r = (brushSize / rect.width) * mask.width * 0.5;
    const ctx = mask.getContext("2d");
    if (!ctx) return;

    // Soft brush (Photoshop-like): radial gradient alpha
    const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, Math.max(1, r));
    g.addColorStop(0, "rgba(255,255,255,0.85)");
    g.addColorStop(0.6, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(nx, ny, Math.max(1, r), 0, Math.PI * 2);
    ctx.fill();

    renderBlurOverlay();
  }

  function updateBrushPos(clientX: number, clientY: number) {
    if (!enableBlur || !isBlurring) return;
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      setBrushPos(null);
      return;
    }
    setBrushPos({ x, y });
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-0 sm:p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="image-crop-title"
      onClick={() => requestCancel()}
    >
      <style jsx global>{`
        /* When "preview" mode is on, keep a subtle mask to show what's cropped off. */
        [data-crop-mask="off"] .ReactCrop__crop-mask {
          opacity: 0.65 !important;
        }
        [data-crop-mask="off"] .ReactCrop__crop-selection {
          box-shadow: none !important;
        }

        /* When blurring, make sure the brush layer receives pointer events. */
        [data-tool="blur"] .ReactCrop__crop-mask,
        [data-tool="blur"] .ReactCrop__crop-selection,
        [data-tool="blur"] .ReactCrop__drag-handle {
          pointer-events: none !important;
        }
      `}</style>
      <div
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[92dvh] sm:max-w-5xl sm:rounded-2xl sm:border sm:border-stone-200"
        onClick={(e) => e.stopPropagation()}
        data-tool={isBlurring ? "blur" : undefined}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <h2 id="image-crop-title" className="text-sm font-semibold text-stone-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={requestCancel}
            disabled={pending || isCropping}
            className="rounded-md px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-4">
          {/* Give crop handles room so they don't get clipped at edges */}
          <div
            className="relative z-0 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-stone-900 p-3 sm:p-4"
            data-crop-mask={isCropping ? "on" : "off"}
          >
            {previewUrl ? (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                aspect={effectiveAspect}
                keepSelection
                ruleOfThirds
                disabled={pending || !isCropping || isBlurring}
                className="max-h-full max-w-full overflow-visible"
              >
                <div
                  ref={imgBoxRef}
                  className={`relative inline-block ${isBlurring ? "cursor-crosshair" : ""}`}
                  style={isBlurring ? ({ touchAction: "none" } as const) : undefined}
                  onPointerDown={(e) => {
                    if (!isBlurring) return;
                    e.preventDefault();
                    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                    updateBrushPos(e.clientX, e.clientY);
                    paintBlurAt(e.clientX, e.clientY);
                  }}
                  onPointerMove={(e) => {
                    if (!isBlurring) return;
                    e.preventDefault();
                    updateBrushPos(e.clientX, e.clientY);
                    if ((e.buttons & 1) !== 1) return;
                    paintBlurAt(e.clientX, e.clientY);
                  }}
                  onPointerUp={(e) => {
                    if (!isBlurring) return;
                    e.preventDefault();
                    try {
                      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
                    } catch {
                      // ignore
                    }
                  }}
                  onPointerLeave={() => setBrushPos(null)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    alt="Crop preview"
                    src={previewUrl}
                    draggable={false}
                    className={`max-w-full select-none object-contain ${
                      isPortrait
                        ? "h-[calc(100dvh-18rem)] w-auto sm:h-[calc(92dvh-18rem)]"
                        : "h-auto w-full max-h-[calc(100dvh-18rem)] sm:max-h-[calc(92dvh-18rem)]"
                    }`}
                    onDragStart={(e) => e.preventDefault()}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      const w = img.naturalWidth || img.width;
                      const h = img.naturalHeight || img.height;
                      setImageAspect(w > 0 && h > 0 ? w / h : null);
                      setImageSize(w > 0 && h > 0 ? { w, h } : null);
                      // Start with the full image selected (no crop).
                      setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 });

                      if (enableBlur) {
                        const mask = document.createElement("canvas");
                        mask.width = Math.max(1, Math.round(w));
                        mask.height = Math.max(1, Math.round(h));
                        blurMaskRef.current = mask;
                        // Ensure overlay is synced when the image size changes.
                        requestAnimationFrame(() => renderBlurOverlay());
                      }
                    }}
                  />

                  {enableBlur && (
                    <canvas
                      ref={blurOverlayRef}
                      className={`pointer-events-none absolute inset-0 ${
                        isBlurring ? "opacity-100" : "opacity-100"
                      }`}
                      aria-hidden
                    />
                  )}

                  {enableBlur && isBlurring && brushPos && (
                    <div
                      className="pointer-events-none absolute rounded-full border-2 border-white/80 ring-1 ring-black/40"
                      style={{
                        left: brushPos.x,
                        top: brushPos.y,
                        width: brushSize,
                        height: brushSize,
                        transform: "translate(-50%, -50%)",
                      }}
                      aria-hidden
                    />
                  )}
                </div>
              </ReactCrop>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-stone-200">No image selected</div>
            )}
          </div>

          <div className="relative z-10 mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <p className="text-xs text-stone-500">
                Drag the crop box corners/edges to select the area. Then we’ll auto resize/compress before uploading.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={pending || !file}
                  onClick={() => {
                    setIsCropping((v) => {
                      const next = !v;
                      if (next) setIsBlurring(false);
                      return next;
                    });
                  }}
                  aria-pressed={isCropping}
                  className="group inline-flex h-10 items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-0 text-sm font-medium text-stone-800 shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-50"
                  title={isCropping ? "Cropping (mask on)" : "Preview (mask off)"}
                >
                  <span className="text-xs text-stone-600">Crop</span>
                  <span
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      isCropping ? "bg-stone-800" : "bg-stone-300"
                    }`}
                  >
                    <span
                      className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        isCropping ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </span>
                </button>
                {enableBlur && (
                  <button
                    type="button"
                    disabled={pending || !file}
                    onClick={() => {
                      setIsBlurring((v) => {
                        const next = !v;
                        if (next) setIsCropping(false);
                        if (!next) setBrushPos(null);
                        // Keep existing mask; just redraw overlay.
                        requestAnimationFrame(() => renderBlurOverlay());
                        return next;
                      });
                    }}
                    aria-pressed={isBlurring}
                    className="group inline-flex h-10 items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-0 text-sm font-medium text-stone-800 shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-50"
                    title={isBlurring ? "Blur tool on" : "Blur tool off"}
                  >
                    <span className="text-xs text-stone-600">Blur</span>
                    <span
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                        isBlurring ? "bg-stone-800" : "bg-stone-300"
                      }`}
                    >
                      <span
                        className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          isBlurring ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </span>
                  </button>
                )}
                {isCropping && (
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
                    className="group inline-flex h-10 items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-0 text-sm font-medium text-stone-800 shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-50"
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
                )}
                {isCropping && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={handleResetCrop}
                    className="inline-flex h-10 items-center rounded-full border border-stone-300 bg-white px-4 py-0 text-sm font-medium text-stone-800 shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-50"
                  >
                    Reset
                  </button>
                )}
              </div>
              {enableBlur && isBlurring && (
                <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 bg-white/70 px-3 py-2 text-xs text-stone-700">
                  <label className="flex items-center gap-2">
                    <span className="text-stone-500">Brush</span>
                    <input
                      type="range"
                      min={12}
                      max={140}
                      value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                      className="w-40"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-stone-500">Strength</span>
                    <input
                      type="range"
                      min={4}
                      max={28}
                      value={blurPx}
                      onChange={(e) => {
                        setBlurPx(parseInt(e.target.value, 10));
                        requestAnimationFrame(() => renderBlurOverlay());
                      }}
                      className="w-40"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleResetCrop}
                    disabled={pending}
                    className="ml-auto rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                  >
                    Clear blur
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={requestCancel}
                disabled={pending || isCropping}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending || isCropping || !file || !crop}
                className="rounded-lg border border-stone-300 bg-stone-800 px-3 py-2 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-50"
              >
                {pending ? "Editing…" : confirmLabel}
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

