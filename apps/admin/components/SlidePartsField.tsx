"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/Button";
import { uploadSlideImage, generateAdhocSlideImage } from "@/lib/upload-actions";

export type SlidePart =
  | { type: "text"; value: string; image_prompt?: string }
  | { type: "image"; value: string; image_prompt?: string }
  | { type: "text-image"; text: string; image: string; image_prompt?: string };

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
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    setSlides(initialSlides.length > 0 ? initialSlides : [{ type: "text", value: "" }]);
  }, [initialSlides]);

  const addSlide = () => setSlides((prev) => [...prev, { type: "text", value: "" }]);
  const removeSlide = (index: number) =>
    setSlides((prev) => (prev.length <= 1 ? [{ type: "text", value: "" }] : prev.filter((_, i) => i !== index)));
  const moveSlide = (index: number, direction: -1 | 1) =>
    setSlides((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const setSlide = (index: number, part: SlidePart) =>
    setSlides((prev) => {
      const next = [...prev];
      next[index] = part;
      return next;
    });

  function changeSlideType(index: number, newType: SlidePart["type"]) {
    const slide = slides[index];
    if (newType === "text") {
      setSlide(index, { type: "text", value: slide.type === "text" ? slide.value : "", image_prompt: slide.image_prompt });
    } else if (newType === "image") {
      setSlide(index, { type: "image", value: slide.type === "image" ? slide.value : "", image_prompt: slide.image_prompt });
    } else {
      setSlide(index, {
        type: "text-image",
        text: slide.type === "text" ? slide.value : slide.type === "text-image" ? slide.text : "",
        image: slide.type === "image" ? slide.value : slide.type === "text-image" ? slide.image : "",
        image_prompt: slide.image_prompt,
      });
    }
  }

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
    if (result.url) {
      const slide = slides[index];
      if (slide.type === "text-image") {
        setSlide(index, { ...slide, image: result.url });
      } else if (slide.type === "image") {
        setSlide(index, { ...slide, value: result.url });
      }
    }
    if (fileInputRefs.current[index]) fileInputRefs.current[index]!.value = "";
  }

  async function handleGenerateImage(index: number) {
    const slide = slides[index];
    if (!slide.image_prompt) return;
    setUploadError(null);
    setGeneratingIndex(index);
    const result = await generateAdhocSlideImage({ prompt: slide.image_prompt });
    setGeneratingIndex(null);
    if (result.error) {
      setUploadError(`Slide ${index + 1}: ${result.error}`);
      return;
    }
    if (result.url) {
      setSlides((prev) => {
        const next = [...prev];
        const current = next[index];
        if (current.type === "text-image") {
          next[index] = { ...current, image: result.url! };
        } else if (current.type === "image") {
          next[index] = { ...current, value: result.url! };
        }
        return next;
      });
    }
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
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveSlide(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move slide ${index + 1} up`}
                  className="rounded px-1.5 py-0.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveSlide(index, 1)}
                  disabled={index === slides.length - 1}
                  aria-label={`Move slide ${index + 1} down`}
                  className="rounded px-1.5 py-0.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ↓
                </button>
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
            </div>
            <div className="mb-2">
              <label className="mb-1 block text-xs font-medium text-stone-500">Type</label>
              <select
                value={slide.type}
                onChange={(e) => changeSlideType(index, e.target.value as SlidePart["type"])}
                className="w-full max-w-xs rounded border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
              >
                <option value="text">Text</option>
                <option value="image" disabled={!canAddImage}>
                  Image
                </option>
                <option value="text-image" disabled={!canAddImage}>
                  Text &amp; Image
                </option>
              </select>
            </div>
            {slide.type === "text" && (
              <input
                type="text"
                value={slide.value}
                onChange={(e) => setSlide(index, { type: "text", value: e.target.value })}
                placeholder="Text for this slide"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
              />
            )}
            {(slide.type === "image" || slide.type === "text-image") && (
              <div className="space-y-2">
                {slide.type === "text-image" && (
                  <input
                    type="text"
                    value={
                      typeof (slide as any).text === "string"
                        ? (slide as any).text
                        : typeof (slide as any).value === "string"
                        ? (slide as any).value
                        : ""
                    }
                    onChange={(e) =>
                      setSlide(index, {
                        type: "text-image",
                        text: e.target.value,
                        image: (slide as any).image ?? "",
                        image_prompt: slide.image_prompt,
                      })
                    }
                    placeholder="Caption or text for this slide"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
                  />
                )}
                <input
                  ref={(el) => {
                    fileInputRefs.current[index] = el;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => handleFileChange(index, e)}
                  disabled={uploadingIndex !== null}
                  className="block w-full max-w-xs text-sm text-stone-600 file:mr-2 file:rounded-lg file:border-0 file:bg-huntly-forest file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
                  aria-label="Upload slide image"
                />
                {uploadingIndex === index && (
                  <span className="text-sm text-stone-500">Uploading…</span>
                )}
                {(slide.type === "image" ? slide.value : slide.image) && (
                  <div className="relative mt-2 h-32 w-full max-w-sm overflow-hidden rounded-lg border border-stone-200">
                    <Image
                      src={slide.type === "image" ? slide.value : slide.image}
                      alt=""
                      fill
                      className="object-contain"
                      unoptimized={
                        !(slide.type === "image" ? slide.value : slide.image).includes("supabase.co")
                      }
                    />
                  </div>
                )}
                <div className="space-y-2 mt-2 pt-2 border-t border-stone-200">
                  <label className="block text-xs font-medium text-stone-500">Image Prompt</label>
                  <textarea
                    rows={2}
                    value={slide.image_prompt ?? ""}
                    onChange={(e) => setSlide(index, { ...slide, image_prompt: e.target.value })}
                    placeholder="Describe the image to generate..."
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
                  />
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleGenerateImage(index)}
                      disabled={!slide.image_prompt || generatingIndex !== null || uploadingIndex !== null}
                    >
                      {generatingIndex === index ? "Generating…" : "Generate Image"}
                    </Button>
                    {uploadError && uploadError.startsWith(`Slide ${index + 1}:`) && (
                      <span className="text-xs text-red-600">{uploadError.replace(`Slide ${index + 1}: `, "")}</span>
                    )}
                  </div>
                </div>
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
