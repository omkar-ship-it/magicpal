import { CIRCLE_MEMBERS, rnd, type CircleMember } from "./circleData";

/**
 * A building, floor by floor.
 *
 * The idea under test: "23 professionals here" is a number, and a number
 * is not a destination. "Floor 6 — nine people, three worth meeting" tells
 * you which lift button to press, which is the only thing you actually
 * wanted to know while standing in a lobby.
 *
 * ---------------------------------------------------------------------
 * THE FEASIBILITY ANSWER, because it shapes everything below: a floor is
 * DECLARED, never detected.
 *
 * GPS cannot do this and never will. Horizontal accuracy indoors is 10-30m
 * on a good day; *vertical* accuracy is worse still — typically two to
 * three times the horizontal error — while a storey is about 3.2m. The
 * altitude figure a phone reports in a building is noise at the scale that
 * matters, and the browser's `coords.altitudeAccuracy` is usually null
 * indoors anyway. (The probe in FloorProbe.tsx reads the real numbers off
 * the device, so this can be checked rather than believed.)
 *
 * What *can* resolve a floor: a barometer (good for relative change, needs
 * calibration for absolute, and — decisively — has no web API at all), WiFi
 * fingerprinting (needs a per-building survey), or BLE beacons (needs
 * hardware on every floor). None are available to a web app, and the last
 * two are not available to a company this size at any price.
 *
 * So the floor is one tap from the person who is standing on it. That is
 * the same reasoning the production app already settled on for "in the
 * room": a deliberate act beats a sensor, because it also carries consent.
 * The declaration expires on its own, like a live location does.
 * ---------------------------------------------------------------------
 */

export type FloorKind = "lobby" | "office" | "coworking" | "cafe" | "event" | "terrace";

export type Floor = {
  level: number;
  /** What a lift panel would say. */
  label: string;
  /** Who has the floor. Null where it's shared or nobody's name is on it. */
  tenant: string | null;
  kind: FloorKind;
  /** Shared floors are the ones worth walking to; a single tenant isn't. */
  open: boolean;
};

export type Building = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  floors: Floor[];
};

/**
 * One plausible tower. Ground at the bottom, which is not a detail — a
 * floor list that counts downward reads as a table and a floor list that
 * stacks upward reads as a building.
 */
export const BUILDING: Building = {
  id: "cyber-gateway",
  name: "Cyber Gateway",
  address: "HITEC City, Hyderabad",
  lat: 17.4486,
  lng: 78.3908,
  floors: [
    { level: 0, label: "G", tenant: "Lobby & reception", kind: "lobby", open: true },
    { level: 1, label: "1", tenant: "Araku Coffee", kind: "cafe", open: true },
    { level: 2, label: "2", tenant: "Verdant Climate", kind: "office", open: false },
    { level: 3, label: "3", tenant: "Hatch — hot desks", kind: "coworking", open: true },
    { level: 4, label: "4", tenant: "Hatch — hot desks", kind: "coworking", open: true },
    { level: 5, label: "5", tenant: "Hatch — private suites", kind: "coworking", open: true },
    { level: 6, label: "6", tenant: "Kolam Labs", kind: "office", open: false },
    { level: 7, label: "7", tenant: "Shared meeting floor", kind: "event", open: true },
    { level: 8, label: "8", tenant: "Stride Health", kind: "office", open: false },
    { level: 9, label: "9", tenant: "Hatch — hot desks", kind: "coworking", open: true },
    { level: 10, label: "10", tenant: "Northwind Capital", kind: "office", open: false },
    { level: 11, label: "R", tenant: "Roof terrace", kind: "terrace", open: true },
  ],
};

export const floorByLevel = (level: number): Floor | undefined =>
  BUILDING.floors.find((f) => f.level === level);

/**
 * How long a declared floor is worth believing.
 *
 * Short on purpose. A floor is a claim about right now — people move, go
 * to lunch, go home — and a stale one is worse than none, because it sends
 * somebody up four storeys to an empty desk. Same reasoning as the live
 * location window in production, and shorter than the check-in window
 * because a floor is a finer claim than "at this event".
 */
export const FLOOR_STALE_MINUTES = 90;

export type Occupant = {
  member: CircleMember;
  level: number;
  /** Minutes since they said so. Drives the fade and the "a while ago". */
  agoMinutes: number;
  /**
   * How the floor was arrived at. Only `self` exists today; the others are
   * drawn so the UI is honest about a mixed future rather than having to
   * be redesigned for one.
   */
  source: "self" | "host";
};

/**
 * Who is in the building right now, deterministically.
 *
 * Weighted so the shape is realistic rather than uniform: the co-working
 * floors carry most of the people, single-tenant offices carry their own
 * staff, and the lobby and café hold a handful of people passing through.
 * A floor-by-floor view is only worth testing against a distribution that
 * is actually lumpy — a flat one makes any design look fine.
 */
const WEIGHT: Record<FloorKind, number> = {
  lobby: 3,
  cafe: 5,
  coworking: 10,
  office: 6,
  event: 4,
  terrace: 2,
};

function buildOccupants(): Occupant[] {
  const pool = CIRCLE_MEMBERS.filter((m) => m.cityId === "hyd");
  // Enough to make floors lumpy, few enough that a floor is still readable.
  const take = Math.min(pool.length, 34);
  const ladder: number[] = BUILDING.floors.flatMap((f) =>
    Array<number>(WEIGHT[f.kind]).fill(f.level)
  );

  return pool.slice(0, take).map((member) => {
    const level = ladder[rnd(`floor-${member.id}`) % ladder.length];
    return {
      member,
      level,
      agoMinutes: rnd(`ago-${member.id}`) % FLOOR_STALE_MINUTES,
      source: rnd(`src-${member.id}`) % 7 === 0 ? ("host" as const) : ("self" as const),
    };
  });
}

export const OCCUPANTS: Occupant[] = buildOccupants();

export function occupantsOn(level: number): Occupant[] {
  return OCCUPANTS.filter((o) => o.level === level).sort((a, b) => a.agoMinutes - b.agoMinutes);
}

/** "just now" / "20 min ago" / "over an hour ago" — a claim with an age on it. */
export function agoLabel(minutes: number): string {
  if (minutes < 5) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return "over an hour ago";
}

/**
 * How far away a floor is, in the units a person in a lobby thinks in.
 *
 * Not metres. "Four floors up" is the whole answer, and it is the number
 * that decides whether somebody bothers.
 */
export function floorDistance(from: number, to: number): string {
  const d = to - from;
  if (d === 0) return "this floor";
  if (d === 1) return "one floor up";
  if (d === -1) return "one floor down";
  return d > 0 ? `${d} floors up` : `${-d} floors down`;
}
