/**
 * Coarse bounding boxes for countries with activated Explore point coverage.
 * Must stay in sync with the `bounding_box` values in scripts/explore/catalogues/*.json
 * (the build-time source of truth for each region's catalogue).
 */
export const EXPLORE_SUPPORTED_REGIONS = [
  {
    id: "uk-and-ireland",
    boundingBox: { minLat: 49.5, maxLat: 61.1, minLon: -11.2, maxLon: 2.1 },
  },
  {
    id: "philippines",
    boundingBox: { minLat: 4.3, maxLat: 21.6, minLon: 112.1, maxLon: 127.1 },
  },
] as const;

export function isCoordinateInSupportedRegion(latitude: number, longitude: number): boolean {
  return EXPLORE_SUPPORTED_REGIONS.some(
    (region) =>
      latitude >= region.boundingBox.minLat &&
      latitude <= region.boundingBox.maxLat &&
      longitude >= region.boundingBox.minLon &&
      longitude <= region.boundingBox.maxLon
  );
}
