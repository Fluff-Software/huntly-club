"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/Button";
import { uploadSlideImage } from "@/lib/upload-actions";

export type SlidePart = { type: "text"; value: string } | { type: "image"; value: string };

type SlidePartsFieldProps = {
  name: string;
  label: string;
  initialSlides: SlidePart[];
  help?: string;
  uploadPrefix?: string | null;
};

export function SlidePartsField({
  name,
  label,
  initialSlides,
  help,
  uploadPrefix,
}: SlidePartsFieldProps) {
  const [slides, setSlides] = useState<SlidePart[]>(
    initialSlides.length > 0 ? initialSlides : [{ type: "text", value: "" }]
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const addSlide = () => setSlides((prev) => [...prev, { type: "text", value: "" }]);
  const removeSlide = (index: number) =>
    setSlides((prev) => (prev.length <= 1 ? [{ type: "text", value: "" }] : prev.filter((_, i) => i !== index)));
  const setSlide = (index: number, part: SlidePart) =>
    setSlides((prev) => {
      const next = [...prev];
      next[index] = part;
      return next;
    });

  async function handleFileChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadPrefix) return;
    setUploadError(null);
    setUploadingIndex(index);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("prefix", uploadPrefix);
    const result = await uploadSlideImage(formData);
    setUploadingIndex(null);
    if (result.error) {
      setUploadError(result.error);
      return;
    }
    if (result.url) setSlide(index, { type: "image", value: result.url });
    if (fileInputRefs.current[index]) fileInputRefs.current[index]!.value = "";
  }

  const canAddImage = Boolean(uploadPrefix);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="block text-sm font-medium text-stone-700">{label}</label>
        <Button type="button" variant="ghost" size="sm" onClick={addSlide}>
          Add slide
        </Button>
      </div>
      {help && <p className="mb-2 text-sm text-stone-500">{help}</p>}
      {!canAddImage && (
        <p className="mb-2 text-xs text-stone-500">Save the season or chapter first to add image slides.</p>
      )}
      <input type="hidden" name={name} value={JSON.stringify(slides)} readOnly />
      <div className="space-y-4">
        {slides.map((slide, index) => (
          <div
            key={index}
            className="rounded-lg border border-stone-200 bg-stone-50/50 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-stone-600">Slide {index + 1}</span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => removeSlide(index)}
                disabled={slides.length <= 1}
                aria-label={`Remove slide ${index + 1}`}
              >
                Remove
              </Button>
            </div>
            <div className="mb-2">
              <label className="mb-1 block text-xs font-medium text-stone-500">Type</label>
              <select
                value={slide.type}
                onChange={(e) =>
                  setSlide(index, {
                    type: e.target.value as "text" | "image",
                    value: slide.type === "image" ? "" : slide.value,
                  })
                }
                className="w-full max-w-xs rounded border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
              >
                <option value="text">Text</option>
                <option value="image" disabled={!canAddImage}>
                  Image
                </option>
              </select>
            </div>
            {slide.type === "text" ? (
              <input
                type="text"
                value={slide.value}
                onChange={(e) => setSlide(index, { type: "text", value: e.target.value })}
                placeholder="Text for this slide"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
              />
            ) : (
              <div>
                <input
                  ref={(el) => {
                    fileInputRefs.current[index] = el;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => handleFileChange(index, e)}
                  disabled={uploadingIndex !== null}
                  className="mb-2 block w-full max-w-xs text-sm text-stone-600 file:mr-2 file:rounded-lg file:border-0 file:bg-huntly-forest file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
                  aria-label="Upload slide image"
                />
                {uploadingIndex === index && (
                  <span className="text-sm text-stone-500">Uploading…</span>
                )}
                {slide.value && (
                  <div className="relative mt-2 h-32 w-full max-w-sm overflow-hidden rounded-lg border border-stone-200">
                    <Image
                      src={slide.value}
                      alt=""
                      fill
                      className="object-contain"
                      unoptimized={!slide.value.includes("supabase.co")}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {uploadError && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {uploadError}
        </p>
      )}
    </div>
  );
}
