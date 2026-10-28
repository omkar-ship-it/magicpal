import { WORKSPACE_ENTITY_ID, rnd, type CircleMember } from "./circleData";
import { WORKSPACE_MEMBERS } from "./workspaceData";

/**
 * Structure, where a board has declared it.
 *
 * The crowd view (lib/crowd.ts) answers density by *ranking* — you in the
 * middle, everyone else ordered outward. That is the only honest answer
 * when the map knows nothing about the place: a conference hall, a festival,
 * a city at the wrong zoom. It is a picture of an opinion.
 *
 * A building is different, and the difference is the whole of this file. A
 * co-working floor, a campus, a corporate HQ has *real* structure — levels,
 * rooms, a pantry, a lift core — and that structure is shared. Two people
 * looking at L3 are looking at the same L3. Rank is personal and unverifiable;
 * structure is common and checkable, and it is what somebody actually uses to
 * get up and walk over. Where it exists, it wins.
 *
 * Two rules keep this from becoming a lie:
 *
 *  1. Floors are DECLARED BY THE BOARD, not discovered. The owner lays out
 *     their building when they create it. Nothing here is inferred.
 *
 *  2. A person's floor is DECLARED BY THAT PERSON, not sensed. GPS cannot
 *     resolve a storey — altitude accuracy on a phone is tens of metres on a
 *     good day — and a product that guessed would put people on the wrong
 *     floor confidently. So "desk on L3" is a fact somebody typed, and the
 *     only live position the app ever claims is a pin somebody dropped.
 *
 * Which makes the floor a new layer on an existing profile rather than a new
 * profile: the same person, with the extra details that only mean anything
 * inside this one board.
 */

export type ZoneKind =
  | "desks"
  | "meeting"
  | "pantry"
  | "lounge"
  | "booth"
  | "event"
  | "reception"
  | "core";

export type Zone = {
  id: string;
  name: string;
  kind: ZoneKind;
  /** Plan rectangle. The plan is 100 wide × 64 deep, in its own units. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Desks. A zone with none holds nobody at rest — you go there, you don't sit there. */
  seats: number;
  /** The team that holds this block, where one does. Dedicated floors have them; hot desks don't. */
  anchor?: string;
};

export type Floor = {
  id: string;
  /** 0 is the ground floor and the number rises, so the stack draws itself. */
  level: number;
  /** What the building calls it. */
  name: string;
  title: string;
  blurb: string;
  zones: Zone[];
};

/**
 * The lift core, in the same place on every level.
 *
 * Repeated rather than factored out of the drawing because it is the one
 * thing that is genuinely continuous through a building, and drawing it at
 * identical coordinates on each plate is what makes the cutaway read as one
 * structure instead of six unrelated bands.
 */
const core = (floor: string): Zone => ({
  id: `${floor}-core`,
  name: "Lifts",
  kind: "core",
  x: 43,
  y: 24,
  w: 14,
  h: 17,
  seats: 0,
});

/**
 * WeWork Galaxy, Residency Road.
 *
 * Laid out the way a real co-working building is: an open ground floor that
 * anybody can sit in, one floor of hot desks, two of dedicated desks let to
 * named teams, a floor of private offices, and a terrace that exists for
 * events. The anchors matter — on a dedicated floor you are mostly
 * surrounded by the same four companies every day, which is exactly the
 * fact a flat list of 520 names destroys.
 */
const GALAXY: Floor[] = [
  {
    id: "g",
    level: 0,
    name: "G",
    title: "Lobby & café",
    blurb: "Open to everyone in the building. Where most unplanned conversations actually happen.",
    zones: [
      { id: "g-rec", name: "Reception", kind: "reception", x: 3, y: 3, w: 30, h: 18, seats: 0 },
      { id: "g-cafe", name: "Café", kind: "lounge", x: 3, y: 25, w: 34, h: 36, seats: 26 },
      core("g"),
      { id: "g-lounge", name: "Lounge", kind: "lounge", x: 61, y: 3, w: 36, h: 24, seats: 14 },
      { id: "g-booth", name: "Phone booths", kind: "booth", x: 61, y: 31, w: 17, h: 30, seats: 0 },
      { id: "g-rooms", name: "Meeting rooms", kind: "meeting", x: 80, y: 31, w: 17, h: 30, seats: 0 },
    ],
  },
  {
    id: "l1",
    level: 1,
    name: "L1",
    title: "Hot desks",
    blurb: "First come, first served. The floor with the highest turnover and the most strangers.",
    zones: [
      { id: "l1-a", name: "Bay A", kind: "desks", x: 3, y: 3, w: 36, h: 26, seats: 52 },
      { id: "l1-b", name: "Bay B", kind: "desks", x: 3, y: 33, w: 36, h: 28, seats: 52 },
      core("l1"),
      { id: "l1-c", name: "Bay C", kind: "desks", x: 61, y: 3, w: 36, h: 26, seats: 44 },
      { id: "l1-pantry", name: "Pantry", kind: "pantry", x: 61, y: 33, w: 19, h: 28, seats: 0 },
      { id: "l1-rooms", name: "Rooms", kind: "meeting", x: 82, y: 33, w: 15, h: 28, seats: 0 },
    ],
  },
  {
    id: "l2",
    level: 2,
    name: "L2",
    title: "Dedicated desks",
    blurb: "Three teams hold this floor. Walk in and you already know roughly who you'll meet.",
    zones: [
      { id: "l2-a", name: "Saffron Pay", kind: "desks", x: 3, y: 3, w: 38, h: 28, seats: 40, anchor: "Saffron Pay" },
      { id: "l2-b", name: "Kite Labs", kind: "desks", x: 3, y: 35, w: 38, h: 26, seats: 34, anchor: "Kite Labs" },
      core("l2"),
      { id: "l2-c", name: "Northwind", kind: "desks", x: 61, y: 3, w: 36, h: 30, seats: 30, anchor: "Northwind" },
      { id: "l2-pantry", name: "Pantry", kind: "pantry", x: 61, y: 37, w: 18, h: 24, seats: 0 },
      { id: "l2-rooms", name: "Rooms", kind: "meeting", x: 81, y: 37, w: 16, h: 24, seats: 0 },
    ],
  },
  {
    id: "l3",
    level: 3,
    name: "L3",
    title: "Dedicated desks",
    blurb: "The quiet floor. Longer leases, fewer visitors, more people who have been here two years.",
    zones: [
      { id: "l3-a", name: "Tessellate", kind: "desks", x: 3, y: 3, w: 38, h: 28, seats: 36, anchor: "Tessellate" },
      { id: "l3-b", name: "Meridian", kind: "desks", x: 3, y: 35, w: 38, h: 26, seats: 30, anchor: "Meridian" },
      core("l3"),
      { id: "l3-c", name: "Clearline", kind: "desks", x: 61, y: 3, w: 36, h: 30, seats: 28, anchor: "Clearline" },
      { id: "l3-pantry", name: "Pantry", kind: "pantry", x: 61, y: 37, w: 18, h: 24, seats: 0 },
      { id: "l3-rooms", name: "Rooms", kind: "meeting", x: 81, y: 37, w: 16, h: 24, seats: 0 },
    ],
  },
  {
    id: "l4",
    level: 4,
    name: "L4",
    title: "Private offices",
    blurb: "Doors that close. Hardest floor to meet anybody on, which is the problem worth solving here.",
    zones: [
      { id: "l4-a", name: "Lumen Health", kind: "desks", x: 3, y: 3, w: 31, h: 26, seats: 18, anchor: "Lumen Health" },
      { id: "l4-b", name: "Bluecap", kind: "desks", x: 3, y: 31, w: 31, h: 30, seats: 16, anchor: "Bluecap" },
      core("l4"),
      { id: "l4-c", name: "Verdant", kind: "desks", x: 61, y: 3, w: 36, h: 26, seats: 20, anchor: "Verdant" },
      { id: "l4-board", name: "Boardroom", kind: "meeting", x: 61, y: 31, w: 36, h: 30, seats: 0 },
    ],
  },
  {
    id: "t",
    level: 5,
    name: "T",
    title: "Terrace",
    blurb: "Events, demo nights, Friday evenings. Empty most of the day and full twice a week.",
    zones: [
      { id: "t-event", name: "Event space", kind: "event", x: 3, y: 3, w: 38, h: 58, seats: 0 },
      core("t"),
      { id: "t-seat", name: "Terrace seating", kind: "lounge", x: 61, y: 3, w: 36, h: 34, seats: 18 },
      { id: "t-bar", name: "Bar", kind: "pantry", x: 61, y: 41, w: 36, h: 20, seats: 0 },
    ],
  },
];

/**
 * Boards that have declared a building.
 *
 * Keyed rather than flagged on the entity because this is a layout the owner
 * draws, not a boolean they tick — and because the absence of a key is the
 * signal the crowd view needs: no structure declared, fall back to rank.
 */
const PLANS: Record<string, Floor[]> = { [WORKSPACE_ENTITY_ID]: GALAXY };

export function floorsFor(entityId: string | null | undefined): Floor[] | null {
  if (!entityId) return null;
  return PLANS[entityId] ?? null;
}

export type Desk = { floorId: string; zoneId: string };

/**
 * Where everybody sits.
 *
 * Anchored teams go to their own block; everyone else lands in an open zone
 * weighted by how many desks it has, so the hot-desk floor fills and the
 * boardroom doesn't. Anchor blocks are capped at their real desk count and
 * spill to hot desks when a team outgrows its lease, because that is what
 * happens in the building too.
 */
function assign(floors: Floor[], members: CircleMember[]): Map<string, Desk> {
  const anchors = new Map<string, { desk: Desk; seats: number }>();
  const open: Array<{ desk: Desk; seats: number }> = [];
  for (const f of floors) {
    for (const z of f.zones) {
      if (z.seats <= 0) continue;
      const entry = { desk: { floorId: f.id, zoneId: z.id }, seats: z.seats };
      if (z.anchor) anchors.set(z.anchor, entry);
      else open.push(entry);
    }
  }

  const ladder: Array<{ desk: Desk; upto: number }> = [];
  let running = 0;
  for (const o of open) {
    running += o.seats;
    ladder.push({ desk: o.desk, upto: running });
  }

  const taken = new Map<string, number>();
  const out = new Map<string, Desk>();
  for (const m of members) {
    const anchor = anchors.get(m.company);
    if (anchor) {
      const key = anchor.desk.zoneId;
      const n = taken.get(key) ?? 0;
      if (n < anchor.seats) {
        taken.set(key, n + 1);
        out.set(m.id, anchor.desk);
        continue;
      }
    }
    const roll = rnd(`desk-${m.id}`) % Math.max(running, 1);
    const hit = ladder.find((l) => roll < l.upto) ?? ladder[ladder.length - 1];
    out.set(m.id, hit.desk);
  }
  return out;
}

const DESKS: Record<string, Map<string, Desk>> = {
  [WORKSPACE_ENTITY_ID]: assign(GALAXY, WORKSPACE_MEMBERS),
};

export function deskOf(entityId: string, memberId: string): Desk | null {
  return DESKS[entityId]?.get(memberId) ?? null;
}

/* ---------------------------------------------------------------- pins */

/**
 * A pin is the one thing in here that says where somebody is *right now*.
 *
 * Which is why it is an action rather than a reading: you drop it, so the
 * claim is yours. It carries an agenda line because "I'm at the pantry" is
 * not an invitation and "coffee, 15 min, talking Series A metrics" is — the
 * agenda is what makes a stranger able to decide whether to come.
 *
 * And it expires. A location that persists is surveillance; a location that
 * lasts twenty minutes is a meeting.
 */
export type PinReach = "building" | "floor" | "match" | "connections";

export const PIN_REACH: Array<{ id: PinReach; label: string; detail: string }> = [
  { id: "building", label: "Everyone in today", detail: "Anybody with a desk here who tapped in this morning." },
  { id: "floor", label: "This floor", detail: "Only the people whose desks are on this level." },
  { id: "match", label: "People it's relevant to", detail: "Anyone whose ask or offer lines up with the agenda." },
  { id: "connections", label: "People I know here", detail: "Your connections who are in the building today." },
];

export const PIN_MINUTES = [15, 30, 60];

export type FloorPin = {
  id: string;
  floorId: string;
  zoneId: string;
  byId: string | null;
  byName: string;
  agenda: string;
  minutes: number;
  reach: PinReach;
  notified: number;
  joinedIds: string[];
  /** Minutes since it went up. Yours starts at zero and the seeded ones didn't. */
  age: number;
  mine?: boolean;
};

/** Starters, so the reader sees what a live building looks like before touching anything. */
export function seedPins(crowd: CircleMember[]): FloorPin[] {
  if (crowd.length < 12) return [];
  const a = crowd[rnd("pin-a") % crowd.length];
  const b = crowd[rnd("pin-b") % crowd.length];
  return [
    {
      id: "pin-seed-a",
      floorId: "l1",
      zoneId: "l1-pantry",
      byId: a.id,
      byName: a.name,
      agenda: "Coffee + anyone who's shipped a pricing change recently",
      minutes: 30,
      reach: "building",
      notified: 318,
      joinedIds: crowd.slice(3, 7).map((m) => m.id),
      age: 9,
    },
    {
      id: "pin-seed-b",
      floorId: "g",
      zoneId: "g-lounge",
      byId: b.id,
      byName: b.name,
      agenda: "Demo of what we built this sprint — 10 min, come heckle",
      minutes: 60,
      reach: "building",
      notified: 318,
      joinedIds: crowd.slice(11, 14).map((m) => m.id),
      age: 22,
    },
  ];
}

export const AGENDA_IDEAS = [
  "Coffee, 15 min — talking pricing",
  "Lunch, anyone welcome",
  "Stuck on a hiring problem, want a second opinion",
  "Quick demo of what we shipped this week",
];
