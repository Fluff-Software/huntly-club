import { supabase } from "./supabase";

export type AccountRemovalRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type AccountRemovalRequest = {
  id: number;
  user_id: string;
  reason: string | null;
  status: AccountRemovalRequestStatus;
  created_at: string;
};

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * True if the request was created less than 24 hours ago (user can still cancel).
 */
export function canCancelRemovalRequest(request: AccountRemovalRequest): boolean {
  const created = new Date(request.created_at).getTime();
  return Date.now() - created < TWENTY_FOUR_HOURS_MS;
}

/**
 * Returns the user's pending account removal request, if any.
 */
export async function getPendingRemovalRequest(
  userId: string
): Promise<AccountRemovalRequest | null> {
  const { data, error } = await supabase
    .from("account_removal_requests")
    .select("id, user_id, reason, status, created_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching pending removal request:", error);
    return null;
  }
  return data as AccountRemovalRequest | null;
}

/**
 * Submits an account removal request for the current user.
 * An admin must approve before the account is actually removed.
 */
export async function requestAccountRemoval(
  userId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase.from("account_removal_requests").insert({
    user_id: userId,
    reason: reason.trim() || null,
    status: "pending",
  });

  if (error) {
    console.error("Error submitting account removal request:", error);
    throw new Error(
      error.message || "Failed to submit account removal request"
    );
  }
}

/**
 * Cancels the user's pending account removal request.
 * Only allowed within 24 hours of creation.
 */
export async function cancelRemovalRequest(userId: string): Promise<void> {
  const pending = await getPendingRemovalRequest(userId);
  if (!pending) {
    throw new Error("No pending account removal request found");
  }
  if (!canCancelRemovalRequest(pending)) {
    throw new Error("Cancellation is only possible within 24 hours of submitting the request");
  }

  const { error } = await supabase
    .from("account_removal_requests")
    .update({ status: "cancelled" })
    .eq("id", pending.id)
    .eq("user_id", userId)
    .eq("status", "pending");

  if (error) {
    console.error("Error cancelling removal request:", error);
    throw new Error(
      error.message || "Failed to cancel account removal request"
    );
  }
}

export type AccountRemovalEmailType = "created" | "canceled";

/**
 * Sends the account-removal notification email (created or canceled).
 * Best-effort: does not throw; logs errors.
 */
export async function sendAccountRemovalNotification(
  email: string,
  type: AccountRemovalEmailType
): Promise<void> {
  if (!email?.trim()) return;
  try {
    await supabase.functions.invoke("account-removal-email", {
      body: { email: email.trim().toLowerCase(), type },
    });
  } catch (e) {
    console.error("Error sending account removal email:", e);
  }
}
