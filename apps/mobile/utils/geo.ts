export type GeoPoint = {
  latitude: number;
  longitude: number;
};

/** Haversine distance between two coordinates, in metres. */
export function metersBetween(a: GeoPoint, b: GeoPoint): number {
  const earthRadius = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * (sinDLon * sinDLon);
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
}
