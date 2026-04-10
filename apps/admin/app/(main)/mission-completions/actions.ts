"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";

const PAGE_SIZE = 30;

type CompletionQueryRow = {
  id: number;
  profile_id: number;
  activity_id: number;
  completed_at: string | null;
  debrief_answer_1: string | null;
  debrief_answer_2: string | null;
  profiles: {
    id: number;
    user_id: string;
    name: string;
    nickname: string | null;
  } | null;
  activities: {
    id: number;
    name: string;
    title: string;
    debrief_question_1: string | null;
    debrief_question_2: string | null;
  } | null;
};

type CompletionPhotoRow = {
  user_activity_id: number;
  photo_url: string;
};

export type MissionCompletionItem = {
  id: number;
  completed_at: string;
  profile_id: number;
  profile_name: string | null;
  profile_nickname: string | null;
  user_id: string | null;
  user_email: string | null;
  activity_id: number | null;
  activity_name: string | null;
  activity_title: string | null;
  debrief_question_1: string | null;
  debrief_question_2: string | null;
  debrief_answer_1: string | null;
  debrief_answer_2: string | null;
  photo_urls: string[];
};

export type MissionCompletionsPageResult = {
  items: MissionCompletionItem[];
  hasMore: boolean;
};

async function fetchAllMissionCompletions(): Promise<MissionCompletionItem[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("user_activity_progress")
    .select(
      `
      id,
      profile_id,
      activity_id,
      completed_at,
      debrief_answer_1,
      debrief_answer_2,
      profiles (
        id,
        user_id,
        name,
        nickname
      ),
      activities (
        id,
        name,
        title,
        debrief_question_1,
        debrief_question_2
      )
    `
    )
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as CompletionQueryRow[];
  const completionIds = rows.map((row) => row.id);
  const userIds = Array.from(
    new Set(
      rows
        .map((row) => row.profiles?.user_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  const emailByUserId: Record<string, string | null> = {};
  await Promise.all(
    userIds.map(async (userId) => {
      const { data: authData } = await supabase.auth.admin.getUserById(userId);
      emailByUserId[userId] = authData?.user?.email ?? null;
    })
  );

  const photoUrlsByCompletionId: Record<number, string[]> = {};
  if (completionIds.length > 0) {
    const { data: photosData, error: photosError } = await supabase
      .from("user_activity_photos")
      .select("user_activity_id, photo_url")
      .in("user_activity_id", completionIds)
      .order("uploaded_at", { ascending: true });

    if (photosError) throw new Error(photosError.message);
    const photoRows = (photosData ?? []) as unknown as CompletionPhotoRow[];
    for (const row of photoRows) {
      if (!photoUrlsByCompletionId[row.user_activity_id]) {
        photoUrlsByCompletionId[row.user_activity_id] = [];
      }
      photoUrlsByCompletionId[row.user_activity_id].push(row.photo_url);
    }
  }

  return rows.map((row) => {
    const profile = row.profiles;
    const activity = row.activities;
    const userId = profile?.user_id ?? null;

    return {
      id: row.id,
      completed_at: row.completed_at ?? new Date(0).toISOString(),
      profile_id: row.profile_id,
      profile_name: profile?.name ?? null,
      profile_nickname: profile?.nickname ?? null,
      user_id: userId,
      user_email: userId ? emailByUserId[userId] ?? null : null,
      activity_id: row.activity_id ?? null,
      activity_name: activity?.name ?? null,
      activity_title: activity?.title ?? null,
      debrief_question_1: activity?.debrief_question_1 ?? null,
      debrief_question_2: activity?.debrief_question_2 ?? null,
      debrief_answer_1: row.debrief_answer_1 ?? null,
      debrief_answer_2: row.debrief_answer_2 ?? null,
      photo_urls: photoUrlsByCompletionId[row.id] ?? [],
    };
  });
}

export async function getMissionCompletionsPage(
  offset: number,
  limit: number = PAGE_SIZE,
  search?: string | null
): Promise<MissionCompletionsPageResult> {
  const all = await fetchAllMissionCompletions();
  const term = search?.trim().toLowerCase();

  const filtered = term
    ? all.filter((row) => {
        const emailOrId = (row.user_email ?? row.user_id ?? "").toLowerCase();
        const profile = (row.profile_name ?? row.profile_nickname ?? "").toLowerCase();
        const mission = (row.activity_title ?? row.activity_name ?? "").toLowerCase();
        return (
          emailOrId.includes(term) || profile.includes(term) || mission.includes(term)
        );
      })
    : all;

  const items = filtered.slice(offset, offset + limit);
  return {
    items,
    hasMore: offset + items.length < filtered.length,
  };
}
