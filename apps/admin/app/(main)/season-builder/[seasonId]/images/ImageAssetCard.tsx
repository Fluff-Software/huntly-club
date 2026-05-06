"use client";

import { useState, useTransition } from "react";
import { updateImagePrompt, generateImageForAsset, approveImageAsset } from "./actions";

type Asset = {
  id: number;
  entity_type: string;
  entity_id: number;
  slot_key: string | null;
  prompt: string | null;
  prompt_status: string;
  storage_path: string | null;
  status: string;
  notes: string | null;
};

type Props = {
  asset: Asset;
  seasonId: number;
  chapterLabel?: string;
};

export function ImageAssetCard({ asset, seasonId, chapterLabel }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [prompt, setPrompt] = useState(asset.prompt ?? "");
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<"fast" | "quality">("fast");

  function handleSavePrompt() {
    setError(null);
    const formData = new FormData();
    formData.set("prompt", prompt);
    startTransition(async () => {
      const result = await updateImagePrompt(asset.id, seasonId, formData);
      if (result.error) setError(result.error);
      else setIsEditingPrompt(false);
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

  const canGenerate = !!asset.prompt && asset.status !== "approved";
  const canApprove = asset.status === "image_uploaded";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-stone-600 capitalize">
            {asset.entity_type.replace(/_/g, " ")}
            {asset.slot_key ? ` · ${asset.slot_key}` : ""}
          </span>
          {chapterLabel && (
            <span className="text-xs text-stone-400">{chapterLabel}</span>
          )}
        </div>
      </div>

      {/* Image preview */}
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
          {isPending ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-huntly-forest border-t-transparent" />
              <span className="text-xs text-stone-500">Generating…</span>
            </div>
          ) : (
            <span className="text-xs text-stone-400">No image yet</span>
          )}
        </div>
      )}

      {/* Prompt */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-stone-600">Image prompt</span>
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

      {/* Actions */}
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
              <option value="fast">Fast (~$0.003)</option>
              <option value="quality">Quality (~$0.04)</option>
            </select>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPending || !asset.prompt}
              className="flex items-center gap-1.5 rounded-lg border border-huntly-forest/30 bg-huntly-forest/5 px-3 py-1.5 text-xs font-medium text-huntly-forest hover:bg-huntly-forest/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>🧭</span>
              {asset.storage_path ? "Regenerate" : "Generate image"}
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
    </div>
  );
}
