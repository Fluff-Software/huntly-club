"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { uploadResourceFileAction } from "@/lib/upload-actions";

const RESOURCE_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,image/gif";

type FileUploadFieldProps = {
  name: string;
  label: string;
  defaultValue?: string | null;
  help?: string;
};

function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url) || /image\/(jpeg|png|webp|gif)/.test(url);
}

export function FileUploadField({
  name,
  label,
  defaultValue = "",
  help,
}: FileUploadFieldProps) {
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
      formData.set("prefix", "resources");
      const result = await uploadResourceFileAction(formData);
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

  const showImagePreview = url && isImageUrl(url);

  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-stone-700">
        {label}
      </label>
      {help && <p className="mb-1 text-xs text-stone-500">{help}</p>}
      {/* Hidden field used by server actions on submit */}
      <input id={name} name={name} type="hidden" value={url} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={RESOURCE_ACCEPT}
          onChange={handleFileChange}
          disabled={isPending}
          className="block w-full max-w-xs text-sm text-stone-600 file:mr-2 file:rounded-lg file:border-0 file:bg-huntly-forest file:px-4 file:py-2 file:text-sm file:font-medium file:text-white file:hover:bg-huntly-leaf"
          aria-label="Choose PDF or image file to upload"
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
      {!url && !isPending && !uploadError && (
        <p className="mt-2 text-sm text-stone-600">No file uploaded yet.</p>
      )}
      {url && !showImagePreview && (
        <p className="mt-2 text-sm text-stone-600">
          File uploaded. {url.includes(".pdf") || url.includes("application/pdf") ? "PDF" : "File"} will be available for download in the app.
        </p>
      )}
      {showImagePreview && (
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
