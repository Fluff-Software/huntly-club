"use client";

import Image from "next/image";
import { useActionState, useState, useRef, useEffect } from "react";
import { Button } from "@/components/Button";
import { ImageUploadField } from "@/components/ImageUploadField";

export type CategoryOption = {
  id: number;
  name: string | null;
  icon: string | null;
};

type ActivityFormProps = {
  action: (formData: FormData) => Promise<{ error?: string }>;
  categoriesList: CategoryOption[];
  initial?: {
    name: string;
    title: string;
    description: string | null;
    long_description: string | null;
    hints: string[] | string | null;
    tips: string[] | string | null;
    trivia: string | null;
    image: string | null;
    xp: number | null;
    photo_required: boolean | null;
    categories: number[] | null;
  };
};

function normalizeStringArray(value: string[] | string | null | undefined): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return trimmed
      .split(/\n/)
      .map((s) => s.replace(/^\s*•\s*/, "").trim())
      .filter(Boolean);
  }
  return [];
}

const TrashIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const ChevronIcon = ({ open, className = "" }: { open: boolean; className?: string }) => (
  <svg
    className={`h-5 w-5 shrink-0 text-stone-500 transition-transform ${open ? "rotate-180" : ""} ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export function ActivityForm({ action, categoriesList, initial }: ActivityFormProps) {
  const [state, formAction] = useActionState(
    async (_: { error?: string }, formData: FormData) => action(formData),
    { error: undefined }
  );
  const [hintsList, setHintsList] = useState<string[]>(() =>
    normalizeStringArray(initial?.hints).length > 0 ? normalizeStringArray(initial?.hints) : [""]
  );
  const [tipsList, setTipsList] = useState<string[]>(() =>
    normalizeStringArray(initial?.tips).length > 0 ? normalizeStringArray(initial?.tips) : [""]
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(() =>
    initial && Array.isArray(initial.categories) ? initial.categories : []
  );
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const categoriesDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoriesDropdownRef.current && !categoriesDropdownRef.current.contains(e.target as Node)) {
        setCategoriesOpen(false);
      }
    }
    if (categoriesOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [categoriesOpen]);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {state?.error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-stone-700">
            Name (slug)
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={initial?.name ?? ""}
            placeholder="e.g. bird_spotting"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
          />
        </div>
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-stone-700">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={initial?.title ?? ""}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-stone-700">
          Description (short)
        </label>
        <input
          id="description"
          name="description"
          type="text"
          defaultValue={initial?.description ?? ""}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
        />
      </div>

      <div>
        <label htmlFor="long_description" className="mb-1 block text-sm font-medium text-stone-700">
          Long description
        </label>
        <textarea
          id="long_description"
          name="long_description"
          rows={4}
          defaultValue={initial?.long_description ?? ""}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
        />
      </div>

      <ImageUploadField
        name="image"
        label="Image"
        uploadKind="activity"
        defaultValue={initial?.image}
        help="Upload to Supabase Storage or paste a URL."
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="xp" className="mb-1 block text-sm font-medium text-stone-700">
            XP
          </label>
          <input
            id="xp"
            name="xp"
            type="number"
            min={0}
            defaultValue={initial?.xp ?? 10}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
          />
        </div>
        <div className="flex items-center gap-2 pt-8">
          <input
            id="photo_required"
            name="photo_required"
            type="checkbox"
            defaultChecked={initial?.photo_required ?? false}
            className="h-4 w-4 rounded border-stone-300 text-huntly-forest focus:ring-huntly-sage"
          />
          <label htmlFor="photo_required" className="text-sm font-medium text-stone-700">
            Photo required
          </label>
        </div>
      </div>

      <div ref={categoriesDropdownRef} className="relative">
        <label className="mb-1 block text-sm font-medium text-stone-700">
          Categories
        </label>
        <button
          type="button"
          onClick={() => setCategoriesOpen((open) => !open)}
          className="flex min-h-[2.75rem] w-full items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-left text-sm text-stone-700 shadow-sm transition-colors hover:bg-stone-50 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
          aria-expanded={categoriesOpen}
          aria-haspopup="listbox"
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {selectedCategoryIds.length === 0 ? (
              "Select Categories"
            ) : (
              selectedCategoryIds
                .map((id) => categoriesList.find((c) => c.id === id))
                .filter((c): c is CategoryOption => c != null)
                .map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-stone-800"
                  >
                    {cat.icon ? (
                      <span className="relative inline-block h-4 w-4 shrink-0 overflow-hidden rounded">
                        <Image
                          src={cat.icon}
                          alt=""
                          width={16}
                          height={16}
                          className="object-cover"
                          unoptimized={!cat.icon.includes("supabase.co")}
                        />
                      </span>
                    ) : (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-stone-200 text-[10px] text-stone-500">
                        •
                      </span>
                    )}
                    <span>{cat.name || `Category ${cat.id}`}</span>
                  </span>
                ))
            )}
          </span>
          <ChevronIcon open={categoriesOpen} className="shrink-0" />
        </button>
        {categoriesOpen && (
          <div
            className="absolute top-full left-0 z-10 mt-1 max-h-64 w-full min-w-[16rem] overflow-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
            role="listbox"
          >
            {categoriesList.map((cat) => {
              const checked = selectedCategoryIds.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  role="option"
                  aria-selected={checked}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-stone-50 ${
                    checked ? "bg-huntly-forest/10 text-stone-900" : "text-stone-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSelectedCategoryIds((prev) =>
                        prev.includes(cat.id) ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                      );
                    }}
                    className="h-4 w-4 rounded border-stone-300 text-huntly-forest focus:ring-huntly-sage"
                  />
                  {cat.icon ? (
                    <span className="relative inline-block h-5 w-5 shrink-0 overflow-hidden rounded">
                      <Image
                        src={cat.icon}
                        alt=""
                        width={20}
                        height={20}
                        className="object-cover"
                        unoptimized={!cat.icon.includes("supabase.co")}
                      />
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-stone-200 text-xs text-stone-500">
                      •
                    </span>
                  )}
                  <span>{cat.name || `Category ${cat.id}`}</span>
                </label>
              );
            })}
          </div>
        )}
        {selectedCategoryIds.map((id) => (
          <input key={id} type="hidden" name="categories" value={id} />
        ))}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Hints</label>
        <div className="space-y-2">
          {hintsList.map((hint, index) => (
            <div key={index} className="flex gap-2">
              <input
                name="hints"
                type="text"
                defaultValue={hint}
                placeholder="e.g. Look for movement in trees and bushes"
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
              />
              <button
                type="button"
                onClick={() => setHintsList((prev) => prev.filter((_, i) => i !== index))}
                className="rounded-lg border border-stone-300 p-2 text-stone-600 hover:bg-stone-100 focus:outline-none focus:ring-1 focus:ring-huntly-sage"
                aria-label="Delete hint"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setHintsList((prev) => [...prev, ""])}
            className="flex items-center gap-1 rounded-lg border border-dashed border-stone-400 px-3 py-2 text-sm text-stone-600 hover:border-huntly-sage hover:text-huntly-forest focus:outline-none focus:ring-1 focus:ring-huntly-sage"
          >
            + Add hint
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Tips</label>
        <div className="space-y-2">
          {tipsList.map((tip, index) => (
            <div key={index} className="flex gap-2">
              <input
                name="tips"
                type="text"
                defaultValue={tip}
                placeholder="e.g. Stay quiet and move slowly"
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
              />
              <button
                type="button"
                onClick={() => setTipsList((prev) => prev.filter((_, i) => i !== index))}
                className="rounded-lg border border-stone-300 p-2 text-stone-600 hover:bg-stone-100 focus:outline-none focus:ring-1 focus:ring-huntly-sage"
                aria-label="Delete tip"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setTipsList((prev) => [...prev, ""])}
            className="flex items-center gap-1 rounded-lg border border-dashed border-stone-400 px-3 py-2 text-sm text-stone-600 hover:border-huntly-sage hover:text-huntly-forest focus:outline-none focus:ring-1 focus:ring-huntly-sage"
          >
            + Add tip
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="trivia" className="mb-1 block text-sm font-medium text-stone-700">
          Trivia
        </label>
        <textarea
          id="trivia"
          name="trivia"
          rows={2}
          defaultValue={initial?.trivia ?? ""}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
        />
      </div>

      <Button type="submit" size="lg">
        Save mission
      </Button>
    </form>
  );
}
