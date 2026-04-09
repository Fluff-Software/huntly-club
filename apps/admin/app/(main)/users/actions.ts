"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";

export type UserListItem = {
  id: string;
  email: string | null;
  created_at: string;
  profile_count: number;
};

const USERS_PAGE_SIZE = 30;

async function fetchAllUsersSorted(): Promise<UserListItem[]> {
  const supabase = createServerSupabaseClient();
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id")
    .order("user_id");

  if (profilesError) throw new Error(profilesError.message);
  const uniqueUserIds = [...new Set((profiles ?? []).map((p) => p.user_id))];
  const profileCountByUser = (profiles ?? []).reduce<Record<string, number>>(
    (acc, p) => {
      acc[p.user_id] = (acc[p.user_id] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const withAuth = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const { data } = await supabase.auth.admin.getUserById(userId);
      const user = data?.user;
      return {
        id: userId,
        email: user?.email ?? null,
        created_at: user?.created_at ?? new Date(0).toISOString(),
        profile_count: profileCountByUser[userId] ?? 0,
      };
    })
  );

  return withAuth.sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export async function getUsersList(): Promise<UserListItem[]> {
  return fetchAllUsersSorted();
}

export type UsersListPageResult = {
  users: UserListItem[];
  hasMore: boolean;
};

export async function getUsersListPage(
  offset: number,
  limit: number = USERS_PAGE_SIZE,
  search?: string | null
): Promise<UsersListPageResult> {
  const all = await fetchAllUsersSorted();
  const filtered = search?.trim()
    ? all.filter((u) =>
        (u.email ?? u.id).toLowerCase().includes(search.trim().toLowerCase())
      )
    : all;
  const users = filtered.slice(offset, offset + limit);
  return { users, hasMore: offset + users.length < filtered.length };
}

export type UserDetailsResult = {
  error?: string;
  user?: {
    id: string;
    email: string | null;
    created_at: string;
    email_confirmed_at: string | null;
    last_sign_in_at: string | null;
    updated_at: string;
    raw_app_meta_data?: Record<string, unknown>;
    raw_user_meta_data?: Record<string, unknown>;
  };
  teamName?: string | null;
};

export async function getUserDetails(
  userId: string
): Promise<UserDetailsResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) return { error: error.message };
    const user = data?.user;
    if (!user) return { error: "User not found" };

    let teamName: string | null = null;
    const { data: userData } = await supabase
      .from("user_data")
      .select("team")
      .eq("user_id", userId)
      .single();
    if (userData?.team != null) {
      const { data: team } = await supabase
        .from("teams")
        .select("name")
        .eq("id", userData.team)
        .single();
      teamName = team?.name ?? null;
    }

    return {
      user: {
        id: user.id,
        email: user.email ?? null,
        created_at: user.created_at ?? "",
        email_confirmed_at: user.email_confirmed_at ?? null,
        last_sign_in_at: user.last_sign_in_at ?? null,
        updated_at: user.updated_at ?? "",
        raw_app_meta_data: user.app_metadata as Record<string, unknown> | undefined,
        raw_user_meta_data: user.user_metadata as Record<string, unknown> | undefined,
      },
      teamName,
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to load user details",
    };
  }
}

export type ProfileWithTeam = {
  id: number;
  colour: string;
  created_at: string;
  name: string;
  nickname: string | null;
  user_id: string;
  total_achievement_xp: number;
};

export type UserProfilesResult = {
  error?: string;
  profiles?: ProfileWithTeam[];
};

export async function getUserProfiles(
  userId: string
): Promise<UserProfilesResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: profileRows, error } = await supabase
      .from("profiles")
      .select(
        `
        id,
        colour,
        created_at,
        name,
        nickname,
        user_id
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) return { error: error.message };
    const rows = (profileRows ?? []) as unknown as Omit<ProfileWithTeam, "total_achievement_xp">[];
    const profileIds = rows.map((r) => r.id);

    const xpByProfile: Record<number, number> = {};
    if (profileIds.length > 0) {
      const { data: achievements } = await supabase
        .from("user_achievements")
        .select("profile_id, xp")
        .in("profile_id", profileIds);
      for (const row of achievements ?? []) {
        const pid = row.profile_id as number;
        xpByProfile[pid] = (xpByProfile[pid] ?? 0) + (row.xp ?? 0);
      }
    }

    const profiles: ProfileWithTeam[] = rows.map((r) => ({
      ...r,
      total_achievement_xp: xpByProfile[r.id] ?? 0,
    }));
    return { profiles };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to load profiles",
    };
  }
}

export type UserImageRow = {
  photo_id: number;
  photo_url: string;
  uploaded_at: string;
  status: number;
  reason: string | null;
  activity_id: number | null;
  profile_id: number;
  activities: { id: number; title: string | null; name: string } | null;
  profiles: { id: number; nickname: string | null; name: string } | null;
};

export type UserImagesResult = {
  error?: string;
  images?: UserImageRow[];
};

export type VerifyUserEmailResult = {
  error?: string;
  success?: boolean;
};

export async function verifyUserEmail(
  userId: string
): Promise<VerifyUserEmailResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    if (error) return { error: error.message };
    return { success: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to verify email",
    };
  }
}

export type UnverifiedUserItem = {
  id: string;
  email: string | null;
  created_at: string;
};

export type UnverifiedUsersResult = {
  error?: string;
  users?: UnverifiedUserItem[];
};

export async function getUnverifiedUsers(): Promise<UnverifiedUsersResult> {
  try {
    const supabase = createServerSupabaseClient();
    const allUsers: UnverifiedUserItem[] = [];
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) return { error: error.message };
      const unverified = (data?.users ?? [])
        .filter((u) => !u.email_confirmed_at)
        .map((u) => ({
          id: u.id,
          email: u.email ?? null,
          created_at: u.created_at,
        }));
      allUsers.push(...unverified);
      if ((data?.users ?? []).length < perPage) break;
      page++;
    }

    allUsers.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return { users: allUsers };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to load unverified users",
    };
  }
}

export async function getUserImages(userId: string): Promise<UserImagesResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: profileIds, error: profilesError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId);

    if (profilesError) return { error: profilesError.message };
    const ids = (profileIds ?? []).map((p) => p.id);
    if (ids.length === 0) return { images: [] };

    const { data, error } = await supabase
      .from("user_activity_photos")
      .select(
        `
        photo_id,
        photo_url,
        uploaded_at,
        status,
        reason,
        activity_id,
        profile_id,
        activities ( id, title, name ),
        profiles ( id, nickname, name )
      `
      )
      .in("profile_id", ids)
      .order("uploaded_at", { ascending: false });

    if (error) return { error: error.message };
    return { images: (data ?? []) as unknown as UserImageRow[] };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to load images",
    };
  }
}
