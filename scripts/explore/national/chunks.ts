/**
 * Deterministic national catalogue chunk grid (Step 10.4).
 * Chunk IDs are stable for a given scheme + span — never city names or worker ids.
 */
export type LonLatBBox = {
  minLatitude: number;
  minLongitude: number;
  maxLatitude: number;
  maxLongitude: number;
};

export type CatalogueChunk = {
  /** Stable id: `c_{iy}_{ix}` for the chosen span. */
  chunkId: string;
  core: LonLatBBox;
  /** Core expanded by padMetres for OSM context. */
  padded: LonLatBBox;
  row: number;
  col: number;
};

export function expandBboxMetres(bbox: LonLatBBox, metres: number): LonLatBBox {
  const midLat = (bbox.minLatitude + bbox.maxLatitude) / 2;
  const dLat = metres / 111_320;
  const dLon = metres / (111_320 * Math.cos((midLat * Math.PI) / 180));
  return {
    minLatitude: bbox.minLatitude - dLat,
    maxLatitude: bbox.maxLatitude + dLat,
    minLongitude: bbox.minLongitude - dLon,
    maxLongitude: bbox.maxLongitude + dLon,
  };
}

export function splitBboxIntoChunkGrid(
  bbox: LonLatBBox,
  spanDegrees: number,
  padMetres: number
): CatalogueChunk[] {
  if (!(spanDegrees > 0)) throw new Error("spanDegrees must be > 0");
  const latSteps = Math.max(1, Math.ceil((bbox.maxLatitude - bbox.minLatitude) / spanDegrees));
  const lonSteps = Math.max(1, Math.ceil((bbox.maxLongitude - bbox.minLongitude) / spanDegrees));
  const dLat = (bbox.maxLatitude - bbox.minLatitude) / latSteps;
  const dLon = (bbox.maxLongitude - bbox.minLongitude) / lonSteps;
  const chunks: CatalogueChunk[] = [];
  for (let row = 0; row < latSteps; row++) {
    for (let col = 0; col < lonSteps; col++) {
      const core: LonLatBBox = {
        minLatitude: bbox.minLatitude + row * dLat,
        maxLatitude: row === latSteps - 1 ? bbox.maxLatitude : bbox.minLatitude + (row + 1) * dLat,
        minLongitude: bbox.minLongitude + col * dLon,
        maxLongitude: col === lonSteps - 1 ? bbox.maxLongitude : bbox.minLongitude + (col + 1) * dLon,
      };
      chunks.push({
        chunkId: `c_${row}_${col}`,
        core,
        padded: expandBboxMetres(core, padMetres),
        row,
        col,
      });
    }
  }
  return chunks;
}

/** Estimate chunk count for planning (no allocation). */
export function estimateChunkCount(bbox: LonLatBBox, spanDegrees: number): number {
  const latSteps = Math.max(1, Math.ceil((bbox.maxLatitude - bbox.minLatitude) / spanDegrees));
  const lonSteps = Math.max(1, Math.ceil((bbox.maxLongitude - bbox.minLongitude) / spanDegrees));
  return latSteps * lonSteps;
}
