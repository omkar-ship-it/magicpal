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
  const seen = new Set(direct.map((m) => m.id));

  /**
   * Grouped by *which* community, not lumped into one "one community away".
   *
   * Eighty-three people under a single heading is a heading that has told
   * you nothing — and drawn, it was one undifferentiated blob. Split by the
   * community you actually share, it becomes "Also in ISB, 40" next to
   * "Also in Weekend Hikers, 12", which is both a better picture and a
   * better opening line.
   */
  const groups = new Map<string, CircleMember[]>();
  for (const m of crowd) {
    if (seen.has(m.id)) continue;
    const shared = [...expandMembership(m.entityIds)].find(
      (id) => mine.has(id) && !isHereForEveryone(id, crowd)
    );
    if (!shared) continue;
    const list = groups.get(shared) ?? [];
    list.push(m);
    groups.set(shared, list);
    seen.add(m.id);
  }
  const byShared = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([id, members]) => ({
      id: `sh-${id}`,
      label: `Also in ${entityById(id)?.name ?? "a community you're in"}`,
      members,
    }));

  if (direct.length === 0 && byShared.length === 0) {
    return [{ id: "none", label: "Nobody here you already know", members: crowd }];
  }

  const out: Band[] = [];
  if (direct.length > 0) out.push({ id: "direct", label: "You know them", members: direct, lead: true });
  out.push(...byShared.slice(0, 4));
  const spill = byShared.slice(4).flatMap((b) => b.members);
  if (spill.length > 0) out.push({ id: "shared-other", label: "Other shared communities", members: spill });
  const rest = crowd.filter((m) => !seen.has(m.id));
  if (rest.length > 0) out.push({ id: "rest", label: "Everyone else here", members: rest });

  if (out.length === 0) return [{ id: "all", label: "Everyone here", members: crowd }];
  if (!out.some((b) => b.lead)) out[0] = { ...out[0], lead: true };
  return out;
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

/* ----------------------------------------------------- directory facets */

/**
 * The crowd as filters on a list, which is where this should have started.
 *
 * Four drawings of one room were built before this: a circle field, a floor
 * plan, an island map, a ranked list. Every one of them was the same idea —
 * render four hundred people and let the reader pick somebody out — and
 * inside one building that idea cannot work, because position carries no
 * information when everybody is at the same point.
 *
 * The directory already existed and already worked. Its only problem was
 * that it filtered by *city*, which is the one axis that means nothing when
 * the whole list is standing in one building: "Bengaluru 380" is not a
 * filter. Swap the axis for what people are offering, what they're after,
 * and who you already know, and the same component answers the density
 * question without a new surface, a new visual language, or a new thing to
 * learn.
 *
 * The facets come out of the lenses rather than being computed fresh, so a
 * chip and the reason printed under a name can never disagree.
 */
export type Facet = {
  id: string;
  group: "all" | "worth" | "known" | "offer" | "need";
  label: string;
  count: number;
  /** Membership, precomputed — the list filters with a set lookup. */
  ids: Set<string>;
};

/** Enough to be useful, few enough to stay one scrolling row. */
const MAX_PER_GROUP = 6;

export function directoryFacets(pool: CircleMember[], me: CircleMe | null): Facet[] {
  const out: Facet[] = [
    { id: "all", group: "all", label: "Everyone", count: pool.length, ids: new Set(pool.map((m) => m.id)) },
  ];

  if (me) {
    const ranked = matchesFor(me, pool, { limit: 24 });
    if (ranked.length > 0) {
      out.push({
        id: "worth",
        group: "worth",
        label: "Worth meeting",
        count: ranked.length,
        ids: new Set(ranked.map((r) => r.member.id)),
      });
    }

    const connected = new Set(me.connectedIds ?? []);
    const mine = new Set(expandMembership(me.entityIds ?? []));
    const known = pool.filter(
      (m) =>
        connected.has(m.id) ||
        [...expandMembership(m.entityIds)].some((id) => mine.has(id) && !isHereForEveryone(id, pool))
    );
    if (known.length > 0) {
      out.push({ id: "known", group: "known", label: "People you know", count: known.length, ids: new Set(known.map((m) => m.id)) });
    }
  }

  /** What the room will answer questions about. */
  const offers = new Map<string, Set<string>>();
  for (const m of pool) {
    for (const h of m.helpWith) {
      const set = offers.get(h) ?? new Set<string>();
      set.add(m.id);
      offers.set(h, set);
    }
  }
  for (const [label, ids] of [...offers.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, MAX_PER_GROUP)) {
    out.push({ id: `offer-${label}`, group: "offer", label, count: ids.size, ids });
  }

  /** And what it's stuck on. */
  const needs = new Map<string, Set<string>>();
  for (const m of pool) {
    if (!m.lookingFor) continue;
    const topic = topicOf(m.lookingFor);
    const set = needs.get(topic) ?? new Set<string>();
    set.add(m.id);
    needs.set(topic, set);
  }
  for (const [label, ids] of [...needs.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, MAX_PER_GROUP)) {
    out.push({ id: `need-${label}`, group: "need", label, count: ids.size, ids });
  }

  return out;
}
