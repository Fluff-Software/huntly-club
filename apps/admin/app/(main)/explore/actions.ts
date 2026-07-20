"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type ExploreRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

const RARITIES: ExploreRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

function parseRarity(value: FormDataEntryValue | null): ExploreRarity {
  const raw = typeof value === "string" ? value : "";
  return RARITIES.includes(raw as ExploreRarity) ? (raw as ExploreRarity) : "common";
}

async function uploadExploreImage(bucket: string, file: File): Promise<string> {
  const supabase = createServerSupabaseClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `admin/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function getExploreAdminData() {
  const supabase = createServerSupabaseClient();
  const [locationsRes, collectiblesRes, categoriesRes] = await Promise.all([
    supabase.from("explore_locations").select("*").order("created_at", { ascending: false }),
    supabase.from("explore_collectibles").select("*").order("rarity", { ascending: true }),
    supabase.from("explore_collectible_categories").select("*").order("sort_order", { ascending: true }),
  ]);
  return {
    locations: locationsRes.data ?? [],
    collectibles: collectiblesRes.data ?? [],
    categories: categoriesRes.data ?? [],
  };
}

export async function createLocation(formData: FormData): Promise<{ error?: string }> {
  try {
    const supabase = createServerSupabaseClient();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Location name is required." };

    const latitude = Number.parseFloat(String(formData.get("latitude") ?? ""));
    const longitude = Number.parseFloat(String(formData.get("longitude") ?? ""));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { error: "A valid latitude and longitude are required." };
    }

    const radius_meters = Math.max(
      10,
      Math.min(500, Number.parseInt(String(formData.get("radius_meters") ?? "50"), 10) || 50)
    );

    const file = formData.get("image_file");
    const image_url =
      file instanceof File && file.size > 0
        ? await uploadExploreImage("explore-location-images", file)
        : null;

    const { error } = await supabase.from("explore_locations").insert({
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      image_url,
      latitude,
      longitude,
      radius_meters,
      is_active: true,
    });

    if (error) return { error: error.message };
    revalidatePath("/explore");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create location" };
  }
}

export async function updateLocation(formData: FormData): Promise<{ error?: string }> {
  try {
    const supabase = createServerSupabaseClient();
    const id = Number.parseInt(String(formData.get("id") ?? "0"), 10);
    if (!id) return { error: "Missing location id." };

    const latitude = Number.parseFloat(String(formData.get("latitude") ?? ""));
    const longitude = Number.parseFloat(String(formData.get("longitude") ?? ""));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { error: "A valid latitude and longitude are required." };
    }

    const updatePayload: Record<string, unknown> = {
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      latitude,
      longitude,
      radius_meters: Math.max(
        10,
        Math.min(500, Number.parseInt(String(formData.get("radius_meters") ?? "50"), 10) || 50)
      ),
      is_active: formData.get("is_active") === "on",
      updated_at: new Date().toISOString(),
    };

    const file = formData.get("image_file");
    if (file instanceof File && file.size > 0) {
      updatePayload.image_url = await uploadExploreImage("explore-location-images", file);
    }

    const { error } = await supabase.from("explore_locations").update(updatePayload).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/explore");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update location" };
  }
}

export async function deleteLocation(formData: FormData): Promise<void> {
  const supabase = createServerSupabaseClient();
  const id = Number.parseInt(String(formData.get("id") ?? "0"), 10);
  if (!id) throw new Error("Missing location id.");
  const { error } = await supabase.from("explore_locations").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/explore");
}

function parseCategoryId(value: FormDataEntryValue | null): number | null {
  const raw = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(raw) && raw > 0 ? raw : null;
}

function parseWeight(value: FormDataEntryValue | null): number {
  return Math.max(1, Number.parseInt(String(value ?? "100"), 10) || 100);
}

export async function createCollectible(formData: FormData): Promise<{ error?: string }> {
  try {
    const supabase = createServerSupabaseClient();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Collectible name is required." };

    const file = formData.get("image_file");
    const imageUrlInput = String(formData.get("image_url") ?? "").trim();
    const image_url =
      file instanceof File && file.size > 0
        ? await uploadExploreImage("explore-collectible-images", file)
        : imageUrlInput;
    if (!image_url) return { error: "An image is required (upload a file or paste a URL)." };

    const { error } = await supabase.from("explore_collectibles").insert({
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      flavor_text: String(formData.get("flavor_text") ?? "").trim() || null,
      image_url,
      rarity: parseRarity(formData.get("rarity")),
      category_id: parseCategoryId(formData.get("category_id")),
      weight: parseWeight(formData.get("weight")),
      is_active: true,
    });

    if (error) return { error: error.message };
    revalidatePath("/explore");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create collectible" };
  }
}

export async function updateCollectible(formData: FormData): Promise<{ error?: string }> {
  try {
    const supabase = createServerSupabaseClient();
    const id = Number.parseInt(String(formData.get("id") ?? "0"), 10);
    if (!id) return { error: "Missing collectible id." };

    const updatePayload: Record<string, unknown> = {
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      flavor_text: String(formData.get("flavor_text") ?? "").trim() || null,
      rarity: parseRarity(formData.get("rarity")),
      category_id: parseCategoryId(formData.get("category_id")),
      weight: parseWeight(formData.get("weight")),
      is_active: formData.get("is_active") === "on",
      updated_at: new Date().toISOString(),
    };

    const file = formData.get("image_file");
    const imageUrlInput = String(formData.get("image_url") ?? "").trim();
    if (file instanceof File && file.size > 0) {
      updatePayload.image_url = await uploadExploreImage("explore-collectible-images", file);
    } else if (imageUrlInput) {
      updatePayload.image_url = imageUrlInput;
    }

    const { error } = await supabase.from("explore_collectibles").update(updatePayload).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/explore");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update collectible" };
  }
}

export async function deleteCollectible(formData: FormData): Promise<void> {
  const supabase = createServerSupabaseClient();
  const id = Number.parseInt(String(formData.get("id") ?? "0"), 10);
  if (!id) throw new Error("Missing collectible id.");
  const { error } = await supabase.from("explore_collectibles").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/explore");
}

export async function createCategory(formData: FormData): Promise<{ error?: string }> {
  try {
    const supabase = createServerSupabaseClient();
    const key = String(formData.get("key") ?? "").trim();
    const label = String(formData.get("label") ?? "").trim();
    if (!key || !label) return { error: "Category key and label are required." };

    const { error } = await supabase.from("explore_collectible_categories").insert({
      key,
      label,
      icon: String(formData.get("icon") ?? "").trim() || null,
      color: String(formData.get("color") ?? "").trim() || null,
      sort_order: Number.parseInt(String(formData.get("sort_order") ?? "0"), 10) || 0,
      is_active: true,
    });

    if (error) return { error: error.message };
    revalidatePath("/explore");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create category" };
  }
}

export async function updateCategory(formData: FormData): Promise<{ error?: string }> {
  try {
    const supabase = createServerSupabaseClient();
    const id = Number.parseInt(String(formData.get("id") ?? "0"), 10);
    if (!id) return { error: "Missing category id." };

    const { error } = await supabase
      .from("explore_collectible_categories")
      .update({
        key: String(formData.get("key") ?? "").trim(),
        label: String(formData.get("label") ?? "").trim(),
        icon: String(formData.get("icon") ?? "").trim() || null,
        color: String(formData.get("color") ?? "").trim() || null,
        sort_order: Number.parseInt(String(formData.get("sort_order") ?? "0"), 10) || 0,
        is_active: formData.get("is_active") === "on",
      })
      .eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/explore");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update category" };
  }
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const supabase = createServerSupabaseClient();
  const id = Number.parseInt(String(formData.get("id") ?? "0"), 10);
  if (!id) throw new Error("Missing category id.");
  const { error } = await supabase.from("explore_collectible_categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/explore");
}
