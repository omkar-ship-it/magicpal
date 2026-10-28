import type { CircleMember } from "./circleData";
import type { CircleMe } from "./circleMe";
import { matchesFor } from "./matching";
import { entityById, expandMembership } from "./networks";

/**
 * What to do when position stops carrying information.
 *
 * A map works because people are far apart. Put four hundred of them in
 * one building — or four thousand in a city at the wrong zoom — and every
 * pin lands on every other pin: the crowd is visible and nobody in it is.
 * The map has failed at its one job.
 *
 * This is deliberately *not* a workspace feature. Density is a condition
 * the map can hit anywhere — a conference hall, a campus, a festival, the
 * open map over Bengaluru at lunchtime — so the trigger is measured in
 * screen pixels rather than metres, and knows nothing about what kind of
 * board it is looking at.
 */

/** Occlusion starts well below this; this is where a crowd stops being readable. */
export const DENSITY_THRESHOLD = 25;

/** Side of the sampling square, in CSS pixels. About three avatars across. */
const CELL = 110;

export type ScreenPoint = { member: CircleMember; x: number; y: number };

export type Crowd = {
  /** Where the control sits — the middle of the pile, in screen pixels. */
  x: number;
  y: number;
  members: CircleMember[];
};

/**
 * The densest clump on screen, or nothing.
 *
 * Grid-bucketed rather than properly clustered: the question is only "is
 * there a place on this screen where faces are stacking", and a k-means
 * would be a more precise answer to a question nobody asked. Neighbouring
 * cells are folded in so a crowd straddling a cell boundary is one crowd
 * and not two half ones.
 */
export function densestCrowd(points: ScreenPoint[]): Crowd | null {
  if (points.length < DENSITY_THRESHOLD) return null;

  const buckets = new Map<string, ScreenPoint[]>();
  for (const p of points) {
    const key = `${Math.floor(p.x / CELL)},${Math.floor(p.y / CELL)}`;
    const list = buckets.get(key);
    if (list) list.push(p);
    else buckets.set(key, [p]);
  }

  let best: ScreenPoint[] = [];
  let bestKey = "";
  for (const [key, list] of buckets) {
    if (list.length > best.length) {
      best = list;
      bestKey = key;
    }
  }
  if (best.length === 0) return null;

  const [bx, by] = bestKey.split(",").map(Number);
  const near: ScreenPoint[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      near.push(...(buckets.get(`${bx + dx},${by + dy}`) ?? []));
    }
  }
  if (near.length < DENSITY_THRESHOLD) return null;

  return {
    x: near.reduce((s, p) => s + p.x, 0) / near.length,
    y: near.reduce((s, p) => s + p.y, 0) / near.length,
    members: near.map((p) => p.member),
  };
}

/* ------------------------------------------------------------- lenses */

export type Lens = "worth" | "known" | "asked";

export const LENSES: Array<{ id: Lens; label: string; blurb: string }> = [
  { id: "worth", label: "Worth meeting", blurb: "Ranked against what you came in for." },
  { id: "known", label: "People you know", blurb: "Connections first, then anyone you share a community with." },
  { id: "asked", label: "What's being asked", blurb: "The crowd as a set of open questions." },
];

export type Band = {
  id: string;
  label: string;
  members: CircleMember[];
  /** The headline band of a lens — drawn large and nearest the centre. */
  lead?: boolean;
};

/**
 * The same crowd, ordered three ways.
 *
 * Every lens returns *everybody*, always — the last band is the rest of
 * the room, never a cut. Hiding four hundred people to make a tidy answer
 * is how you build something that feels helpful and leaves somebody
 * unfindable, and the whole reason anybody is in the room is that all four
 * hundred are reachable.
 */
export type Lensed = {
  bands: Band[];
  /**
   * Why this person, in a sentence, for the faces where there is one.
   *
   * Carried out of the lens rather than recomputed in the view: the
   * matcher already produced it, and a reason regenerated somewhere else
   * is a reason that can disagree with the ordering it is explaining.
   */
  why: Map<string, string>;
};

export function bandsFor(lens: Lens, me: CircleMe | null, crowd: CircleMember[]): Lensed {
  if (lens === "known") return { bands: knownBands(me, crowd), why: knownWhy(me, crowd) };
  if (lens === "asked") return { bands: askedBands(crowd), why: askedWhy(crowd) };
  return worthBands(me, crowd);
}

function knownWhy(me: CircleMe | null, crowd: CircleMember[]): Map<string, string> {
  const connected = new Set(me?.connectedIds ?? []);
  const mine = new Set(expandMembership(me?.entityIds ?? []));
  const why = new Map<string, string>();
  for (const m of crowd) {
    if (connected.has(m.id)) {
      why.set(m.id, "You're already connected.");
      continue;
    }
    const shared = [...expandMembership(m.entityIds)].find(
      (id) => mine.has(id) && !isHereForEveryone(id, crowd)
    );
    if (shared) why.set(m.id, `Also in ${entityById(shared)?.name ?? "a community you're in"}.`);
  }
  return why;
}

function askedWhy(crowd: CircleMember[]): Map<string, string> {
  const why = new Map<string, string>();
  for (const m of crowd) if (m.lookingFor) why.set(m.id, m.lookingFor);
  return why;
}

function worthBands(me: CircleMe | null, crowd: CircleMember[]): Lensed {
  if (!me) return { bands: [{ id: "all", label: "Everyone here", members: crowd }], why: new Map() };
  const ranked = matchesFor(me, crowd, { limit: 24 });
  const why = new Map(ranked.map((m) => [m.member.id, m.why]));
  const lead = ranked.slice(0, 6).map((m) => m.member);
  const also = ranked.slice(6).map((m) => m.member);
  const taken = new Set([...lead, ...also].map((m) => m.id));
  const bands = band3(
    { id: "lead", label: "Worth crossing the room for", members: lead, lead: true },
    { id: "also", label: "Also a fit", members: also },
    crowd.filter((m) => !taken.has(m.id))
  );
  return { bands, why };
}

function knownBands(me: CircleMe | null, crowd: CircleMember[]): Band[] {
  const connected = new Set(me?.connectedIds ?? []);
  /**
   * A shared community is the warm path when there's no direct connection
   * — and the workspace everybody is standing in doesn't count as one,
   * since it would make every single person "known".
   */
  const mine = new Set(expandMembership(me?.entityIds ?? []));
  const direct = crowd.filter((m) => connected.has(m.id));
  const shared = crowd.filter(
    (m) =>
      !connected.has(m.id) &&
      [...expandMembership(m.entityIds)].some((id) => mine.has(id) && !isHereForEveryone(id, crowd))
  );
  const taken = new Set([...direct, ...shared].map((m) => m.id));
  return band3(
    { id: "direct", label: "You know them", members: direct, lead: true },
    { id: "shared", label: "One community away", members: shared },
    crowd.filter((m) => !taken.has(m.id))
  );
}

/** True when an entity is simply "the room" — shared by nearly everybody here. */
function isHereForEveryone(entityId: string, crowd: CircleMember[]): boolean {
  let n = 0;
  for (const m of crowd) if (m.entityIds.includes(entityId)) n++;
  return n > crowd.length * 0.6;
}

function askedBands(crowd: CircleMember[]): Band[] {
  const byTopic = new Map<string, CircleMember[]>();
  const quiet: CircleMember[] = [];
  for (const m of crowd) {
    if (!m.lookingFor) {
      quiet.push(m);
      continue;
    }
    const topic = topicOf(m.lookingFor);
    const list = byTopic.get(topic);
    if (list) list.push(m);
    else byTopic.set(topic, [m]);
  }
  const topics = [...byTopic.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5)
    .map(([topic, members], i) => ({ id: `t-${topic}`, label: topic, members, lead: i === 0 }));

  const taken = new Set(topics.flatMap((t) => t.members.map((m) => m.id)));
  const rest = crowd.filter((m) => !taken.has(m.id) && !quiet.includes(m));
  return [
    ...topics,
    ...(rest.length > 0 ? [{ id: "other", label: "Other asks", members: rest }] : []),
    ...(quiet.length > 0 ? [{ id: "quiet", label: "Not asking for anything today", members: quiet }] : []),
  ];
}

/**
 * The ask, reduced to something a group can be named after.
 *
 * Crude on purpose: these are free-text lines, and the alternative is a
 * model call to cluster them, which costs money and latency to produce a
 * label nobody can check. Matching the first keyword that appears is wrong
 * sometimes and explainable always.
 */
const TOPIC_WORDS: Array<[string, RegExp]> = [
  ["Hiring", /hir|recruit|engineer|designer|candidate|talent/i],
  ["Fundraising", /rais|seed|series|investor|angel|round|cheque/i],
  ["Customers", /customer|sales|pilot|gtm|go-to-market|lead/i],
  ["Product", /product|design|user|research|roadmap/i],
  ["Engineering", /tech|build|infra|platform|stack|migrat|scal/i],
  ["Advice", /advice|mentor|intro|feedback|help|learn/i],
];

function topicOf(line: string): string {
  for (const [label, re] of TOPIC_WORDS) if (re.test(line)) return label;
  return "Something else";
}

/** Three bands, empty ones dropped, the rest always last. */
function band3(lead: Band, mid: Band, rest: CircleMember[]): Band[] {
  const out: Band[] = [];
  if (lead.members.length > 0) out.push(lead);
  if (mid.members.length > 0) out.push(mid);
  if (rest.length > 0) out.push({ id: "rest", label: "Everyone else here", members: rest });
  if (out.length === 0) return [{ id: "all", label: "Everyone here", members: rest }];
  /**
   * Whatever survives first is the headline.
   *
   * With no direct connections the "you know them" band drops out, and
   * marking lead on a band that no longer exists left the whole view
   * undifferentiated — every face the same size, nothing ringed, no answer
   * to "where do I start". There is always a first band; it is always the
   * headline.
   */
  if (!out.some((b) => b.lead)) out[0] = { ...out[0], lead: true };
  return out;
}

/* ------------------------------------------------------------- layout */

export type Seat = { member: CircleMember; x: number; y: number; size: number; band: string };

/**
 * Everybody on concentric rings, the people who matter nearest the middle.
 *
 * The same reading as the map — *near means matters* — so nobody has to
 * learn a second visual language. The only thing that changed is what
 * distance measures, which is why the ground underneath must stop looking
 * like a street map or the view is lying about where people are.
 *
 * Ring capacity grows with circumference, so four hundred people fill
 * outward instead of overlapping: the crowd stays a crowd, and stays
 * entirely on screen.
 */
export function seatCrowd(bands: Band[], width: number, height: number): Seat[] {
  const cx = width / 2;
  // Nudged down, because the controls sit at top-centre and the innermost
  // rings were reaching up behind them.
  const cy = height / 2 + 26;
  const ordered = bands.flatMap((b) =>
    b.members.map((member) => ({ member, band: b.id, lead: Boolean(b.lead) }))
  );

  const seats: Seat[] = [];
  let index = 0;
  let ring = 0;
  const inner = Math.max(96, Math.min(width, height) * 0.14);

  while (index < ordered.length) {
    // The first gap is wider than the rest: the headline band is the only
    // one that carries names, and they need somewhere to sit that isn't on
    // top of the ring behind it.
    const radius = inner + (ring === 0 ? 0 : 22 + ring * 52);
    const size = ring === 0 ? 46 : ring === 1 ? 36 : ring < 4 ? 28 : 22;
    const capacity = Math.max(1, Math.floor((2 * Math.PI * radius) / (size + 12)));
    const take = Math.min(capacity, ordered.length - index);
    // Each ring starts a little further round than the last, so the rings
    // don't line up into visible spokes.
    const offset = ring * 0.6;
    for (let i = 0; i < take; i++) {
      const a = offset + (i / take) * Math.PI * 2;
      const entry = ordered[index + i];
      seats.push({
        member: entry.member,
        x: cx + Math.cos(a) * radius,
        y: cy + Math.sin(a) * radius * 0.78, // squashed: screens are wider than tall
        size: entry.lead ? Math.max(size, 44) : size,
        band: entry.band,
      });
    }
    index += take;
    ring++;
  }
  return seats;
}
