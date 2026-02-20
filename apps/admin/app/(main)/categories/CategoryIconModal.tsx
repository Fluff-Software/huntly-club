"use client";

import Image from "next/image";
import { useRef, useState, useTransition, useEffect } from "react";
import { uploadCategoryIcon } from "@/lib/upload-actions";

type CategoryIconModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentIcon: string | null;
  onSelect: (url: string | null) => void;
};

export function CategoryIconModal({
  isOpen,
  onClose,
  currentIcon,
  onSelect,
}: CategoryIconModalProps) {
  const [url, setUrl] = useState(currentIcon ?? "");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) setUrl(currentIcon ?? "");
  }, [isOpen, currentIcon]);

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadCategoryIcon(formData);
      if (result.error) {
        setUploadError(result.error);
        return;
      }
      if (result.url) setUrl(result.url);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleConfirm() {
    const trimmed = url.trim();
    onSelect(trimmed || null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-stone-900">Category icon</h3>
        <p className="mb-2 text-sm text-stone-600">Image URL or upload a photo</p>
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setUploadError(null);
          }}
          placeholder="https://..."
          className="mb-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
        />
        <div className="mb-4 flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            disabled={isPending}
            className="block w-full max-w-xs text-sm text-stone-600 file:mr-2 file:rounded-lg file:border-0 file:bg-huntly-forest file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
          />
          {isPending && <span className="text-sm text-stone-500">Uploading…</span>}
        </div>
        {uploadError && (
          <p className="mb-2 text-sm text-red-600" role="alert">
            {uploadError}
          </p>
        )}
        {(url && url.trim()) && (
          <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-lg border border-stone-200">
            <Image
              src={url}
              alt=""
              fill
              className="object-contain"
              unoptimized={!url.includes("supabase.co")}
            />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-lg bg-huntly-forest px-4 py-2 text-sm font-medium text-white hover:bg-huntly-leaf"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
