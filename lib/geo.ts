/**
 * Great-circle distance in km between two points, for sorting and filtering
 * "who's near me" — accurate enough for a radius filter, no PostGIS needed
 * at this scale.
 */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * A small, fixed-per-user offset applied to a pin before it ever leaves the
 * server — nobody but the profile's own owner sees their exact coordinates.
 *
 * Deterministic rather than re-randomised on every request: a offset that
 * changes on each page load would still leak the true location, just
 * slower — average enough jittered samples and they cancel out around the
 * real point. A fixed offset, by contrast, converges on nothing no matter
 * how many times it's viewed; it just reads as "somewhere in this
 * neighbourhood" forever. The radius filter still runs against the real
 * coordinates server-side — only what's rendered on the map is moved.
 */
const JITTER_RADIUS_METERS = 350;

function seededUnit(seed: string): number {
  // FNV-1a — fast, deterministic, no crypto needed for a non-adversarial
  // "spread pins around a bit" use case.
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296; // -> [0, 1)
}

export function jitterLocation(userId: string, lat: number, lng: number): { lat: number; lng: number } {
  const angle = seededUnit(`${userId}:angle`) * 2 * Math.PI;
  const radius = seededUnit(`${userId}:dist`) * JITTER_RADIUS_METERS;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = 111_320 * Math.cos((lat * Math.PI) / 180);
  return {
    lat: lat + (radius * Math.cos(angle)) / metersPerDegreeLat,
    lng: lng + (radius * Math.sin(angle)) / (metersPerDegreeLng || 1),
  };
}
