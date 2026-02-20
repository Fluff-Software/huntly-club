"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type CategoryRow = {
  id: number;
  icon: string | null;
  name: string | null;
};

export type CategoryEditRow = {
  id: number;
  icon: string | null;
  name: string;
  _deleted?: boolean;
};

export async function getCategories(): Promise<CategoryEditRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, icon, name")
    .order("id", { ascending: true });
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id,
    icon: r.icon ?? null,
    name: r.name ?? "",
  }));
}

export async function saveCategories(
  rows: { id?: number; icon: string | null; name: string; _deleted?: boolean }[]
): Promise<{ error?: string }> {
  try {
    const supabase = createServerSupabaseClient();

    for (const row of rows) {
      if (row._deleted) {
        if (row.id != null) {
          const { error } = await supabase.from("categories").delete().eq("id", row.id);
          if (error) return { error: error.message };
        }
        continue;
      }

      const name = (row.name || "").trim();
      if (!name) continue;

      if (row.id != null && row.id > 0) {
        const { error } = await supabase
          .from("categories")
          .update({ name, icon: row.icon || null })
          .eq("id", row.id);
        if (error) return { error: error.message };
      } else {
        const { error } = await supabase.from("categories").insert({
          name,
          icon: row.icon || null,
        });
        if (error) return { error: error.message };
      }
    }

    revalidatePath("/categories");
    return {};
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to save categories",
    };
  }
}
