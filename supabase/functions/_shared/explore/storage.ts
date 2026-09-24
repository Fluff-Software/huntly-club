/**
 * Supabase Storage helpers for Explore OSM source tiles.
 * Mobile never accesses this bucket directly — service role only.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  ACTIVE_OSM_REVISION,
  STORAGE_BUCKET,
} from "./config.ts";
import {
  stableStringify,
  validateCanonicalTile,
  type CanonicalTile,
} from "./canonical-tile.ts";
import { tileObjectPath, type TileId } from "./tiles.ts";

export type CachedTileResult =
  | { status: "cached"; tile: CanonicalTile; bytes: number }
  | { status: "missing"; tileId: TileId }
  | { status: "invalid"; tileId: TileId; error: string };

export async function downloadCachedTile(
  service: SupabaseClient,
  tile: TileId,
  revision: string = ACTIVE_OSM_REVISION
): Promise<CachedTileResult> {
  const path = tileObjectPath(revision, tile);
  const { data, error } = await service.storage.from(STORAGE_BUCKET).download(path);
  if (error || !data) {
    return { status: "missing", tileId: tile };
  }
  const text = await data.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { status: "invalid", tileId: tile, error: "tile_json_parse_error" };
  }
  const validated = validateCanonicalTile(parsed);
  if (!validated.ok) {
    return { status: "invalid", tileId: tile, error: validated.error };
  }
  return { status: "cached", tile: validated.tile, bytes: text.length };
}

export async function uploadCanonicalTile(
  service: SupabaseClient,
  tile: CanonicalTile,
  revision: string = ACTIVE_OSM_REVISION
): Promise<{ ok: true; path: string; bytes: number } | { ok: false; error: string }> {
  const validated = validateCanonicalTile(tile);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }
  const path = tileObjectPath(revision, {
    z: tile.tile.z,
    x: tile.tile.x,
    y: tile.tile.y,
  });
  const body = stableStringify(validated.tile);
  const { error } = await service.storage.from(STORAGE_BUCKET).upload(path, body, {
    contentType: "application/json",
    upsert: false,
  });
  if (error) {
    // Concurrent upload of the same tile is acceptable — treat as success if object exists.
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("already exists") || msg.includes("duplicate") || msg.includes("409")) {
      return { ok: true, path, bytes: body.length };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, path, bytes: body.length };
}

export async function probeStorageBucket(
  service: SupabaseClient
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await service.storage.from(STORAGE_BUCKET).list("revisions", {
    limit: 1,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
