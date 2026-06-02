"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  CAMPFIRE_COMPONENT_TYPES,
  CAMPFIRE_STATUSES,
  LAYER_DB_TYPE_PLACEHOLDER,
  defaultLayerSeedRows,
  type ActivityOption,
  type ApprovedPhotoOption,
  type CampfireComponentRow,
  type CampfireComponentType,
  type CampfireSessionRow,
  type CampfireSessionStatus,
  type CampfireTrackRow,
  type CaptainOption,
  type EditorSnapshot,
} from "./types";
import { sessionDurationFromComponents } from "./lib/campfire-timeline";

export type CampfireFormState = { error?: string };

function revalidateCampfire(sessionId?: number) {
  revalidatePath("/campfire-sessions");
  if (sessionId != null) {
    revalidatePath(`/campfire-sessions/${sessionId}`);
  }
}

async function touchSession(sessionId: number) {
  const supabase = createServerSupabaseClient();
  await supabase
    .from("campfire_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function getCampfireSessions(): Promise<CampfireSessionRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("campfire_sessions")
    .select(
      "id, created_at, updated_at, title, status, scheduled_at, duration, description, thumbnail_url, missions"
    )
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CampfireSessionRow[];
}

export async function getCampfireSession(
  sessionId: number
): Promise<CampfireSessionRow | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("campfire_sessions")
    .select(
      "id, created_at, updated_at, title, status, scheduled_at, duration, description, thumbnail_url, missions"
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as CampfireSessionRow | null;
}

export async function getEditorData(sessionId: number): Promise<{
  session: CampfireSessionRow;
  tracks: CampfireTrackRow[];
  components: CampfireComponentRow[];
  activities: ActivityOption[];
  captains: CaptainOption[];
  approvedPhotos: ApprovedPhotoOption[];
}> {
  const supabase = createServerSupabaseClient();

  const [sessionRes, tracksRes, componentsRes, activitiesRes, captainsRes, photosRes] =
    await Promise.all([
      supabase
        .from("campfire_sessions")
        .select(
          "id, created_at, updated_at, title, status, scheduled_at, duration, description, thumbnail_url, missions"
        )
        .eq("id", sessionId)
        .single(),
      supabase
        .from("campfire_session_tracks")
        .select("id, session_id, name, type, position")
        .eq("session_id", sessionId)
        .order("position", { ascending: true }),
      supabase
        .from("campfire_session_components")
        .select("id, session_id, track_id, type, start_time, duration, data")
        .eq("session_id", sessionId)
        .order("start_time", { ascending: true }),
      supabase
        .from("activities")
        .select("id, name, title, description, image, xp")
        .order("title", { ascending: true }),
      supabase
        .from("captains")
        .select("id, slug, name, avatar_url, pose_options")
        .order("name", { ascending: true }),
      supabase
        .from("user_activity_photos")
        .select(
          `
          photo_id,
          photo_url,
          activity_id,
          activities ( title ),
          profiles ( nickname )
        `
        )
        .eq("status", 1)
        .order("uploaded_at", { ascending: false })
        .limit(200),
    ]);

  if (sessionRes.error) throw new Error(sessionRes.error.message);
  if (tracksRes.error) throw new Error(tracksRes.error.message);
  if (componentsRes.error) throw new Error(componentsRes.error.message);
  if (activitiesRes.error) throw new Error(activitiesRes.error.message);
  if (captainsRes.error) throw new Error(captainsRes.error.message);
  if (photosRes.error) throw new Error(photosRes.error.message);

  const approvedPhotos: ApprovedPhotoOption[] = (photosRes.data ?? []).map(
    (row: Record<string, unknown>) => {
      const activities = row.activities as
        | { title: string | null }
        | { title: string | null }[]
        | null;
      const profiles = row.profiles as
        | { nickname: string | null }
        | { nickname: string | null }[]
        | null;
      const act = Array.isArray(activities) ? activities[0] : activities;
      const prof = Array.isArray(profiles) ? profiles[0] : profiles;
      return {
        photo_id: row.photo_id as number,
        photo_url: row.photo_url as string,
        activity_id: row.activity_id as number | null,
        activity_title: act?.title ?? null,
        nickname: prof?.nickname ?? null,
      };
    }
  );

  return {
    session: sessionRes.data as CampfireSessionRow,
    tracks: (tracksRes.data ?? []) as CampfireTrackRow[],
    components: (componentsRes.data ?? []) as CampfireComponentRow[],
    activities: (activitiesRes.data ?? []) as ActivityOption[],
    captains: (captainsRes.data ?? []) as CaptainOption[],
    approvedPhotos,
  };
}

export async function createCampfireSession(
  _prev: CampfireFormState,
  formData: FormData
): Promise<CampfireFormState> {
  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("campfire_sessions")
    .insert({
      title,
      status: "draft",
      missions: [],
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidateCampfire();
  redirect(`/campfire-sessions/${data.id}`);
}

export async function updateCampfireSession(
  sessionId: number,
  payload: {
    title?: string;
    status?: CampfireSessionStatus;
    scheduled_at?: string | null;
    missions?: number[];
    description?: string | null;
    duration?: number | null;
  }
): Promise<CampfireFormState> {
  if (payload.status && !CAMPFIRE_STATUSES.includes(payload.status)) {
    return { error: "Invalid status" };
  }

  const shouldClearLiveTimes =
    payload.status === "scheduled" ||
    (payload.scheduled_at != null &&
      payload.scheduled_at !== "" &&
      Date.parse(payload.scheduled_at) > Date.now());

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("campfire_sessions")
    .update({
      ...payload,
      ...(shouldClearLiveTimes
        ? { live_started_at: null, live_ended_at: null }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) return { error: error.message };
  revalidateCampfire(sessionId);
  return {};
}

export async function deleteCampfireSession(
  sessionId: number
): Promise<CampfireFormState> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("campfire_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) return { error: error.message };
  revalidateCampfire();
  redirect("/campfire-sessions");
}

export async function ensureDefaultTracks(
  sessionId: number
): Promise<CampfireTrackRow[]> {
  const supabase = createServerSupabaseClient();
  const { data: existing, error: fetchError } = await supabase
    .from("campfire_session_tracks")
    .select("id, session_id, name, type, position")
    .eq("session_id", sessionId)
    .order("position", { ascending: true });

  if (fetchError) throw new Error(fetchError.message);
  if ((existing ?? []).length > 0) {
    return existing as CampfireTrackRow[];
  }

  const rows = defaultLayerSeedRows(sessionId);

  const { data, error } = await supabase
    .from("campfire_session_tracks")
    .insert(rows)
    .select("id, session_id, name, type, position");

  if (error) throw new Error(error.message);
  return (data ?? []) as CampfireTrackRow[];
}

export async function addLayer(
  sessionId: number,
  name?: string
): Promise<{ layer?: CampfireTrackRow; error?: string }> {
  const supabase = createServerSupabaseClient();

  const [positionRes, countRes] = await Promise.all([
    supabase
      .from("campfire_session_tracks")
      .select("position")
      .eq("session_id", sessionId)
      .order("position", { ascending: false })
      .limit(1),
    supabase
      .from("campfire_session_tracks")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId),
  ]);

  const nextPosition =
    positionRes.data && positionRes.data.length > 0
      ? (positionRes.data[0].position as number) + 1
      : 0;

  const layerNum = (countRes.count ?? 0) + 1;
  const defaultName = name?.trim() || `Layer ${layerNum}`;

  const { data, error } = await supabase
    .from("campfire_session_tracks")
    .insert({
      session_id: sessionId,
      name: defaultName,
      type: LAYER_DB_TYPE_PLACEHOLDER,
      position: nextPosition,
    })
    .select("id, session_id, name, type, position")
    .single();

  if (error) return { error: error.message };
  await touchSession(sessionId);
  revalidateCampfire(sessionId);
  return { layer: data as CampfireTrackRow };
}

export async function deleteLayer(
  layerId: number,
  sessionId: number
): Promise<CampfireFormState> {
  const supabase = createServerSupabaseClient();

  const { count, error: countError } = await supabase
    .from("campfire_session_tracks")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (countError) return { error: countError.message };
  if ((count ?? 0) <= 1) {
    return { error: "At least one layer is required" };
  }

  const { error } = await supabase
    .from("campfire_session_tracks")
    .delete()
    .eq("id", layerId);

  if (error) return { error: error.message };
  await touchSession(sessionId);
  await syncSessionDuration(sessionId);
  revalidateCampfire(sessionId);
  return {};
}

export async function createComponent(input: {
  sessionId: number;
  trackId: number;
  type: CampfireComponentType;
  startTime: number;
  duration?: number;
  data?: Record<string, unknown>;
}): Promise<{ component?: CampfireComponentRow; error?: string }> {
  if (!CAMPFIRE_COMPONENT_TYPES.includes(input.type)) {
    return { error: "Invalid component type" };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("campfire_session_components")
    .insert({
      session_id: input.sessionId,
      track_id: input.trackId,
      type: input.type,
      start_time: input.startTime,
      duration: input.duration ?? 5000,
      data: input.data ?? {},
    })
    .select("id, session_id, track_id, type, start_time, duration, data")
    .single();

  if (error) return { error: error.message };
  await touchSession(input.sessionId);
  await syncSessionDuration(input.sessionId);
  revalidateCampfire(input.sessionId);
  return { component: data as CampfireComponentRow };
}

export async function updateComponent(
  componentId: number,
  sessionId: number,
  updates: {
    track_id?: number;
    start_time?: number;
    duration?: number;
    data?: Record<string, unknown>;
  }
): Promise<CampfireFormState> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("campfire_session_components")
    .update(updates)
    .eq("id", componentId);

  if (error) return { error: error.message };
  await touchSession(sessionId);
  await syncSessionDuration(sessionId);
  revalidateCampfire(sessionId);
  return {};
}

export async function deleteComponent(
  componentId: number,
  sessionId: number
): Promise<CampfireFormState> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("campfire_session_components")
    .delete()
    .eq("id", componentId);

  if (error) return { error: error.message };
  await touchSession(sessionId);
  await syncSessionDuration(sessionId);
  revalidateCampfire(sessionId);
  return {};
}

export async function saveEditorSnapshot(
  sessionId: number,
  snapshot: EditorSnapshot
): Promise<CampfireFormState> {
  const supabase = createServerSupabaseClient();

  for (const track of snapshot.tracks) {
    const { error } = await supabase
      .from("campfire_session_tracks")
      .update({ name: track.name, position: track.position })
      .eq("id", track.id);
    if (error) return { error: error.message };
  }

  for (const comp of snapshot.components) {
    const { error } = await supabase
      .from("campfire_session_components")
      .update({
        track_id: comp.track_id,
        start_time: comp.start_time,
        duration: comp.duration,
        data: comp.data,
      })
      .eq("id", comp.id);
    if (error) return { error: error.message };
  }

  await touchSession(sessionId);
  await syncSessionDuration(sessionId);
  revalidateCampfire(sessionId);
  return {};
}

export type PersistEditorDraftInput = {
  session: CampfireSessionRow;
  tracks: CampfireTrackRow[];
  components: CampfireComponentRow[];
};

export async function persistCampfireEditorDraft(
  sessionId: number,
  draft: PersistEditorDraftInput,
  baseline: PersistEditorDraftInput
): Promise<CampfireFormState> {
  const supabase = createServerSupabaseClient();

  const shouldClearLiveTimes =
    draft.session.status === "scheduled" ||
    (draft.session.scheduled_at != null &&
      draft.session.scheduled_at !== "" &&
      Date.parse(draft.session.scheduled_at) > Date.now());

  const { error: sessionError } = await supabase
    .from("campfire_sessions")
    .update({
      title: draft.session.title,
      status: draft.session.status,
      scheduled_at: draft.session.scheduled_at,
      missions: draft.session.missions,
      description: draft.session.description,
      duration: draft.session.duration,
      ...(shouldClearLiveTimes
        ? { live_started_at: null, live_ended_at: null }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (sessionError) return { error: sessionError.message };

  // --- Phase 1: Upsert tracks (inserts & updates before any deletes) ---
  const trackIdMap = new Map<number, number>();

  for (const track of draft.tracks) {
    if (track.id > 0) {
      const { error } = await supabase
        .from("campfire_session_tracks")
        .update({
          name: track.name,
          position: track.position,
          type: track.type,
        })
        .eq("id", track.id);
      if (error) return { error: error.message };
      trackIdMap.set(track.id, track.id);
    } else {
      const { data, error } = await supabase
        .from("campfire_session_tracks")
        .insert({
          session_id: sessionId,
          name: track.name,
          type: track.type,
          position: track.position,
        })
        .select("id")
        .single();
      if (error) return { error: error.message };
      trackIdMap.set(track.id, data.id as number);
    }
  }

  // --- Phase 2: Upsert components ---
  for (const comp of draft.components) {
    const resolvedTrackId = trackIdMap.get(comp.track_id) ?? comp.track_id;
    if (comp.id > 0) {
      const { error } = await supabase
        .from("campfire_session_components")
        .update({
          track_id: resolvedTrackId,
          type: comp.type,
          start_time: comp.start_time,
          duration: comp.duration,
          data: comp.data,
        })
        .eq("id", comp.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("campfire_session_components").insert({
        session_id: sessionId,
        track_id: resolvedTrackId,
        type: comp.type,
        start_time: comp.start_time,
        duration: comp.duration,
        data: comp.data,
      });
      if (error) return { error: error.message };
    }
  }

  // --- Phase 3: Delete removed components (safe -- inserts succeeded above) ---
  const draftComponentIds = new Set(
    draft.components.filter((c) => c.id > 0).map((c) => c.id)
  );
  const removedComponentIds = baseline.components
    .filter((c) => c.id > 0 && !draftComponentIds.has(c.id))
    .map((c) => c.id);

  if (removedComponentIds.length > 0) {
    const { error } = await supabase
      .from("campfire_session_components")
      .delete()
      .in("id", removedComponentIds);
    if (error) return { error: error.message };
  }

  // --- Phase 4: Delete removed tracks ---
  const draftTrackIds = new Set(
    draft.tracks.filter((t) => t.id > 0).map((t) => t.id)
  );
  const removedTrackIds = baseline.tracks
    .filter((t) => t.id > 0 && !draftTrackIds.has(t.id))
    .map((t) => t.id);

  if (removedTrackIds.length > 0) {
    const { error } = await supabase
      .from("campfire_session_tracks")
      .delete()
      .in("id", removedTrackIds);
    if (error) return { error: error.message };
  }

  revalidateCampfire(sessionId);
  return {};
}

async function syncSessionDuration(sessionId: number) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("campfire_session_components")
    .select("start_time, duration")
    .eq("session_id", sessionId);

  const duration = sessionDurationFromComponents(data ?? []);
  await supabase
    .from("campfire_sessions")
    .update({
      duration: duration > 0 ? duration : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}
