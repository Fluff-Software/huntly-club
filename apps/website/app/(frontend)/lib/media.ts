import type { Media } from "../../../payload-types";

// Block upload fields are fetched with depth:1, so they resolve to full
// Media objects rather than bare IDs - this narrows that union for callers.
export function mediaUrl(media: number | Media): string {
  return typeof media === "object" ? media.url ?? "" : "";
}

export function mediaAlt(media: number | Media, fallback = ""): string {
  return typeof media === "object" ? media.alt || fallback : fallback;
}
