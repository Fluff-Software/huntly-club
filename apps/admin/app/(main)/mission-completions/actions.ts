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

export type MissionCompletionsSortKey = "completed_at" | "who" | "mission" | "debrief";
export type MissionCompletionsSortDir = "asc" | "desc";

export type MissionCompletionsQuery = {
  search?: string | null;
  sortBy?: MissionCompletionsSortKey;
  sortDir?: MissionCompletionsSortDir;
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
  query?: MissionCompletionsQuery
): Promise<MissionCompletionsPageResult> {
  const all = await fetchAllMissionCompletions();
  const term = query?.search?.trim().toLowerCase();

  let filtered = term
    ? all.filter((row) => {
        const emailOrId = (row.user_email ?? row.user_id ?? "").toLowerCase();
        const profile = (row.profile_name ?? row.profile_nickname ?? "").toLowerCase();
        const mission = (row.activity_title ?? row.activity_name ?? "").toLowerCase();
        return (
          emailOrId.includes(term) || profile.includes(term) || mission.includes(term)
        );
      })
    : all;

  const sortBy = query?.sortBy ?? "completed_at";
  const sortDir = query?.sortDir ?? "desc";
  const sortFactor = sortDir === "asc" ? 1 : -1;

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "completed_at") {
      return (
        (new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()) *
        sortFactor
      );
    }

    if (sortBy === "who") {
      const left = (a.user_email ?? a.profile_name ?? a.user_id ?? "").toLowerCase();
      const right = (b.user_email ?? b.profile_name ?? b.user_id ?? "").toLowerCase();
      return left.localeCompare(right) * sortFactor;
    }

    if (sortBy === "mission") {
      const left = (a.activity_title ?? a.activity_name ?? "").toLowerCase();
      const right = (b.activity_title ?? b.activity_name ?? "").toLowerCase();
      return left.localeCompare(right) * sortFactor;
    }

    const left = `${a.debrief_answer_1 ?? ""} ${a.debrief_answer_2 ?? ""}`.toLowerCase();
    const right = `${b.debrief_answer_1 ?? ""} ${b.debrief_answer_2 ?? ""}`.toLowerCase();
    return left.localeCompare(right) * sortFactor;
  });

  const items = filtered.slice(offset, offset + limit);
  return {
    items,
    hasMore: offset + items.length < filtered.length,
  };
}
