import type { LocationMode } from "./circleData";

/**
 * You, in the members-only experience. Prototype state: it lives in this
 * browser and nowhere else, so the whole invite → join → on-the-map flow
 * works with no account, no database and no sign-in.
 */
export type CircleMe = {
  name: string;
  headline: string;
  cityId: string;
  mode: LocationMode;
  /** Communities you've joined, in the order you joined them. */
  entityIds: string[];
  /** The event you're currently beaconing at, if any. */
  beaconEventId: string | null;
};

const KEY = "mp_circle_me";

export function getMe(): CircleMe | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CircleMe;
    return parsed && typeof parsed.name === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function setMe(me: CircleMe): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(me));
  } catch {
    // Private browsing, quota, blocked storage — the session still works,
    // it just won't survive a reload.
  }
}

export function clearMe(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to do — see setMe.
  }
}
