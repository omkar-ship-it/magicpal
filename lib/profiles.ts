import { and, eq, isNotNull, ne } from "drizzle-orm";
import { db, hasDb } from "./db";
import { users } from "./db/schema";
import { distanceKm, jitterLocation } from "./geo";
import { MAX_MAP_RESULTS } from "./rules";

export type MapProfile = {
  id: string;
  name: string;
  headline: string | null;
  company: string | null;
  skills: string[];
  photoUrl: string | null;
  locationLabel: string | null;
  /** Jittered — never the profile owner's exact coordinates. */
  lat: number;
  lng: number;
  distanceKm: number;
};

/**
 * Everyone visible on the map within a radius of a point, nearest first.
 *
 * The dataset is small enough that computing distance in application code
 * rather than in SQL (PostGIS, or a bounding-box index) is the honest
 * trade-off for a first version — this is the thing to replace first if the
 * table ever gets large enough for a full scan to matter.
 *
 * `visibleOnMap` is checked here, in the one function every map view goes
 * through, rather than trusted to be filtered by every caller — the
 * guarantee this makes is "a profile with the toggle off is never in this
 * result set", not "the UI happens to hide it".
 */
export async function getNearbyProfiles(opts: {
  excludeUserId: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}): Promise<MapProfile[]> {
  if (!hasDb || !db) return [];

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      headline: users.headline,
      company: users.company,
      skills: users.skills,
      photoUrl: users.photoUrl,
      locationLabel: users.locationLabel,
      lat: users.lat,
      lng: users.lng,
    })
    .from(users)
    .where(
      and(
        eq(users.visibleOnMap, true),
        isNotNull(users.lat),
        isNotNull(users.lng),
        isNotNull(users.name), // onboarded
        ne(users.id, opts.excludeUserId)
      )
    );

  return rows
    .map((r) => {
      const km = distanceKm(opts.centerLat, opts.centerLng, r.lat!, r.lng!);
      const jittered = jitterLocation(r.id, r.lat!, r.lng!);
      return {
        id: r.id,
        name: r.name!,
        headline: r.headline,
        company: r.company,
        skills: r.skills,
        photoUrl: r.photoUrl,
        locationLabel: r.locationLabel,
        lat: jittered.lat,
        lng: jittered.lng,
        distanceKm: km,
      };
    })
    .filter((p) => p.distanceKm <= opts.radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_MAP_RESULTS);
}

export async function getProfileById(id: string) {
  if (!hasDb || !db) return null;
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}
