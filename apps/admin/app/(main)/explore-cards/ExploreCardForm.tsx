"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/Button";
import { ImageUploadField } from "@/components/ImageUploadField";
import { ExploreCardPreview } from "./ExploreCardPreview";

const CATEGORIES = [
  { value: "animal", label: "Animal" },
  { value: "habitat", label: "Habitat" },
  { value: "flora_wildlife", label: "Flora & Wildlife" },
] as const;

const RARITIES = [
  { value: "common", label: "Common" },
  { value: "uncommon", label: "Uncommon" },
  { value: "rare", label: "Rare" },
  { value: "very_rare", label: "Very rare" },
] as const;

const HABITAT_KEYS = [
  { key: "freshwater", label: "Freshwater" },
  { key: "wetland", label: "Wetland" },
  { key: "woodland", label: "Woodland" },
  { key: "grassland", label: "Grassland" },
  { key: "farmland", label: "Farmland" },
  { key: "urban", label: "Urban" },
  { key: "park_garden", label: "Park / garden" },
  { key: "coastal", label: "Coastal" },
  { key: "general", label: "General" },
] as const;

const DEFAULT_WEIGHT_BY_RARITY: Record<string, number> = {
  common: 10,
  uncommon: 5,
  rare: 6,
  very_rare: 3,
};

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type ExploreCardInitial = {
  slug: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  image_path: string;
  base_weight: number;
  habitat_weights: Record<string, number>;
  is_active: boolean;
  sort_order: number;
};

type ExploreCardFormProps = {
  action: (formData: FormData) => Promise<{ error?: string }>;
  initial?: ExploreCardInitial;
  mode: "create" | "edit";
};

function SaveButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending
        ? mode === "create"
          ? "Creating…"
          : "Saving…"
        : mode === "create"
          ? "Create card"
          : "Save card"}
    </Button>
  );
}

const inputClass =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage";

export function ExploreCardForm({ action, initial, mode }: ExploreCardFormProps) {
  const [state, formAction] = useActionState(
    async (_: { error?: string }, formData: FormData) => action(formData),
    { error: undefined }
  );

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "animal");
  const [rarity, setRarity] = useState(initial?.rarity ?? "common");
  const [imageUrl, setImageUrl] = useState(initial?.image_path ?? "");
  const [baseWeight, setBaseWeight] = useState(
    String(initial?.base_weight ?? DEFAULT_WEIGHT_BY_RARITY.common)
  );
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [habitats, setHabitats] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const { key } of HABITAT_KEYS) {
      const v = initial?.habitat_weights?.[key];
      next[key] = v != null && v > 0 ? String(v) : "";
    }
    return next;
  });

  const previewSlug = useMemo(() => slugify(slug || name), [slug, name]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleRarityChange(value: string) {
    setRarity(value);
    if (mode === "create") {
      const suggested = DEFAULT_WEIGHT_BY_RARITY[value];
      if (suggested != null) setBaseWeight(String(suggested));
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <form action={formAction} className="space-y-6">
        {state.error ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {state.error}
          </div>
        ) : null}

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-stone-700">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. House Sparrow"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="slug" className="mb-1 block text-sm font-medium text-stone-700">
              Slug
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="house-sparrow"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-stone-500">
              Unique id used in storage filenames and catalogue references.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium text-stone-700"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short blurb shown on the card."
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="category" className="mb-1 block text-sm font-medium text-stone-700">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rarity" className="mb-1 block text-sm font-medium text-stone-700">
              Rarity
            </label>
            <select
              id="rarity"
              name="rarity"
              value={rarity}
              onChange={(e) => handleRarityChange(e.target.value)}
              className={inputClass}
            >
              {RARITIES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="base_weight"
              className="mb-1 block text-sm font-medium text-stone-700"
            >
              Base weight
            </label>
            <input
              id="base_weight"
              name="base_weight"
              type="number"
              min={0.01}
              step="any"
              required
              value={baseWeight}
              onChange={(e) => setBaseWeight(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-stone-500">
              Higher weight = more likely to drop. Typical: common 10, uncommon 5, rare
              6, very rare 3.
            </p>
          </div>

          <div>
            <label
              htmlFor="sort_order"
              className="mb-1 block text-sm font-medium text-stone-700"
            >
              Sort order
            </label>
            <input
              id="sort_order"
              name="sort_order"
              type="number"
              step={1}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <ImageUploadField
          name="image_path"
          label="Card artwork"
          uploadKind="explore"
          slug={previewSlug}
          defaultValue={imageUrl || null}
          help="Square crop recommended. Uploads to the explore-card-images bucket."
          onUrlChange={setImageUrl}
        />

        <fieldset className="rounded-xl border border-stone-200 bg-stone-50/60 p-4">
          <legend className="px-1 text-sm font-medium text-stone-700">
            Where this card drops (habitat weights)
          </legend>
          <div className="mb-4 space-y-2 text-xs leading-relaxed text-stone-600">
            <p>
              Each Explore stop has environment scores (e.g. how “woodland” or
              “park” it is, from 0–1). When someone collects there, a card’s
              chance is:
            </p>
            <p className="rounded-lg border border-stone-200 bg-white px-3 py-2 font-mono text-[11px] text-stone-800">
              chance ∝ base weight × sum(stop score × habitat weight) × new/owned
              bonus
            </p>
            <p>
              Put higher numbers on habitats where this species or place
              <span className="font-semibold"> should</span> appear. Leave a
              habitat blank if it should not boost the card there. Use a small{" "}
              <span className="font-semibold">General</span> value (~0.3) so the
              card can still appear weakly everywhere.
            </p>
            <p className="text-stone-500">
              Tip: strong match ≈ 4–5, secondary ≈ 2–3, mild ≈ 1–1.5, general
              fallback ≈ 0.3. Example — Grey Squirrel: Woodland 5, Park/garden 4,
              Urban 1.5, General 0.3.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {HABITAT_KEYS.map(({ key, label }) => (
              <div key={key}>
                <label
                  htmlFor={`habitat_${key}`}
                  className="mb-1 block text-xs font-medium text-stone-600"
                >
                  {label}
                  {key === "general" ? (
                    <span className="font-normal text-stone-400"> (fallback)</span>
                  ) : null}
                </label>
                <input
                  id={`habitat_${key}`}
                  name={`habitat_${key}`}
                  type="number"
                  min={0}
                  step="any"
                  value={habitats[key] ?? ""}
                  onChange={(e) =>
                    setHabitats((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder="blank = unused"
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-huntly-forest focus:ring-huntly-sage"
          />
          Active (available to award and show in the binder catalogue)
        </label>

        <SaveButton mode={mode} />
      </form>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-stone-500">
          Live preview
        </p>
        <div className="rounded-2xl border border-stone-200 bg-[#2D4A35] p-5">
          <ExploreCardPreview
            name={name}
            rarity={rarity}
            description={description}
            imageUrl={imageUrl || null}
            collected
          />
        </div>
        <p className="mt-2 text-center text-xs text-stone-500">
          Approximate look of the collected card in the app.
        </p>
      </aside>
    </div>
  );
}
