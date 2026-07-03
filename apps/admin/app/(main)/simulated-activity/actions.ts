"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { uploadSimulatedActivityPhoto } from "@/lib/upload-actions";
import { generateFakeNickname, pickRandomProfileColour } from "@/lib/fakeExplorers";
import { revalidatePath } from "next/cache";

const SIMULATED_ACTIVITY_PATH = "/simulated-activity";

// --- Settings ---

export type SimulatedActivitySettings = {
  enabled: boolean;
  completionsPerDay: number;
};

export async function getSimulatedActivitySettings(): Promise<SimulatedActivitySettings> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("simulated_activity_settings")
    .select("enabled, completions_per_day")
    .eq("id", 1)
    .single();

  if (error) throw new Error(error.message);
  return { enabled: data.enabled, completionsPerDay: data.completions_per_day };
}

export async function updateSimulatedActivitySettings(
  settings: SimulatedActivitySettings
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("simulated_activity_settings")
    .update({
      enabled: settings.enabled,
      completions_per_day: settings.completionsPerDay,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { error: error.message };
  revalidatePath(SIMULATED_ACTIVITY_PATH);
  return {};
}

// --- Teams (for assigning fake explorers) ---

export type TeamOption = { id: number; name: string };

export async function getTeams(): Promise<TeamOption[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("teams").select("id, name").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

// --- Fake explorer pool ---

export type FakeExplorer = {
  userId: string;
  profileId: number;
  nickname: string;
  colour: string;
  teamId: number | null;
  teamName: string | null;
  completionCount: number;
};

export async function getFakeExplorers(): Promise<FakeExplorer[]> {
  const supabase = createServerSupabaseClient();

  const { data: accounts, error: accountsError } = await supabase
    .from("simulated_accounts")
    .select("user_id");
  if (accountsError) throw new Error(accountsError.message);

  const userIds = (accounts ?? []).map((a) => a.user_id as string);
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, user_id, nickname, colour")
    .in("user_id", userIds);
  if (profilesError) throw new Error(profilesError.message);

  const { data: userData, error: userDataError } = await supabase
    .from("user_data")
    .select("user_id, team")
    .in("user_id", userIds);
  if (userDataError) throw new Error(userDataError.message);

  const teamByUser: Record<string, number | null> = {};
  for (const row of userData ?? []) teamByUser[row.user_id] = row.team ?? null;

  const teamIds = Array.from(
    new Set(Object.values(teamByUser).filter((t): t is number => t != null))
  );
  const teamNameById: Record<number, string> = {};
  if (teamIds.length > 0) {
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", teamIds);
    if (teamsError) throw new Error(teamsError.message);
    for (const t of teams ?? []) teamNameById[t.id] = t.name;
  }

  const profileIds = (profiles ?? []).map((p) => p.id);
  const completionCountByProfile: Record<number, number> = {};
  if (profileIds.length > 0) {
    const { data: completions, error: completionsError } = await supabase
      .from("user_activity_progress")
      .select("profile_id")
      .in("profile_id", profileIds);
    if (completionsError) throw new Error(completionsError.message);
    for (const row of completions ?? []) {
      completionCountByProfile[row.profile_id] =
        (completionCountByProfile[row.profile_id] ?? 0) + 1;
    }
  }

  return (profiles ?? [])
    .map((p) => {
      const teamId = teamByUser[p.user_id] ?? null;
      return {
        userId: p.user_id as string,
        profileId: p.id as number,
        nickname: (p.nickname as string | null) ?? "Explorer",
        colour: p.colour as string,
        teamId,
        teamName: teamId != null ? teamNameById[teamId] ?? null : null,
        completionCount: completionCountByProfile[p.id] ?? 0,
      };
    })
    .sort((a, b) => a.nickname.localeCompare(b.nickname));
}

export async function createFakeExplorers(
  count: number,
  teamId: number | null
): Promise<{ error?: string; created?: number }> {
  if (!Number.isInteger(count) || count < 1 || count > 50) {
    return { error: "Choose a count between 1 and 50." };
  }

  const supabase = createServerSupabaseClient();

  let candidateTeamIds: number[];
  if (teamId != null) {
    candidateTeamIds = [teamId];
  } else {
    const { data: teams, error: teamsError } = await supabase.from("teams").select("id");
    if (teamsError) return { error: teamsError.message };
    candidateTeamIds = (teams ?? []).map((t) => t.id as number);
    if (candidateTeamIds.length === 0) {
      return { error: "No teams exist to assign fake explorers to." };
    }
  }

  for (let i = 0; i < count; i++) {
    const email = `sim-${crypto.randomUUID()}@internal.huntlyclub.fake`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { simulated: true },
    });
    if (authError || !authData?.user) {
      return { error: authError?.message ?? "Failed to create fake account" };
    }
    const userId = authData.user.id;
    const assignedTeamId =
      candidateTeamIds[Math.floor(Math.random() * candidateTeamIds.length)];

    const { error: markError } = await supabase
      .from("simulated_accounts")
      .insert({ user_id: userId });
    if (markError) return { error: markError.message };

    const { error: userDataError } = await supabase
      .from("user_data")
      .insert({ user_id: userId, team: assignedTeamId });
    if (userDataError) return { error: userDataError.message };

    const nickname = generateFakeNickname();
    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: userId,
      name: nickname,
      nickname,
      colour: pickRandomProfileColour(),
      xp: 0,
    });
    if (profileError) return { error: profileError.message };
  }

  revalidatePath(SIMULATED_ACTIVITY_PATH);
  return { created: count };
}

export async function deleteFakeExplorer(userId: string): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  // Guard: only ever delete through this path if the account is in the
  // simulated pool, so this can never be pointed at a real user.
  const { data: account, error: accountError } = await supabase
    .from("simulated_accounts")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (accountError) return { error: accountError.message };
  if (!account) return { error: "This account is not part of the simulated pool." };

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId);
  if (profilesError) return { error: profilesError.message };
  const profileIds = (profiles ?? []).map((p) => p.id);

  if (profileIds.length > 0) {
    await supabase.from("user_activity_photos").delete().in("profile_id", profileIds);
    await supabase.from("user_activity_progress").delete().in("profile_id", profileIds);
    await supabase.from("user_achievements").delete().in("profile_id", profileIds);
  }

  await supabase.from("user_data").delete().eq("user_id", userId);
  await supabase.from("profiles").delete().eq("user_id", userId);
  await supabase.from("simulated_accounts").delete().eq("user_id", userId);

  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
  if (deleteAuthError) return { error: deleteAuthError.message };

  revalidatePath(SIMULATED_ACTIVITY_PATH);
  return {};
}

export async function purgeSimulatedActivity(): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { data: accounts, error: accountsError } = await supabase
    .from("simulated_accounts")
    .select("user_id");
  if (accountsError) return { error: accountsError.message };
  const userIds = (accounts ?? []).map((a) => a.user_id as string);
  if (userIds.length === 0) return {};

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id")
    .in("user_id", userIds);
  if (profilesError) return { error: profilesError.message };
  const profileIds = (profiles ?? []).map((p) => p.id);
  if (profileIds.length === 0) return {};

  await supabase.from("user_activity_photos").delete().in("profile_id", profileIds);
  await supabase.from("user_activity_progress").delete().in("profile_id", profileIds);
  await supabase.from("user_achievements").delete().in("profile_id", profileIds);

  revalidatePath(SIMULATED_ACTIVITY_PATH);
  return {};
}

// --- Recent activity log ---

export type RecentSimulatedCompletion = {
  id: number;
  completedAt: string;
  nickname: string;
  activityTitle: string | null;
  hasPhoto: boolean;
};

type RecentCompletionRow = {
  id: number;
  profile_id: number;
  completed_at: string | null;
  activities: { title: string | null } | null;
};

export async function getRecentSimulatedActivity(
  limit: number = 20
): Promise<RecentSimulatedCompletion[]> {
  const supabase = createServerSupabaseClient();

  const { data: accounts, error: accountsError } = await supabase
    .from("simulated_accounts")
    .select("user_id");
  if (accountsError) throw new Error(accountsError.message);
  const userIds = (accounts ?? []).map((a) => a.user_id as string);
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("user_id", userIds);
  if (profilesError) throw new Error(profilesError.message);
  const profileIds = (profiles ?? []).map((p) => p.id);
  const nicknameByProfile: Record<number, string> = {};
  for (const p of profiles ?? []) nicknameByProfile[p.id] = (p.nickname as string | null) ?? "Explorer";
  if (profileIds.length === 0) return [];

  const { data: completions, error: completionsError } = await supabase
    .from("user_activity_progress")
    .select("id, profile_id, completed_at, activities (title)")
    .in("profile_id", profileIds)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(limit);
  if (completionsError) throw new Error(completionsError.message);

  const rows = (completions ?? []) as unknown as RecentCompletionRow[];
  const completionIds = rows.map((c) => c.id);
  const photoCompletionIds = new Set<number>();
  if (completionIds.length > 0) {
    const { data: photos } = await supabase
      .from("user_activity_photos")
      .select("user_activity_id")
      .in("user_activity_id", completionIds);
    for (const row of photos ?? []) {
      if (row.user_activity_id != null) photoCompletionIds.add(row.user_activity_id as number);
    }
  }

  return rows.map((c) => ({
    id: c.id,
    completedAt: c.completed_at ?? new Date(0).toISOString(),
    nickname: nicknameByProfile[c.profile_id] ?? "Explorer",
    activityTitle: c.activities?.title ?? null,
    hasPhoto: photoCompletionIds.has(c.id),
  }));
}

// --- Photo pool ---

export type ActivityOption = { id: number; title: string };

export async function getActivitiesForPhotoPool(): Promise<ActivityOption[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("activities").select("id, title").order("title");
  if (error) throw new Error(error.message);
  return (data ?? []).map((a) => ({ id: a.id, title: a.title ?? `Activity #${a.id}` }));
}

export type SimulatedActivityPhoto = { id: number; photoUrl: string };

export async function listSimulatedActivityPhotos(
  activityId: number
): Promise<SimulatedActivityPhoto[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("simulated_activity_photos")
    .select("id, photo_url")
    .eq("activity_id", activityId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({ id: p.id, photoUrl: p.photo_url }));
}

export async function addSimulatedActivityPhoto(
  activityId: number,
  formData: FormData
): Promise<{ error?: string }> {
  const { url, error } = await uploadSimulatedActivityPhoto(formData);
  if (error || !url) return { error: error ?? "Upload failed" };

  const supabase = createServerSupabaseClient();
  const { error: insertError } = await supabase
    .from("simulated_activity_photos")
    .insert({ activity_id: activityId, photo_url: url });
  if (insertError) return { error: insertError.message };

  revalidatePath(SIMULATED_ACTIVITY_PATH);
  return {};
}

export async function deleteSimulatedActivityPhoto(photoId: number): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("simulated_activity_photos").delete().eq("id", photoId);
  if (error) return { error: error.message };
  revalidatePath(SIMULATED_ACTIVITY_PATH);
  return {};
}
