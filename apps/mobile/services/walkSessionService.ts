export type WalkRoutePoint = { latitude: number; longitude: number };

export type WalkSession = {
  startedAt: string; // ISO
  endedAt: string; // ISO
  steps: number | null;
  distanceMeters: number;
  route: WalkRoutePoint[];
  endedAtCoords: WalkRoutePoint | null;
};

let current: WalkSession | null = null;

export function setCurrentWalkSession(session: WalkSession) {
  current = session;
}

export function getCurrentWalkSession(): WalkSession | null {
  return current;
}

export function clearCurrentWalkSession() {
  current = null;
}

