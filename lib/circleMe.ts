import type { LocationMode } from "./circleData";

/**
 * You, in the members-only experience. Prototype state: it lives in this
 * browser and nowhere else, so the whole invite → join → on-the-map flow
 * works with no account, no database and no sign-in.
 */
export type CircleMe = {
  name: string;
  /** What you do — the one thing besides your name that makes you findable. */
  headline: string;
  company?: string;
  bio?: string;
  /** The reciprocity pair: what you'll answer, and what you need. */
  helpWith?: string[];
  lookingFor?: string | null;
  /** An uploaded photo, already downscaled to a data URL. Null = use the character. */
  photoUrl?: string | null;
  /** Which generated character set to draw you with when there's no photo. */
  avatarStyle?: string;
  cityId: string;
  mode: LocationMode;
  /** Communities you've joined, in the order you joined them. */
  entityIds: string[];
  /** The event you're currently beaconing at, if any. */
  beaconEventId: string | null;
  /**
   * Open network only. A closed community vouches for everyone in it, so
   * anyone can message anyone. With no membership doing that work, a first
   * message has to be asked for.
   */
  connectedIds?: string[];
  requestedIds?: string[];
  /** What you said you're here for, used to rank strangers. */
  interests?: string[];
  /**
   * Open network only: your own office hours, and the cause the
   * contribution goes to. Absent means you aren't offering time.
   */
  offer?: { causeId: string; note: string; base: number } | null;
  /**
   * Alumni networks only. Scoped to one network by `entityId`, so switching
   * to a community doesn't carry a mentorship across into somewhere it
   * doesn't belong.
   */
  mentorship?: {
    role: "mentee" | "mentor";
    entityId: string;
    goal?: string;
    mentorId?: string;
    requestedIds?: string[];
    startedDaysAgo?: number;
    done?: number[];
    outcome?: string;
    acceptedIds?: string[];
    declinedIds?: string[];
  } | null;
};

/**
 * The two experiences keep separate profiles.
 *
 * They're different products — one you're invited into, one you walk into —
 * and sharing a key would mean joining a class in /circle quietly signed you
 * up to the open network as well, which is precisely the conflation the
 * closed version exists to avoid.
 */
export type Variant = "circle" | "open";

const KEYS: Record<Variant, string> = { circle: "mp_circle_me", open: "mp_open_me" };

export function getMe(variant: Variant = "circle"): CircleMe | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEYS[variant]);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CircleMe;
    return parsed && typeof parsed.name === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function setMe(me: CircleMe, variant: Variant = "circle"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEYS[variant], JSON.stringify(me));
  } catch {
    // Private browsing, quota, blocked storage — the session still works,
    // it just won't survive a reload.
  }
}

export function clearMe(variant: Variant = "circle"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEYS[variant]);
  } catch {
    // Nothing to do — see setMe.
  }
}
