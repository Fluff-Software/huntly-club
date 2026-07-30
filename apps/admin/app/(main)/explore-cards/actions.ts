"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export type ExploreCardFormState = { error?: string };

const CATEGORIES = new Set(["animal", "habitat", "flora_wildlife"]);
const RARITIES = new Set(["common", "uncommon", "rare", "very_rare"]);
const HABITAT_KEYS = [
  "freshwater",
  "wetland",
  "woodland",
  "grassland",
  "farmland",
  "urban",
  "park_garden",
  "coastal",
  "general",
] as const;

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseHabitatWeights(formData: FormData): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const key of HABITAT_KEYS) {
    const raw = String(formData.get(`habitat_${key}`) ?? "").trim();
    if (!raw) continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    weights[key] = n;
  }
  return weights;
}

function parseCardFields(formData: FormData): {
  error?: string;
  row?: {
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
} {
  const name = (formData.get("name") as string)?.trim() ?? "";
  const slugInput = (formData.get("slug") as string)?.trim() ?? "";
  const slug = slugify(slugInput || name);
  const description = (formData.get("description") as string)?.trim() ?? "";
  const category = (formData.get("category") as string)?.trim() ?? "";
  const rarity = (formData.get("rarity") as string)?.trim() ?? "";
  const imagePath = (formData.get("image_path") as string)?.trim() ?? "";
  const baseWeight = Number(formData.get("base_weight"));
  const sortOrder = parseInt(String(formData.get("sort_order")), 10);
  const isActive = String(formData.get("is_active") ?? "") === "true";

  if (!name) return { error: "Name is required" };
  if (!slug) return { error: "Slug is required" };
  if (!CATEGORIES.has(category)) return { error: "Invalid category" };
  if (!RARITIES.has(rarity)) return { error: "Invalid rarity" };
  if (!Number.isFinite(baseWeight) || baseWeight <= 0) {
    return { error: "Base weight must be a number greater than 0" };
  }

  return {
    row: {
      slug,
      name,
      description,
      category,
      rarity,
      image_path: imagePath,
      base_weight: baseWeight,
      habitat_weights: parseHabitatWeights(formData),
      is_active: isActive,
      sort_order: Number.isNaN(sortOrder) ? 0 : sortOrder,
    },
  };
}

export async function createExploreCard(
  _prev: ExploreCardFormState,
  formData: FormData
): Promise<ExploreCardFormState> {
  const parsed = parseCardFields(formData);
  if (parsed.error || !parsed.row) return { error: parsed.error ?? "Invalid form" };

  try {
    const supabase = createServerSupabaseClient();
    const { data: existing } = await supabase
      .from("explore_cards")
      .select("id")
      .eq("slug", parsed.row.slug)
      .maybeSingle();
    if (existing) return { error: `Slug “${parsed.row.slug}” is already in use` };

    const { error } = await supabase.from("explore_cards").insert(parsed.row);
    if (error) return { error: error.message };
    revalidatePath("/explore-cards");
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to create card",
    };
  }
  return {};
}

export async function updateExploreCard(
  id: string,
  _prev: ExploreCardFormState,
  formData: FormData
): Promise<ExploreCardFormState> {
  const parsed = parseCardFields(formData);
  if (parsed.error || !parsed.row) return { error: parsed.error ?? "Invalid form" };

  try {
    const supabase = createServerSupabaseClient();
    const { data: existing } = await supabase
      .from("explore_cards")
      .select("id")
      .eq("slug", parsed.row.slug)
      .neq("id", id)
      .maybeSingle();
    if (existing) return { error: `Slug “${parsed.row.slug}” is already in use` };

    const { error } = await supabase
      .from("explore_cards")
      .update({
        ...parsed.row,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/explore-cards");
    revalidatePath(`/explore-cards/${id}/edit`);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to update card",
    };
  }
  return {};
}

export async function setExploreCardActive(
  id: string,
  isActive: boolean
): Promise<ExploreCardFormState> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("explore_cards")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/explore-cards");
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to update card status",
    };
  }
  return {};
}
