import AsyncStorage from "@react-native-async-storage/async-storage";

export type ActiveHuntSession = {
  questId: string;
  profileId: number;
  questName: string;
  startedAt: string;
  status: "active";
};

const ACTIVE_HUNT_SESSION_KEY = "huntly.activeHuntSession.v1";

let cachedSession: ActiveHuntSession | null | undefined;
const listeners = new Set<(session: ActiveHuntSession | null) => void>();

function notify(session: ActiveHuntSession | null) {
  listeners.forEach((listener) => listener(session));
}

export function subscribeActiveHuntSession(
  listener: (session: ActiveHuntSession | null) => void
) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function getActiveHuntSession(): Promise<ActiveHuntSession | null> {
  if (cachedSession !== undefined) return cachedSession;
  const raw = await AsyncStorage.getItem(ACTIVE_HUNT_SESSION_KEY);
  cachedSession = raw ? (JSON.parse(raw) as ActiveHuntSession) : null;
  return cachedSession;
}

export async function startActiveHuntSession(input: {
  questId: string;
  profileId: number;
  questName: string;
}): Promise<ActiveHuntSession> {
  const { getActiveTrackingSession } = await import("@/services/trackingSessionService");
  const tracking = await getActiveTrackingSession();
  if (tracking?.status === "active") {
    throw new Error(
      tracking.type === "cycle"
        ? "Finish your cycle before starting a hunt."
        : "Finish your walk before starting a hunt."
    );
  }

  // Same as walk/cycle: one active hunt at a time — return existing, don't replace.
  const existing = await getActiveHuntSession();
  if (existing?.status === "active") return existing;

  const session: ActiveHuntSession = {
    questId: input.questId,
    profileId: input.profileId,
    questName: input.questName,
    startedAt: new Date().toISOString(),
    status: "active",
  };
  cachedSession = session;
  await AsyncStorage.setItem(ACTIVE_HUNT_SESSION_KEY, JSON.stringify(session));
  notify(session);
  return session;
}

export async function clearActiveHuntSession(): Promise<void> {
  cachedSession = null;
  await AsyncStorage.removeItem(ACTIVE_HUNT_SESSION_KEY);
  notify(null);
}
