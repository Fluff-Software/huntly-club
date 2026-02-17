"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type ResourceFormState = { error?: string };

export async function createResource(
  _prev: ResourceFormState,
  formData: FormData
): Promise<ResourceFormState> {
  const title = (formData.get("title") as string)?.trim();
  const fileUrl = (formData.get("file_url") as string)?.trim();
  if (!title) return { error: "Title is required" };
  if (!fileUrl) return { error: "File URL or upload is required" };

  const description = (formData.get("description") as string)?.trim() || null;
  const sortOrder = parseInt(String(formData.get("sort_order")), 10);
  const category = (formData.get("category") as string)?.trim() || null;

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("parent_resources").insert({
      title,
      description,
      file_url: fileUrl,
      sort_order: Number.isNaN(sortOrder) ? 0 : sortOrder,
      category,
    });

    if (error) return { error: error.message };
    revalidatePath("/resources");
    revalidatePath("/dashboard");
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to create resource",
    };
  }
  return {};
}

export async function updateResource(
  id: number,
  _prev: ResourceFormState,
  formData: FormData
): Promise<ResourceFormState> {
  const title = (formData.get("title") as string)?.trim();
  const fileUrl = (formData.get("file_url") as string)?.trim();
  if (!title) return { error: "Title is required" };
  if (!fileUrl) return { error: "File URL or upload is required" };

  const description = (formData.get("description") as string)?.trim() || null;
  const sortOrder = parseInt(String(formData.get("sort_order")), 10);
  const category = (formData.get("category") as string)?.trim() || null;

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("parent_resources")
      .update({
        title,
        description,
        file_url: fileUrl,
        sort_order: Number.isNaN(sortOrder) ? 0 : sortOrder,
        category,
      })
      .eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/resources");
    revalidatePath(`/resources/${id}/edit`);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to update resource",
    };
  }
  return {};
}

export async function deleteResource(id: number): Promise<ResourceFormState> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("parent_resources").delete().eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/resources");
    revalidatePath("/dashboard");
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to delete resource",
    };
  }
  return {};
}

export async function deleteResourceAction(formData: FormData) {
  const id = parseInt(String(formData.get("id")), 10);
  if (Number.isNaN(id)) return;
  const result = await deleteResource(id);
  if (result.error) {
    redirect(`/resources?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/resources");
}
