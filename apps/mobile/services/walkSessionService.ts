export type WalkRoutePoint = { latitude: number; longitude: number };

export type WalkSession = {
  startedAt: string; // ISO
  endedAt: string; // ISO
  steps: number | null;
  distanceMeters: number;
  route: WalkRoutePoint[];
  endedAtCoords: WalkRoutePoint | null;
  selectedProfileIds?: number[];
  photoUris?: string[];
};

let current: WalkSession | null = null;
let currentPhotoUris: string[] = [];

export function setCurrentWalkSession(session: WalkSession) {
  current = session;
}

export function updateCurrentWalkSession(patch: Partial<WalkSession>) {
  if (!current) return;
  current = { ...current, ...patch };
}

export function getCurrentWalkSession(): WalkSession | null {
  return current;
}

export function addWalkPhotoUri(uri: string) {
  if (!uri) return;
  if (currentPhotoUris.includes(uri)) return;
  currentPhotoUris = currentPhotoUris.concat(uri);
}

export function getWalkPhotoUris(): string[] {
  return currentPhotoUris;
}

export function clearWalkDraft() {
  currentPhotoUris = [];
}

export function clearCurrentWalkSession() {
  current = null;
  clearWalkDraft();
}

