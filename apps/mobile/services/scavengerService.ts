import * as FileSystem from "expo-file-system/legacy";
import { decode as decodeBase64 } from "base64-arraybuffer";
import { supabase } from "./supabase";

export const SCAVENGER_PHOTO_BUCKET = "scavenger-photos";

export type ScavengerOnCompletion = {
  cta?: string;
  copy?: string;
  linkLabel?: string;
  linkUrl?: string;
} | null;

export type ScavengerQuest = {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  tile_image_url: string | null;
  tags: string[];
  published: boolean;
  is_grouped: boolean;
  lockable: boolean;
  group_id: string | null;
  lock_id: string | null;
  attraction_logo_url: string | null;
  attraction_colour_hex: string | null;
  attraction_name: string | null;
  attraction_bio: string | null;
  attraction_image_url: string | null;
  attraction_fun_facts: string[];
  attraction_website: string | null;
  attraction_address: string | null;
  attraction_lat: number | null;
  attraction_lng: number | null;
  on_completion: ScavengerOnCompletion;
  created_at: string;
  updated_at: string;
};

export type ScavengerQuestGroup = {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  display_order: number | null;
  tags: string[];
  published: boolean;
  lockable: boolean;
  lock_id: string | null;
  on_completion: ScavengerOnCompletion;
  created_at: string;
  updated_at: string;
};

export type ScavengerQuestItem = {
  id: string;
  quest_id: string;
  name: string;
  image_url: string | null;
  branded: boolean;
  description: string | null;
  hint: string | null;
  tags: string[];
  /** Normalized warning text (OG Alert `content`, `{ message }`, or plain string). */
  warning: string | null;
  lat: number | null;
  lng: number | null;
  question: string | null;
  has_question: boolean;
  order: number | null;
  created_at: string;
  updated_at: string;
};

export type ScavengerQuestLock = {
  id: string;
  types: string[];
  permanent_unlock: boolean;
  location_lat: number | null;
  location_lng: number | null;
  location_radius: number | null;
  requires_code: boolean;
  requires_location: boolean;
};

export type ScavengerQuestState = {
  id: number;
  profile_id: number;
  quest_id: string;
  found_items: string[];
  items_rewarded: string[];
  complete: boolean;
  is_current: boolean;
  created_at: string;
  updated_at: string;
};

export type ScavengerSessionPhoto = {
  id: number;
  user_id: string;
  profile_id: number;
  quest_id: string;
  quest_item_id: string | null;
  photo_url: string;
  item_name: string | null;
  created_at: string;
};

export type UnlockTargetType = "quest" | "questGroup";

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Mirrors OG Huntly `ItemWarningSchema`: plain string, `{ content }`, or `{ message }`.
 */
export function normalizeItemWarning(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed || null;
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.content === "string") {
      const trimmed = obj.content.trim();
      if (trimmed) return trimmed;
    }
    if (typeof obj.message === "string") {
      const trimmed = obj.message.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

export async function fetchPublishedQuests(): Promise<ScavengerQuest[]> {
  const { data, error } = await supabase
    .from("scavenger_quests_public")
    .select("*")
    .eq("is_grouped", false)
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    tags: asArray(row.tags),
    attraction_fun_facts: asArray(row.attraction_fun_facts),
  })) as ScavengerQuest[];
}

export async function fetchPublishedQuestGroups(): Promise<ScavengerQuestGroup[]> {
  const { data, error } = await supabase
    .from("scavenger_quest_groups_public")
    .select("*")
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    tags: asArray(row.tags),
  })) as ScavengerQuestGroup[];
}

export async function fetchQuestById(questId: string): Promise<ScavengerQuest | null> {
  const { data, error } = await supabase
    .from("scavenger_quests_public")
    .select("*")
    .eq("id", questId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    ...data,
    tags: asArray(data.tags),
    attraction_fun_facts: asArray(data.attraction_fun_facts),
  } as ScavengerQuest;
}

export async function fetchQuestGroupById(
  groupId: string
): Promise<ScavengerQuestGroup | null> {
  const { data, error } = await supabase
    .from("scavenger_quest_groups_public")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...data, tags: asArray(data.tags) } as ScavengerQuestGroup;
}

export async function fetchQuestsInGroup(groupId: string): Promise<ScavengerQuest[]> {
  const { data, error } = await supabase
    .from("scavenger_quests_public")
    .select("*")
    .eq("group_id", groupId)
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    tags: asArray(row.tags),
    attraction_fun_facts: asArray(row.attraction_fun_facts),
  })) as ScavengerQuest[];
}

export async function fetchQuestItems(questId: string): Promise<ScavengerQuestItem[]> {
  const { data, error } = await supabase
    .from("scavenger_quest_items_public")
    .select("*")
    .eq("quest_id", questId)
    .order("order", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    tags: asArray(row.tags),
    has_question: Boolean(row.has_question),
    warning: normalizeItemWarning(row.warning),
  })) as ScavengerQuestItem[];
}

export async function fetchLockById(lockId: string): Promise<ScavengerQuestLock | null> {
  const { data, error } = await supabase
    .from("scavenger_quest_locks_public")
    .select("*")
    .eq("id", lockId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    ...data,
    types: asArray(data.types),
  } as ScavengerQuestLock;
}

export async function fetchQuestState(
  profileId: number,
  questId: string
): Promise<ScavengerQuestState | null> {
  const { data, error } = await supabase
    .from("scavenger_quest_states")
    .select("*")
    .eq("profile_id", profileId)
    .eq("quest_id", questId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    ...data,
    found_items: asArray(data.found_items),
    items_rewarded: asArray(data.items_rewarded),
  } as ScavengerQuestState;
}

export async function fetchQuestStatesForProfile(
  profileId: number
): Promise<ScavengerQuestState[]> {
  const { data, error } = await supabase
    .from("scavenger_quest_states")
    .select("*")
    .eq("profile_id", profileId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    found_items: asArray(row.found_items),
    items_rewarded: asArray(row.items_rewarded),
  })) as ScavengerQuestState[];
}

export async function isPlayUnlocked(
  type: UnlockTargetType,
  itemId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("scavenger_is_play_unlocked", {
    p_type: type,
    p_item_id: itemId,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function unlockWithCode(
  type: UnlockTargetType,
  itemId: string,
  code: string
): Promise<{ ok: boolean; reason?: string; play_unlocked?: boolean }> {
  const { data, error } = await supabase.rpc("scavenger_unlock_with_code", {
    p_type: type,
    p_item_id: itemId,
    p_code: code,
  });
  if (error) throw new Error(error.message);
  return (data ?? { ok: false }) as {
    ok: boolean;
    reason?: string;
    play_unlocked?: boolean;
  };
}

/** Try quest then group unlock with a free-typed code (Huntly “Got a code?”). */
export async function unlockWithCodeAnywhere(code: string): Promise<{
  ok: boolean;
  type?: UnlockTargetType;
  itemId?: string;
  reason?: string;
}> {
  const [quests, groups] = await Promise.all([
    supabase
      .from("scavenger_quests_public")
      .select("id, lockable, lock_id")
      .eq("lockable", true)
      .not("lock_id", "is", null),
    supabase
      .from("scavenger_quest_groups_public")
      .select("id, lockable, lock_id")
      .eq("lockable", true)
      .not("lock_id", "is", null),
  ]);

  if (quests.error) throw new Error(quests.error.message);
  if (groups.error) throw new Error(groups.error.message);

  for (const quest of quests.data ?? []) {
    const result = await unlockWithCode("quest", quest.id, code);
    if (result.ok && result.play_unlocked) {
      return { ok: true, type: "quest", itemId: quest.id };
    }
  }

  for (const group of groups.data ?? []) {
    const result = await unlockWithCode("questGroup", group.id, code);
    if (result.ok && result.play_unlocked) {
      return { ok: true, type: "questGroup", itemId: group.id };
    }
  }

  return { ok: false, reason: "incorrect_code" };
}

export async function unlockWithLocation(
  type: UnlockTargetType,
  itemId: string,
  lat: number,
  lng: number
): Promise<{
  ok: boolean;
  reason?: string;
  play_unlocked?: boolean;
  distance_meters?: number;
}> {
  const { data, error } = await supabase.rpc("scavenger_unlock_with_location", {
    p_type: type,
    p_item_id: itemId,
    p_lat: lat,
    p_lng: lng,
  });
  if (error) throw new Error(error.message);
  return (data ?? { ok: false }) as {
    ok: boolean;
    reason?: string;
    play_unlocked?: boolean;
    distance_meters?: number;
  };
}

export async function ensureQuestState(
  profileId: number,
  questId: string
): Promise<ScavengerQuestState> {
  const { data, error } = await supabase.rpc("scavenger_ensure_quest_state", {
    p_profile_id: profileId,
    p_quest_id: questId,
  });
  if (error) throw new Error(error.message);
  const row = data as ScavengerQuestState;
  return {
    ...row,
    found_items: asArray(row.found_items),
    items_rewarded: asArray(row.items_rewarded),
  };
}

export async function restartQuest(
  profileId: number,
  questId: string
): Promise<ScavengerQuestState> {
  const { data, error } = await supabase.rpc("scavenger_restart_quest", {
    p_profile_id: profileId,
    p_quest_id: questId,
  });
  if (error) throw new Error(error.message);
  const row = data as ScavengerQuestState;
  return {
    ...row,
    found_items: asArray(row.found_items),
    items_rewarded: asArray(row.items_rewarded),
  };
}

export async function markItemFound(
  profileId: number,
  itemId: string
): Promise<{
  ok: boolean;
  reason?: string;
  found_items?: string[];
  complete?: boolean;
  already_found?: boolean;
}> {
  const { data, error } = await supabase.rpc("scavenger_mark_item_found", {
    p_profile_id: profileId,
    p_item_id: itemId,
  });
  if (error) throw new Error(error.message);
  return (data ?? { ok: false }) as {
    ok: boolean;
    reason?: string;
    found_items?: string[];
    complete?: boolean;
    already_found?: boolean;
  };
}

export async function validateItemAnswer(
  profileId: number,
  itemId: string,
  answer: string
): Promise<{
  ok: boolean;
  reason?: string;
  is_correct?: boolean;
  has_question?: boolean;
  item_marked_as_found?: boolean;
  found_items?: string[];
  complete?: boolean;
}> {
  const { data, error } = await supabase.rpc("scavenger_validate_item_answer", {
    p_profile_id: profileId,
    p_item_id: itemId,
    p_answer: answer,
  });
  if (error) throw new Error(error.message);
  return (data ?? { ok: false }) as {
    ok: boolean;
    reason?: string;
    is_correct?: boolean;
    has_question?: boolean;
    item_marked_as_found?: boolean;
    found_items?: string[];
    complete?: boolean;
  };
}

export async function endHuntSession(
  profileId: number,
  questId: string
): Promise<{
  ok: boolean;
  awarded: boolean;
  items_found_this_session: number;
  item_ids: string[];
  xp: number;
  message?: string;
  complete?: boolean;
}> {
  const { data, error } = await supabase.rpc("scavenger_end_session", {
    p_profile_id: profileId,
    p_quest_id: questId,
  });
  if (error) throw new Error(error.message);
  const row = (data ?? {}) as {
    ok?: boolean;
    awarded?: boolean;
    items_found_this_session?: number;
    item_ids?: string[];
    xp?: number;
    message?: string;
    complete?: boolean;
  };
  return {
    ok: Boolean(row.ok),
    awarded: Boolean(row.awarded),
    items_found_this_session: row.items_found_this_session ?? 0,
    item_ids: Array.isArray(row.item_ids) ? row.item_ids : [],
    xp: row.xp ?? 0,
    message: row.message,
    complete: row.complete,
  };
}

export async function fetchSessionPhotos(
  profileId: number,
  questId: string
): Promise<ScavengerSessionPhoto[]> {
  const { data, error } = await supabase
    .from("scavenger_session_photos")
    .select("*")
    .eq("profile_id", profileId)
    .eq("quest_id", questId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ScavengerSessionPhoto[];
}

export async function uploadScavengerPhoto(
  localUri: string,
  userId: string
): Promise<string> {
  const filePath = `${userId}/${Date.now()}.jpg`;
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: "base64",
  });
  if (!base64) throw new Error("Could not read photo data from device");

  const { error } = await supabase.storage
    .from(SCAVENGER_PHOTO_BUCKET)
    .upload(filePath, decodeBase64(base64), {
      cacheControl: "3600",
      upsert: false,
      contentType: "image/jpeg",
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage
    .from(SCAVENGER_PHOTO_BUCKET)
    .getPublicUrl(filePath);
  return data.publicUrl;
}

export async function addSessionPhoto(input: {
  userId: string;
  profileId: number;
  questId: string;
  questItemId?: string;
  itemName?: string;
  localUri: string;
}): Promise<ScavengerSessionPhoto> {
  const photoUrl = await uploadScavengerPhoto(input.localUri, input.userId);
  const { data, error } = await supabase
    .from("scavenger_session_photos")
    .insert({
      user_id: input.userId,
      profile_id: input.profileId,
      quest_id: input.questId,
      quest_item_id: input.questItemId ?? null,
      photo_url: photoUrl,
      item_name: input.itemName ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as ScavengerSessionPhoto;
}

export async function discardSessionPhotos(
  profileId: number,
  questId: string
): Promise<void> {
  const { error } = await supabase.rpc("scavenger_discard_session_photos", {
    p_profile_id: profileId,
    p_quest_id: questId,
  });
  if (error) throw new Error(error.message);
}

export async function fetchGroupCompletionStatus(
  profileId: number,
  groupId: string
): Promise<{
  ok: boolean;
  all_completed: boolean;
  has_cta: boolean;
  on_completion: ScavengerOnCompletion;
  quest_count: number;
}> {
  const { data, error } = await supabase.rpc("scavenger_group_completion_status", {
    p_profile_id: profileId,
    p_group_id: groupId,
  });
  if (error) throw new Error(error.message);
  return (data ?? {
    ok: false,
    all_completed: false,
    has_cta: false,
    on_completion: null,
    quest_count: 0,
  }) as {
    ok: boolean;
    all_completed: boolean;
    has_cta: boolean;
    on_completion: ScavengerOnCompletion;
    quest_count: number;
  };
}
