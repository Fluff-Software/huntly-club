"use client";

import Image from "next/image";
import { useRef, useState, useEffect } from "react";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

type CategoryIconModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentIcon: string | null;
  /** When reopening for a row that has a pending file, pass it so Done preserves it */
  initialPendingFile?: File | null;
  onSelect: (url: string | null, file?: File) => void;
};

export function CategoryIconModal({
  isOpen,
  onClose,
  currentIcon,
  initialPendingFile,
  onSelect,
}: CategoryIconModalProps) {
  const [url, setUrl] = useState(currentIcon ?? "");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(currentIcon ?? "");
      setPendingFile(initialPendingFile ?? null);
      setFileError(null);
    }
  }, [isOpen, currentIcon, initialPendingFile]);

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError("Invalid file type. Use JPEG, PNG, WebP or GIF.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setFileError("File too large. Maximum size is 5MB.");
      return;
    }
    setPendingFile(file);
    setUrl(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleConfirm() {
    if (pendingFile) {
      onSelect(null, pendingFile);
    } else {
      const trimmed = url.trim();
      onSelect(trimmed || null);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-stone-900">Category icon</h3>
        <p className="mb-2 text-sm text-stone-600">Image URL or choose a photo (uploaded when you Save)</p>
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setPendingFile(null);
            setFileError(null);
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
            className="block w-full max-w-xs text-sm text-stone-600 file:mr-2 file:rounded-lg file:border-0 file:bg-huntly-forest file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
          />
          {pendingFile && (
            <span className="text-sm text-stone-500">Will upload when you Save</span>
          )}
        </div>
        {fileError && (
          <p className="mb-2 text-sm text-red-600" role="alert">
            {fileError}
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
