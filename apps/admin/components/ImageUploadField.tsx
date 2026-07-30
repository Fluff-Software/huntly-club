"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import {
  uploadSeasonImage,
  uploadActivityImage,
  uploadExploreCardImage,
} from "@/lib/upload-actions";
import { compressImageFileForUpload } from "@/lib/client-image-resize";
import { ImageCropModal } from "@/components/ImageCropModal";
import {
  MISSION_MEDIA_ASPECT,
  SEASON_HERO_ASPECT,
  PHOTO_REVIEW_ASPECT,
  imageAspectStyle,
} from "@/lib/image-aspects";

type ImageUploadFieldProps = {
  name: string;
  label: string;
  prefix?: "heroes" | "chapters";
  uploadKind?: "season" | "activity" | "explore";
  /** Used for explore uploads to name the storage object `{slug}.ext`. */
  slug?: string;
  defaultValue?: string | null;
  help?: string;
  onUrlChange?: (url: string) => void;
};

export function ImageUploadField({
  name,
  label,
  prefix = "heroes",
  uploadKind = "season",
  slug,
  defaultValue = "",
  help,
  onUrlChange,
}: ImageUploadFieldProps) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hasValidPreview, setHasValidPreview] = useState(true);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    e.target.blur();
    setUploadError(null);
    setPendingFile(file);
    setCropOpen(true);
  }

  function handleChooseFileClick() {
    const scrollEl = document.querySelector<HTMLElement>("main[data-app-scroll]");
    const savedScrollTop = scrollEl?.scrollTop ?? 0;
    fileInputRef.current?.click();
    requestAnimationFrame(() => {
      if (scrollEl) scrollEl.scrollTop = savedScrollTop;
    });
  }

  function resetFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleCancelCrop() {
    if (isPending) return;
    setCropOpen(false);
    setPendingFile(null);
    resetFileInput();
  }

  function handleConfirmCrop(croppedFile: File) {
    setCropOpen(false);
    setPendingFile(null);
    startTransition(async () => {
      let fileToUpload = croppedFile;
      try {
        fileToUpload = await compressImageFileForUpload(croppedFile);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Failed to process image");
        return;
      }
      const formData = new FormData();
      formData.set("file", fileToUpload);
      if (uploadKind === "season") formData.set("prefix", prefix);
      if (uploadKind === "explore" && slug) formData.set("slug", slug);

      let result: { url?: string; error?: string };
      if (uploadKind === "activity") {
        result = await uploadActivityImage(formData);
      } else if (uploadKind === "explore") {
        result = await uploadExploreCardImage(formData);
      } else {
        result = await uploadSeasonImage(formData);
      }

      if (result.error) {
        setUploadError(result.error);
        return;
      }
      if (result.url) {
        setUrl(result.url);
        setHasValidPreview(true);
        onUrlChange?.(result.url);
      }
      resetFileInput();
    });
  }

  const previewAspect =
    uploadKind === "activity"
      ? MISSION_MEDIA_ASPECT
      : uploadKind === "explore"
        ? PHOTO_REVIEW_ASPECT
        : SEASON_HERO_ASPECT;

  const cropTitle =
    uploadKind === "season"
      ? "Crop hero image"
      : uploadKind === "explore"
        ? "Crop card artwork"
        : "Crop activity image";

  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-stone-700">
        {label}
      </label>
      {help && <p className="mb-1 text-xs text-stone-500">{help}</p>}
      <input id={name} name={name} type="hidden" value={url} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="relative">
          <button
            type="button"
            onClick={handleChooseFileClick}
            disabled={isPending}
            className="rounded-lg bg-huntly-forest px-4 py-2 text-sm font-medium text-white hover:bg-huntly-leaf disabled:opacity-50"
          >
            Choose file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            tabIndex={-1}
            aria-hidden
            className="absolute h-0 w-0 overflow-hidden opacity-0"
            onChange={handleFileChange}
          />
        </span>
        {isPending && (
          <span className="text-sm text-stone-500">Uploading…</span>
        )}
      </div>
      {uploadError && (
        <p id={`${name}-upload-error`} className="mt-1 text-sm text-red-600" role="alert">
          {uploadError}
        </p>
      )}
      {url && hasValidPreview && (
        <div
          className="relative mt-2 w-full max-w-sm overflow-hidden rounded-lg border border-stone-200"
          style={imageAspectStyle(previewAspect)}
        >
          <Image
            src={url}
            alt=""
            fill
            className="object-cover"
            unoptimized={!url.includes("supabase.co")}
            onError={() => setHasValidPreview(false)}
          />
        </div>
      )}
      <ImageCropModal
        open={cropOpen}
        file={pendingFile}
        title={cropTitle}
        aspect={previewAspect}
        onCancel={handleCancelCrop}
        onConfirm={handleConfirmCrop}
      />
    </div>
  );
}
