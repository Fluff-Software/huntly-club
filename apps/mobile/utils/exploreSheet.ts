/**
 * Wording and numbers for the Explore stop sheet: how far away a stop is, a
 * friendly "hot and cold" line, and how full the "getting closer" bar is.
 */

const METRES_PER_MILE = 1609.344;

/** Distance at which the progress bar starts filling. */
const FAR_METRES = 500;

/** "235 m" -> { value: "235", unit: "m" }; "1.4 miles" for longer trips. */
export function formatDistanceParts(metres: number): { value: string; unit: string } {
  if (metres < METRES_PER_MILE) {
    return { value: String(Math.round(metres)), unit: "m" };
  }
  const miles = metres / METRES_PER_MILE;
  const value = miles >= 10 ? miles.toFixed(0) : miles.toFixed(1);
  return { value, unit: Number(value) === 1 ? "mile" : "miles" };
}

/** Friendly "hot and cold" line for how close the player is. */
export function warmthMessage(metres: number, claimRadiusMetres: number): string {
  if (metres <= claimRadiusMetres) return "You made it!";
  if (metres <= 100) return "So close!";
  if (metres <= 250) return "Getting warmer!";
  return "Head this way!";
}

/** 0 (far away) to 1 (in range): how full the "getting closer" bar is. */
export function closenessProgress(metres: number, claimRadiusMetres: number): number {
  if (metres <= claimRadiusMetres) return 1;
  const span = FAR_METRES - claimRadiusMetres;
  return Math.max(0.06, Math.min(1, 1 - (metres - claimRadiusMetres) / span));
}
