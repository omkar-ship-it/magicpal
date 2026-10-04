import { and, eq, gt, isNotNull, ne } from "drizzle-orm";
import { db, hasDb } from "./db";
import { drops, users } from "./db/schema";
import { distanceKm, jitterLocation } from "./geo";
import { ACTIVE_WINDOW_MINUTES, MAX_MAP_RESULTS } from "./rules";

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
  /** Heartbeat landed within ACTIVE_WINDOW_MINUTES. */
  active: boolean;
  /** A live, time-boxed "come say hi" — null if they have none right now. */
  drop: { label: string; expiresAt: string } | null;
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
  /** Omit for a signed-out caller — there's no "self" to exclude. */
  excludeUserId?: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  /** Skip the radius filter entirely — everyone visible, worldwide, nearest-first. */
  global?: boolean;
}): Promise<MapProfile[]> {
  if (!hasDb || !db) return [];

  const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MINUTES * 60_000);

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
      lastActiveAt: users.lastActiveAt,
      dropLat: drops.lat,
      dropLng: drops.lng,
      dropLabel: drops.label,
      dropExpiresAt: drops.expiresAt,
    })
    .from(users)
    .leftJoin(drops, and(eq(drops.userId, users.id), gt(drops.expiresAt, new Date())))
    .where(
      and(
        eq(users.visibleOnMap, true),
        isNotNull(users.lat),
        isNotNull(users.lng),
        isNotNull(users.name), // onboarded
        opts.excludeUserId ? ne(users.id, opts.excludeUserId) : undefined
      )
    );

  return rows
    .map((r) => {
      // A live drop anchors the pin to where it was dropped, not wherever
      // the person's home location is set to today.
      const pinLat = r.dropLat ?? r.lat!;
      const pinLng = r.dropLng ?? r.lng!;
      const km = distanceKm(opts.centerLat, opts.centerLng, pinLat, pinLng);
      const jittered = jitterLocation(r.id, pinLat, pinLng);
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
        active: Boolean(r.lastActiveAt && r.lastActiveAt > activeSince),
        drop: r.dropExpiresAt ? { label: r.dropLabel!, expiresAt: r.dropExpiresAt.toISOString() } : null,
      };
    })
    .filter((p) => opts.global || p.distanceKm <= opts.radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_MAP_RESULTS);
}

export async function getProfileById(id: string) {
  if (!hasDb || !db) return null;
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}
