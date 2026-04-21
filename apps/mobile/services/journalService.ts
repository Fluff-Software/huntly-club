import * as FileSystem from "expo-file-system/legacy";
import { decode as decodeBase64 } from "base64-arraybuffer";
import { supabase } from "./supabase";

export const JOURNAL_PHOTO_BUCKET = "journal-photos";
export const JOURNAL_XP_PER_ENTRY = 5;

export const ACTIVITY_TAGS = [
  "Walk",
  "Cycle",
  "Mission",
  "Nature spotting",
  "Den building",
  "Water",
  "Art & crafts",
  "Photography",
  "Gardening",
  "Other",
] as const;

export type ActivityTag = (typeof ACTIVITY_TAGS)[number];

export interface JournalEntry {
  id: number;
  user_id: string;
  profile_id: number;
  title: string;
  notes: string | null;
  photo_url: string | null;
  activity_tag: ActivityTag;
  entry_date: string; // 'YYYY-MM-DD'
  created_at: string;
  profile?: { nickname: string };
}

export interface CompletedMissionEntry {
  id: number; // user_activity_progress.id
  profile_id: number;
  activity_id: number;
  completed_at: string;
  activity_title: string;
  debrief_question_1: string | null;
  debrief_question_2: string | null;
  debrief_answer_1: string | null;
  debrief_answer_2: string | null;
  notes: string | null;
  photos: string[]; // photo_url array from user_activity_photos
  profile?: { nickname: string };
}

export type JournalTimelineItem =
  | { type: "manual"; sortDate: string; entry: JournalEntry }
  | { type: "mission"; sortDate: string; mission: CompletedMissionEntry };

export interface CreateJournalEntryInput {
  userId: string;
  profileId: number;
  teamId: number;
  title: string;
  notes?: string;
  photoLocalUri?: string;
  activityTag: ActivityTag;
  entryDate: string; // 'YYYY-MM-DD'
}

async function uploadJournalPhoto(
  localUri: string,
  userId: string
): Promise<string> {
  const filePath = `${userId}/${Date.now()}.jpg`;

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: "base64",
  });

  if (!base64 || base64.length === 0) {
    throw new Error("Could not read photo data from device");
  }

  const arrayBuffer = decodeBase64(base64);

  const { error } = await supabase.storage
    .from(JOURNAL_PHOTO_BUCKET)
    .upload(filePath, arrayBuffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: "image/jpeg",
    });

  if (error) {
    throw new Error(`Failed to upload journal photo: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(JOURNAL_PHOTO_BUCKET)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

export async function createJournalEntry(
  input: CreateJournalEntryInput
): Promise<JournalEntry> {
  let photoUrl: string | null = null;

  if (input.photoLocalUri) {
    photoUrl = await uploadJournalPhoto(input.photoLocalUri, input.userId);
  }

  const { data: newEntry, error: insertError } = await supabase
    .from("journal_entries")
    .insert({
      user_id: input.userId,
      profile_id: input.profileId,
      title: input.title,
      notes: input.notes || null,
      photo_url: photoUrl,
      activity_tag: input.activityTag,
      entry_date: input.entryDate,
    })
    .select("*, profile:profiles!inner(nickname)")
    .single();

  if (insertError) {
    throw new Error(`Failed to create journal entry: ${insertError.message}`);
  }

  const { error: xpError } = await supabase.from("user_achievements").insert({
    profile_id: input.profileId,
    team_id: input.teamId,
    source: "journal",
    source_id: newEntry.id,
    message: "wrote a journal entry",
    xp: JOURNAL_XP_PER_ENTRY,
  });

  if (xpError) {
    console.error("Failed to award journal XP:", xpError);
    // Non-fatal: entry is saved, just XP failed
  }

  return newEntry as JournalEntry;
}

export async function getJournalTimeline(
  userId: string,
  profileIds: number[],
  limit: number = 100
): Promise<JournalTimelineItem[]> {
  // Fetch manual journal entries
  const { data: manualData, error: manualError } = await supabase
    .from("journal_entries")
    .select("*, profile:profiles!inner(nickname)")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (manualError) {
    throw new Error(`Failed to fetch journal entries: ${manualError.message}`);
  }

  const manualEntries: JournalEntry[] = (manualData ?? []) as JournalEntry[];

  if (profileIds.length === 0) {
    return manualEntries.map((entry) => ({
      type: "manual" as const,
      sortDate: `${entry.entry_date}T23:59:59`,
      entry,
    }));
  }

  // Fetch completed missions for all family profiles
  const { data: missionData, error: missionError } = await supabase
    .from("user_activity_progress")
    .select(
      `
      id,
      profile_id,
      activity_id,
      completed_at,
      notes,
      debrief_answer_1,
      debrief_answer_2,
      activity:activities!inner(title, debrief_question_1, debrief_question_2),
      profile:profiles!inner(nickname)
    `
    )
    .in("profile_id", profileIds)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (missionError) {
    console.error("Failed to fetch completed missions:", missionError);
    // Non-fatal: return manual entries only
    return manualEntries.map((entry) => ({
      type: "manual" as const,
      sortDate: `${entry.entry_date}T23:59:59`,
      entry,
    }));
  }

  const progressRows = missionData ?? [];
  const progressIds = progressRows.map((r) => r.id);

  // Fetch photos for those progress rows
  let photosByProgressId: Record<number, string[]> = {};
  if (progressIds.length > 0) {
    const { data: photoData } = await supabase
      .from("user_activity_photos")
      .select("user_activity_id, photo_url")
      .in("user_activity_id", progressIds);

    for (const row of photoData ?? []) {
      const pid = row.user_activity_id as number;
      if (!photosByProgressId[pid]) photosByProgressId[pid] = [];
      if (row.photo_url) photosByProgressId[pid].push(row.photo_url as string);
    }
  }

  const missionItems: JournalTimelineItem[] = progressRows.map((row) => {
    const activity = Array.isArray(row.activity)
      ? row.activity[0]
      : row.activity;
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;

    type ActivityJoin = {
      title?: string;
      debrief_question_1?: string | null;
      debrief_question_2?: string | null;
    } | null;
    const activityJoin = activity as ActivityJoin;

    const mission: CompletedMissionEntry = {
      id: row.id,
      profile_id: row.profile_id,
      activity_id: row.activity_id,
      completed_at: row.completed_at as string,
      activity_title: activityJoin?.title ?? "Mission",
      debrief_question_1: activityJoin?.debrief_question_1 ?? null,
      debrief_question_2: activityJoin?.debrief_question_2 ?? null,
      debrief_answer_1: row.debrief_answer_1 ?? null,
      debrief_answer_2: row.debrief_answer_2 ?? null,
      notes: row.notes ?? null,
      photos: photosByProgressId[row.id] ?? [],
      profile: profile
        ? { nickname: (profile as { nickname?: string }).nickname ?? "" }
        : undefined,
    };

    return {
      type: "mission" as const,
      sortDate: row.completed_at as string,
      mission,
    };
  });

  const manualItems: JournalTimelineItem[] = manualEntries.map((entry) => ({
    type: "manual" as const,
    sortDate: `${entry.entry_date}T23:59:59`,
    entry,
  }));

  // Merge and sort by sortDate descending
  const merged = [...manualItems, ...missionItems];
  merged.sort((a, b) => (a.sortDate > b.sortDate ? -1 : 1));

  return merged;
}

export async function deleteJournalEntry(
  entryId: number,
  photoUrl: string | null
): Promise<void> {
  if (photoUrl) {
    // Extract storage path from public URL if needed
    // Public URLs look like: .../storage/v1/object/public/journal-photos/userId/timestamp.jpg
    try {
      const bucket = `/${JOURNAL_PHOTO_BUCKET}/`;
      const idx = photoUrl.indexOf(bucket);
      if (idx !== -1) {
        const storagePath = photoUrl.slice(idx + bucket.length);
        await supabase.storage.from(JOURNAL_PHOTO_BUCKET).remove([storagePath]);
      }
    } catch (err) {
      console.error("Failed to delete journal photo:", err);
      // Non-fatal: proceed with row deletion
    }
  }

  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", entryId);

  if (error) {
    throw new Error(`Failed to delete journal entry: ${error.message}`);
  }
}
