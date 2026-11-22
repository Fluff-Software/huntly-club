/**
 * Passing the parent gate once unlocks grown-up screens for a short while, so a
 * parent moving from the Grown-ups menu to Reminders isn't asked twice.
 */
const UNLOCK_MS = 2 * 60 * 1000;
let unlockedAt = 0;

export function markParentGatePassed(): void {
  unlockedAt = Date.now();
}

export function isParentGateFresh(): boolean {
  return Date.now() - unlockedAt < UNLOCK_MS;
}
