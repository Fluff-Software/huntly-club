export type CycleRoutePoint = { latitude: number; longitude: number };

export type CycleSession = {
  startedAt: string; // ISO
  endedAt: string; // ISO
  distanceMeters: number;
  route: CycleRoutePoint[];
  endedAtCoords: CycleRoutePoint | null;
  selectedProfileIds?: number[];
  photoUris?: string[];
};

let current: CycleSession | null = null;
let currentPhotoUris: string[] = [];

export function setCurrentCycleSession(session: CycleSession) {
  current = session;
}

export function updateCurrentCycleSession(patch: Partial<CycleSession>) {
  if (!current) return;
  current = { ...current, ...patch };
}

export function getCurrentCycleSession(): CycleSession | null {
  return current;
}

export function addCyclePhotoUri(uri: string) {
  if (!uri) return;
  if (currentPhotoUris.includes(uri)) return;
  currentPhotoUris = currentPhotoUris.concat(uri);
}

export function getCyclePhotoUris(): string[] {
  return currentPhotoUris;
}

export function clearCycleDraft() {
  currentPhotoUris = [];
}

export function clearCurrentCycleSession() {
  current = null;
  clearCycleDraft();
}

