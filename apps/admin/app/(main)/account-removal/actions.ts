"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const USER_PHOTOS_BUCKET = "user-activity-photos";

function isOlderThan24h(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() >= TWENTY_FOUR_HOURS_MS;
}

export async function approveRemovalRequest(requestId: number): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { data: request, error: fetchError } = await supabase
    .from("account_removal_requests")
    .select("id, user_id, status, created_at")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    return { error: "Request not found" };
  }
  if (request.status !== "pending") {
    return { error: "Request is no longer pending" };
  }
  if (!isOlderThan24h(request.created_at)) {
    return { error: "Request can only be approved 24 hours after creation" };
  }

  const userId = request.user_id;

  try {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId);
    const profileIds = (profiles ?? []).map((p) => p.id);

    if (profileIds.length > 0) {
      await supabase
        .from("user_activity_photos")
        .delete()
        .in("profile_id", profileIds);
      await supabase
        .from("user_activity_progress")
        .delete()
        .in("profile_id", profileIds);
      await supabase
        .from("user_achievements")
        .delete()
        .in("profile_id", profileIds);
    }

    await supabase.from("user_badges").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("user_id", userId);

    const { data: list } = await supabase.storage
      .from(USER_PHOTOS_BUCKET)
      .list(userId, { limit: 1000 });
    const fileNames = list?.map((f) => f.name) ?? [];
    if (fileNames.length > 0) {
      await supabase.storage
        .from(USER_PHOTOS_BUCKET)
        .remove(fileNames.map((name) => `${userId}/${name}`));
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const currentEmail = authUser?.user?.email ?? "";
    if (currentEmail && !currentEmail.includes("(REMOVED)")) {
      try {
        await supabase.functions.invoke("account-removal-email", {
          body: { email: currentEmail, type: "processed" },
        });
      } catch (e) {
        console.error("Failed to send account-removal-email (processed):", e);
      }
      // Append (REMOVED) to the local part so the result is a valid email (domain unchanged)
      const atIndex = currentEmail.indexOf("@");
      const newEmail =
        atIndex > 0
          ? `${currentEmail.slice(0, atIndex)}(REMOVED)${currentEmail.slice(atIndex)}`
          : `${currentEmail}(REMOVED)`;
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        email: newEmail,
      });
      if (updateError) {
        console.error("Failed to update user email to (REMOVED):", updateError);
        return { error: `Account data was removed but email could not be updated: ${updateError.message}` };
      }
    }

    await supabase
      .from("account_removal_requests")
      .update({ status: "approved" })
      .eq("id", requestId);
  } catch (e) {
    console.error("Error processing account removal:", e);
    return { error: e instanceof Error ? e.message : "Failed to process removal" };
  }

  return {};
}

export async function denyRemovalRequest(requestId: number): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { data: request, error: fetchError } = await supabase
    .from("account_removal_requests")
    .select("id, user_id")
    .eq("id", requestId)
    .eq("status", "pending")
    .single();

  if (fetchError || !request) {
    return { error: "Request not found or no longer pending" };
  }

  const { data: authUser } = await supabase.auth.admin.getUserById(request.user_id);
  const email = authUser?.user?.email ?? "";

  const { error } = await supabase
    .from("account_removal_requests")
    .update({ status: "rejected" })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) return { error: error.message };

  if (email && !email.endsWith("(REMOVED)")) {
    try {
      await supabase.functions.invoke("account-removal-email", {
        body: { email, type: "denied" },
      });
    } catch (e) {
      console.error("Failed to send account-removal-email (denied):", e);
    }
  }
  return {};
}
