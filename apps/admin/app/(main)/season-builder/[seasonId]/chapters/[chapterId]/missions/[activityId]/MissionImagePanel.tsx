"use client";

import { useRef, useState, useTransition } from "react";
import { uploadActivityImage } from "@/lib/upload-actions";
import { resizeImageFileForUpload } from "@/lib/client-image-resize";
import { ImageCropModal } from "@/components/ImageCropModal";
import { updateImagePrompt, generateImageForAsset, approveImageAsset } from "../../../../images/actions";
import { attachUploadedImageToAsset, regenerateActivityCoverPrompt } from "./actions";

type Asset = {
  id: number;
  prompt: string | null;
  storage_path: string | null;
  status: string;
};

type Props = {
  asset: Asset;
  seasonId: number;
  chapterId: number;
  activityId: number;
};

export function MissionImagePanel({ asset, seasonId, chapterId, activityId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [prompt, setPrompt] = useState(asset.prompt ?? "");
  const [quality, setQuality] = useState<"fast" | "quality">("fast");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const canGenerate = !!(asset.prompt ?? "").trim() && asset.status !== "approved";
  const canApprove = asset.status === "image_uploaded";

  function resetFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSavePrompt() {
    setError(null);
    const fd = new FormData();
    fd.set("prompt", prompt);
    startTransition(async () => {
      const result = await updateImagePrompt(asset.id, seasonId, fd);
      if (result.error) setError(result.error);
      else setIsEditingPrompt(false);
    });
  }

  function handleAutoGeneratePrompt() {
    setError(null);
    startTransition(async () => {
      const result = await regenerateActivityCoverPrompt({
        seasonId,
        chapterId,
        activityId,
        imageAssetId: asset.id,
      });
      if (result.error) setError(result.error);
      if (result.prompt) {
        setPrompt(result.prompt);
        setIsEditingPrompt(true);
      }
    });
  }

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateImageForAsset(asset.id, seasonId, quality);
      if (result.error) setError(result.error);
    });
  }

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveImageAsset(asset.id, seasonId);
      if (result.error) setError(result.error);
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPendingFile(file);
    setCropOpen(true);
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
      try {
        const resized = await resizeImageFileForUpload(croppedFile, {
          maxBytes: 4_800_000,
          maxWidth: 2560,
          maxHeight: 2560,
          outputType: "image/webp",
        });
        const uploadFd = new FormData();
        uploadFd.set("file", resized);
        const uploaded = await uploadActivityImage(uploadFd);
        if (uploaded.error) {
          setError(uploaded.error);
          return;
        }
        if (!uploaded.url) {
          setError("Upload failed");
          return;
        }
        const attached = await attachUploadedImageToAsset({
          seasonId,
          chapterId,
          activityId,
          imageAssetId: asset.id,
          publicUrl: uploaded.url,
        });
        if (attached.error) setError(attached.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        resetFileInput();
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-stone-600">Mission image</span>
      </div>

      {asset.storage_path ? (
        <div className="overflow-hidden rounded-lg bg-stone-100 aspect-video">
          <img
            src={asset.storage_path}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-lg border-2 border-dashed border-stone-200 bg-stone-50">
          <span className="text-xs text-stone-400">
            {isPending ? "Working…" : "No image yet"}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-stone-600">Image prompt</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoGeneratePrompt}
              disabled={isPending}
              className="text-xs text-huntly-forest hover:underline disabled:opacity-50"
            >
              Generate prompt
            </button>
            {!isEditingPrompt && (
              <button
                type="button"
                onClick={() => setIsEditingPrompt(true)}
                className="text-xs text-huntly-forest hover:underline"
              >
                {asset.prompt ? "Edit" : "Add prompt"}
              </button>
            )}
          </div>
        </div>

        {isEditingPrompt ? (
          <div className="flex flex-col gap-2">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image in detail…"
              className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-xs text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSavePrompt}
                disabled={isPending}
                className="rounded-lg bg-huntly-forest px-3 py-1.5 text-xs font-medium text-white hover:bg-huntly-leaf disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrompt(asset.prompt ?? "");
                  setIsEditingPrompt(false);
                }}
                className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : asset.prompt ? (
          <p className="text-xs text-stone-500 italic line-clamp-3">{asset.prompt}</p>
        ) : (
          <p className="text-xs text-stone-400">No prompt yet</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">
            Upload / choose image
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            disabled={isPending}
            className="block w-full text-xs text-stone-600 file:mr-2 file:rounded-lg file:border-0 file:bg-huntly-forest file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white file:hover:bg-huntly-leaf"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 border-t border-stone-100 pt-2">
        {canGenerate && (
          <>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as "fast" | "quality")}
              className="rounded-lg border border-stone-200 px-2 py-1.5 text-xs text-stone-700 focus:border-huntly-sage focus:outline-none"
            >
              <option value="fast">Fast</option>
              <option value="quality">Quality</option>
            </select>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPending || !(asset.prompt ?? "").trim()}
              className="rounded-lg border border-huntly-forest/30 bg-huntly-forest/5 px-3 py-1.5 text-xs font-medium text-huntly-forest hover:bg-huntly-forest/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {asset.storage_path ? "Regenerate" : "Generate"}
            </button>
          </>
        )}

        {canApprove && (
          <button
            type="button"
            onClick={handleApprove}
            disabled={isPending}
            className="ml-auto rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Approve ✓
          </button>
        )}

        {asset.status === "approved" && (
          <span className="ml-auto text-xs font-medium text-green-700">✓ Approved</span>
        )}
      </div>

      <ImageCropModal
        open={cropOpen}
        file={pendingFile}
        title="Crop mission image"
        aspect={16 / 9}
        onCancel={handleCancelCrop}
        onConfirm={handleConfirmCrop}
      />
    </div>
  );
}

