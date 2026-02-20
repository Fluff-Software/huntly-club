import { supabase } from "./supabase";

export type Category = {
  id: number;
  name: string | null;
  icon: string | null;
};

let cached: Category[] | null = null;

export async function getCategories(): Promise<Category[]> {
  if (cached) return cached;
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, icon")
    .order("id", { ascending: true });
  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
  cached = (data ?? []).map((r) => ({
    id: r.id,
    name: r.name ?? null,
    icon: r.icon ?? null,
  }));
  return cached;
}

export function getCategoryById(
  categories: Category[],
  id: number
): { id: number; name: string; icon: string | null } | null {
  const c = categories.find((x) => x.id === id);
  if (!c) return null;
  return { id: c.id, name: c.name ?? `Category ${id}`, icon: c.icon };
}

export function invalidateCategoriesCache(): void {
  cached = null;
}
