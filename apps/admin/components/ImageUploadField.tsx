"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import {
  uploadSeasonImage,
  uploadActivityImage,
} from "@/lib/upload-actions";

type ImageUploadFieldProps = {
  name: string;
  label: string;
  prefix?: "heroes" | "chapters";
  uploadKind?: "season" | "activity";
  defaultValue?: string | null;
  help?: string;
};

export function ImageUploadField({
  name,
  label,
  prefix = "heroes",
  uploadKind = "season",
  defaultValue = "",
  help,
}: ImageUploadFieldProps) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      if (uploadKind === "season") formData.set("prefix", prefix);
      const result =
        uploadKind === "activity"
          ? await uploadActivityImage(formData)
          : await uploadSeasonImage(formData);
      if (result.error) {
        setUploadError(result.error);
        return;
      }
      if (result.url) {
        setUrl(result.url);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-stone-700">
        {label}
      </label>
      {help && <p className="mb-1 text-xs text-stone-500">{help}</p>}
      <input
        id={name}
        name={name}
        type="url"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setUploadError(null);
        }}
        placeholder="Upload a file or paste a URL"
        className="mb-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
        aria-describedby={uploadError ? `${name}-upload-error` : undefined}
      />
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          disabled={isPending}
          className="block w-full max-w-xs text-sm text-stone-600 file:mr-2 file:rounded-lg file:border-0 file:bg-huntly-forest file:px-4 file:py-2 file:text-sm file:font-medium file:text-white file:hover:bg-huntly-leaf"
          aria-label="Choose image file to upload"
        />
        {isPending && (
          <span className="text-sm text-stone-500">Uploading…</span>
        )}
      </div>
      {uploadError && (
        <p id={`${name}-upload-error`} className="mt-1 text-sm text-red-600" role="alert">
          {uploadError}
        </p>
      )}
      {url && (
        <div className="relative mt-2 h-40 w-full max-w-sm overflow-hidden rounded-lg border border-stone-200">
          <Image
            src={url}
            alt=""
            fill
            className="object-contain"
            unoptimized={!url.includes("supabase.co")}
          />
        </div>
      )}
    </div>
  );
}
