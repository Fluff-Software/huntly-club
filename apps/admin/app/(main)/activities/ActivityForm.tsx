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

type PrepItem = { title: string; description: string };
type StepItem = { instruction: string; tip: string; media_url: string };

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
    instructions: string[] | null;
    alternative_approaches: string[] | null;
    images: string[] | null;
    intro_urgent_message?: string | null;
    intro_character_name?: string | null;
    intro_character_avatar_url?: string | null;
    intro_dialogue?: string | null;
    estimated_duration?: string | null;
    optional_items?: string | null;
    prep_checklist?: PrepItem[] | null;
    steps?: StepItem[] | null;
    debrief_heading?: string | null;
    debrief_photo_label?: string | null;
    debrief_question_1?: string | null;
    debrief_question_2?: string | null;
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
  const [instructionsList, setInstructionsList] = useState<string[]>(() =>
    Array.isArray(initial?.instructions) && initial.instructions.length > 0
      ? initial.instructions.filter(Boolean)
      : [""]
  );
  const [alternativeApproachesList, setAlternativeApproachesList] = useState<string[]>(() =>
    Array.isArray(initial?.alternative_approaches) && initial.alternative_approaches.length > 0
      ? initial.alternative_approaches.filter(Boolean)
      : [""]
  );
  const [imagesList, setImagesList] = useState<string[]>(() =>
    Array.isArray(initial?.images) && initial.images.length > 0
      ? initial.images.filter((u): u is string => typeof u === "string" && u.trim() !== "")
      : [""]
  );
  const [prepChecklistList, setPrepChecklistList] = useState<PrepItem[]>(() =>
    Array.isArray(initial?.prep_checklist) && initial.prep_checklist.length > 0
      ? initial.prep_checklist.map((p) => ({ title: p.title, description: p.description }))
      : [{ title: "", description: "" }]
  );
  const [stepsList, setStepsList] = useState<StepItem[]>(() =>
    Array.isArray(initial?.steps) && initial.steps.length > 0
      ? initial.steps.map((s) => ({
          instruction: s.instruction,
          tip: s.tip ?? "",
          media_url: s.media_url ?? "",
        }))
      : [{ instruction: "", tip: "", media_url: "" }]
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
        <p className="mt-1 text-xs text-stone-500">
          Shown as &quot;What to do&quot; when no instruction steps are set.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-stone-200 bg-stone-50/50 p-4">
        <h3 className="text-sm font-semibold text-stone-800">Intro (experience-driven)</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="intro_urgent_message" className="mb-1 block text-xs font-medium text-stone-600">
              Urgent banner message
            </label>
            <input
              id="intro_urgent_message"
              name="intro_urgent_message"
              type="text"
              defaultValue={initial?.intro_urgent_message ?? ""}
              placeholder="e.g. URGENT — BELLA BEAR NEEDS YOU"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
            />
          </div>
          <div>
            <label htmlFor="intro_character_name" className="mb-1 block text-xs font-medium text-stone-600">
              Character name
            </label>
            <input
              id="intro_character_name"
              name="intro_character_name"
              type="text"
              defaultValue={initial?.intro_character_name ?? ""}
              placeholder="e.g. Bella Bear"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
            />
          </div>
          <div>
            <label htmlFor="intro_character_avatar_url" className="mb-1 block text-xs font-medium text-stone-600">
              Character avatar URL
            </label>
            <input
              id="intro_character_avatar_url"
              name="intro_character_avatar_url"
              type="text"
              defaultValue={initial?.intro_character_avatar_url ?? ""}
              placeholder="URL or leave blank"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="intro_dialogue" className="mb-1 block text-xs font-medium text-stone-600">
              Intro dialogue (speech bubble)
            </label>
            <textarea
              id="intro_dialogue"
              name="intro_dialogue"
              rows={3}
              defaultValue={initial?.intro_dialogue ?? ""}
              placeholder="Narrative message from the character"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
            />
          </div>
          <div>
            <label htmlFor="estimated_duration" className="mb-1 block text-xs font-medium text-stone-600">
              Estimated duration
            </label>
            <input
              id="estimated_duration"
              name="estimated_duration"
              type="text"
              defaultValue={initial?.estimated_duration ?? ""}
              placeholder="e.g. ~45 mins"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
            />
          </div>
          <div>
            <label htmlFor="optional_items" className="mb-1 block text-xs font-medium text-stone-600">
              Optional items
            </label>
            <input
              id="optional_items"
              name="optional_items"
              type="text"
              defaultValue={initial?.optional_items ?? ""}
              placeholder="e.g. String & stickers optional"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="mb-1 block text-sm font-medium text-stone-700">Prep checklist</label>
        <p className="mb-2 text-xs text-stone-500">
          &quot;Before you start...&quot; items. Title and description per row.
        </p>
        <div className="space-y-2">
          {prepChecklistList.map((item, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-lg border border-stone-200 p-3 sm:flex-row sm:items-start">
              <input
                name="prep_title"
                type="text"
                value={item.title}
                onChange={(e) =>
                  setPrepChecklistList((prev) =>
                    prev.map((p, i) => (i === index ? { ...p, title: e.target.value } : p))
                  )
                }
                placeholder="Title"
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
              />
              <input
                name="prep_description"
                type="text"
                value={item.description}
                onChange={(e) =>
                  setPrepChecklistList((prev) =>
                    prev.map((p, i) => (i === index ? { ...p, description: e.target.value } : p))
                  )
                }
                placeholder="Description"
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
              />
              <button
                type="button"
                onClick={() => setPrepChecklistList((prev) => prev.filter((_, i) => i !== index))}
                className="rounded-lg border border-stone-300 p-2 text-stone-600 hover:bg-stone-100 focus:outline-none focus:ring-1 focus:ring-huntly-sage"
                aria-label="Delete prep item"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPrepChecklistList((prev) => [...prev, { title: "", description: "" }])}
            className="flex items-center gap-1 rounded-lg border border-dashed border-stone-400 px-3 py-2 text-sm text-stone-600 hover:border-huntly-sage hover:text-huntly-forest focus:outline-none focus:ring-1 focus:ring-huntly-sage"
          >
            + Add prep item
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="mb-1 block text-sm font-medium text-stone-700">Steps (experience-driven)</label>
        <p className="mb-2 text-xs text-stone-500">
          One screen per step. Instruction required; tip and media URL optional. Used for step-by-step flow when set.
        </p>
        <div className="space-y-3">
          {stepsList.map((step, index) => (
            <div key={index} className="rounded-lg border border-stone-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-200 text-sm font-medium text-stone-600">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-stone-700">Step {index + 1}</span>
                <button
                  type="button"
                  onClick={() => setStepsList((prev) => prev.filter((_, i) => i !== index))}
                  className="ml-auto rounded-lg border border-stone-300 p-1.5 text-stone-600 hover:bg-stone-100"
                  aria-label="Delete step"
                >
                  <TrashIcon />
                </button>
              </div>
              <div className="grid gap-2">
                <input
                  name="step_instruction"
                  type="text"
                  value={step.instruction}
                  onChange={(e) =>
                    setStepsList((prev) =>
                      prev.map((s, i) => (i === index ? { ...s, instruction: e.target.value } : s))
                    )
                  }
                  placeholder="Instruction text"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
                />
                <input
                  name="step_tip"
                  type="text"
                  value={step.tip}
                  onChange={(e) =>
                    setStepsList((prev) =>
                      prev.map((s, i) => (i === index ? { ...s, tip: e.target.value } : s))
                    )
                  }
                  placeholder="Tip (optional)"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
                />
                <input
                  name="step_media"
                  type="url"
                  value={step.media_url}
                  onChange={(e) =>
                    setStepsList((prev) =>
                      prev.map((s, i) => (i === index ? { ...s, media_url: e.target.value } : s))
                    )
                  }
                  placeholder="Media URL (optional)"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setStepsList((prev) => [...prev, { instruction: "", tip: "", media_url: "" }])
            }
            className="flex items-center gap-1 rounded-lg border border-dashed border-stone-400 px-3 py-2 text-sm text-stone-600 hover:border-huntly-sage hover:text-huntly-forest focus:outline-none focus:ring-1 focus:ring-huntly-sage"
          >
            + Add step
          </button>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-stone-200 bg-stone-50/50 p-4">
        <h3 className="text-sm font-semibold text-stone-800">Debrief (submit proof)</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="debrief_heading" className="mb-1 block text-xs font-medium text-stone-600">
              Debrief heading
            </label>
            <input
              id="debrief_heading"
              name="debrief_heading"
              type="text"
              defaultValue={initial?.debrief_heading ?? ""}
              placeholder="e.g. Report back to Bella"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="debrief_photo_label" className="mb-1 block text-xs font-medium text-stone-600">
              Photo label
            </label>
            <input
              id="debrief_photo_label"
              name="debrief_photo_label"
              type="text"
              defaultValue={initial?.debrief_photo_label ?? ""}
              placeholder="e.g. Show Bella your base"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
            />
          </div>
          <div>
            <label htmlFor="debrief_question_1" className="mb-1 block text-xs font-medium text-stone-600">
              Debrief question 1
            </label>
            <input
              id="debrief_question_1"
              name="debrief_question_1"
              type="text"
              defaultValue={initial?.debrief_question_1 ?? ""}
              placeholder="e.g. What did you call your base?"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
            />
          </div>
          <div>
            <label htmlFor="debrief_question_2" className="mb-1 block text-xs font-medium text-stone-600">
              Debrief question 2
            </label>
            <input
              id="debrief_question_2"
              name="debrief_question_2"
              type="text"
              defaultValue={initial?.debrief_question_2 ?? ""}
              placeholder="e.g. What was the trickiest part?"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Instructions (steps)</label>
        <p className="mb-2 text-xs text-stone-500">
          Numbered steps shown on the mission page. If set, they replace the long description block.
        </p>
        <div className="space-y-2">
          {instructionsList.map((step, index) => (
            <div key={index} className="flex gap-2">
              <span className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-sm font-medium text-stone-600">
                {index + 1}
              </span>
              <input
                name="instructions"
                type="text"
                defaultValue={step}
                placeholder="e.g. Find a quiet spot outdoors"
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
              />
              <button
                type="button"
                onClick={() => setInstructionsList((prev) => prev.filter((_, i) => i !== index))}
                className="rounded-lg border border-stone-300 p-2 text-stone-600 hover:bg-stone-100 focus:outline-none focus:ring-1 focus:ring-huntly-sage"
                aria-label="Delete step"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setInstructionsList((prev) => [...prev, ""])}
            className="flex items-center gap-1 rounded-lg border border-dashed border-stone-400 px-3 py-2 text-sm text-stone-600 hover:border-huntly-sage hover:text-huntly-forest focus:outline-none focus:ring-1 focus:ring-huntly-sage"
          >
            + Add step
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Alternative approaches</label>
        <p className="mb-2 text-xs text-stone-500">
          Other ways to complete this activity (e.g. indoor version, solo vs group).
        </p>
        <div className="space-y-2">
          {alternativeApproachesList.map((alt, index) => (
            <div key={index} className="flex gap-2">
              <input
                name="alternative_approaches"
                type="text"
                defaultValue={alt}
                placeholder="e.g. Try this indoors with houseplants"
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
              />
              <button
                type="button"
                onClick={() => setAlternativeApproachesList((prev) => prev.filter((_, i) => i !== index))}
                className="rounded-lg border border-stone-300 p-2 text-stone-600 hover:bg-stone-100 focus:outline-none focus:ring-1 focus:ring-huntly-sage"
                aria-label="Delete alternative"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAlternativeApproachesList((prev) => [...prev, ""])}
            className="flex items-center gap-1 rounded-lg border border-dashed border-stone-400 px-3 py-2 text-sm text-stone-600 hover:border-huntly-sage hover:text-huntly-forest focus:outline-none focus:ring-1 focus:ring-huntly-sage"
          >
            + Add alternative
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Extra images</label>
        <p className="mb-2 text-xs text-stone-500">
          Optional image URLs shown throughout the mission page (between description, steps, etc.).
        </p>
        <div className="space-y-2">
          {imagesList.map((url, index) => (
            <div key={index} className="flex gap-2">
              <input
                name="images"
                type="url"
                defaultValue={url}
                placeholder="https://..."
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
              />
              <button
                type="button"
                onClick={() => setImagesList((prev) => prev.filter((_, i) => i !== index))}
                className="rounded-lg border border-stone-300 p-2 text-stone-600 hover:bg-stone-100 focus:outline-none focus:ring-1 focus:ring-huntly-sage"
                aria-label="Delete image URL"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setImagesList((prev) => [...prev, ""])}
            className="flex items-center gap-1 rounded-lg border border-dashed border-stone-400 px-3 py-2 text-sm text-stone-600 hover:border-huntly-sage hover:text-huntly-forest focus:outline-none focus:ring-1 focus:ring-huntly-sage"
          >
            + Add image URL
          </button>
        </div>
      </div>

      <ImageUploadField
        name="image"
        label="Image"
        uploadKind="activity"
        defaultValue={initial?.image}
        help="Upload to Supabase Storage."
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
