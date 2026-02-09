"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createServerAuthClient } from "@/lib/supabase-server-auth";
import { revalidatePath } from "next/cache";

export type AddAdminState = { error?: string };

export async function addAdminByEmail(
  _prev: AddAdminState,
  formData: FormData
): Promise<AddAdminState> {
  const email = (formData.get("email") as string)?.trim()?.toLowerCase();
  if (!email) return { error: "Email is required" };

  const supabase = createServerSupabaseClient();
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) return { error: error.message };
    const user = data.users.find(
      (u) => u.email?.toLowerCase() === email
    );
    if (user) {
      const { error: insertError } = await supabase
        .from("admins")
        .insert({ user_id: user.id });
      if (insertError) {
        if (insertError.code === "23505") return { error: "Already an admin." };
        return { error: insertError.message };
      }
      revalidatePath("/admins");
      return {};
    }
    if (data.users.length < perPage) break;
    page++;
  }

  return { error: "No user with that email found. They must sign up first." };
}

export async function removeAdmin(userId: string): Promise<{ error?: string }> {
  const auth = await createServerAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (user?.id === userId) return { error: "You cannot remove yourself." };

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("admins").delete().eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admins");
  return {};
}
