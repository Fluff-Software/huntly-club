"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";

export type FeedbackListItem = {
  id: number;
  created_at: string;
  profile_id: number | null;
  team_id: number | null;
  user_id: string | null;
  user_email: string | null;
  source: string | null;
  screen: string | null;
  message: string | null;
  device_platform: string | null;
  device_model: string | null;
  app_version: string | null;
  app_build: string | null;
  app_environment: string | null;
  handled: boolean | null;
};

const FEEDBACK_PAGE_SIZE = 50;

async function fetchAllFeedback(): Promise<FeedbackListItem[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("user_feedback")
    .select(
      [
        "id",
        "created_at",
        "profile_id",
        "team_id",
        "user_id",
        "source",
        "screen",
        "message",
        "device_platform",
        "device_model",
        "app_version",
        "app_build",
        "app_environment",
        "handled",
      ].join(",")
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const baseRows = (data ?? []) as unknown as Omit<FeedbackListItem, "user_email">[];
  const userIds = Array.from(
    new Set(
      baseRows
        .map((row) => row.user_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  const emailByUserId: Record<string, string | null> = {};

  await Promise.all(
    userIds.map(async (userId) => {
      const { data: authData } = await supabase.auth.admin.getUserById(userId);
      const user = authData?.user;
      emailByUserId[userId] = user?.email ?? null;
    })
  );

  return baseRows.map((row) => ({
    ...row,
    user_email: row.user_id ? emailByUserId[row.user_id] ?? null : null,
  }));
}

export type FeedbackPageResult = {
  items: FeedbackListItem[];
  hasMore: boolean;
};

export async function getFeedbackPage(
  offset: number,
  limit: number = FEEDBACK_PAGE_SIZE,
  search?: string | null
): Promise<FeedbackPageResult> {
  const all = await fetchAllFeedback();
  const term = search?.trim().toLowerCase();

  const filtered = term
    ? all.filter((row) => {
        const emailOrId = (row.user_email ?? row.user_id ?? "").toLowerCase();
        const message = (row.message ?? "").toLowerCase();
        const screen = (row.screen ?? "").toLowerCase();
        return (
          emailOrId.includes(term) ||
          message.includes(term) ||
          screen.includes(term)
        );
      })
    : all;

  const items = filtered.slice(offset, offset + limit);
  return {
    items,
    hasMore: offset + items.length < filtered.length,
  };
}

export async function setFeedbackHandled(
  id: number,
  handled: boolean
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("user_feedback")
    .update({ handled })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

