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

/* ------------------------------------------------------------- layout */

/**
 * Islands, not rings.
 *
 * The first draft of this view put everybody on concentric rings ordered by
 * rank: you in the middle, the best match nearest, four hundred people
 * spiralling outward. It was wrong, and the way it was wrong is worth
 * writing down. Rank is a total order, and a total order drawn as a picture
 * is a dartboard — four hundred discs at near-identical size, no two of them
 * distinguishable, and every word of actual information sitting in the
 * legend off to one side. You could not point at it and say anything true.
 *
 * What people actually do in a crowded room is read *groups*: a knot of
 * people by the window, three around the coffee, the loud table. The bands
 * are already groups — "worth crossing the room for", "hiring", "also in
 * ISB" — so the fix is to let the geometry carry what the legend was
 * carrying. One island per band, sized by how many are in it, packed so
 * every island looks equally full, placed around you with the one that
 * matters nearest. Now the picture says it: a tight bright cluster of six
 * beside you, and a quiet grey sea of three hundred and ninety-six.
 */

export type Tier = "lead" | "mid" | "rest";

/** The weight a band is drawn at — one answer, read by every view. */
export function tierOfBand(band: Band, index: number): Tier {
  /**
   * The rest of the room is never the headline, even when it is the only
   * band there is.
   *
   * band3 marks the first surviving band as the lead so a lens always has
   * somewhere to start. With no connections and no shared community, the
   * only band left is everybody — and promoting it drew four hundred and
   * twenty people at headline weight, every one of them ringed in brand
   * colour: a solid red disc that said "all of these matter enormously",
   * which is the exact opposite of what the lens had just worked out.
   */
  if (band.id === "rest" || band.id === "quiet" || band.id === "none") return "rest";
  if (band.lead || index === 0) return "lead";
  return "mid";
}

export type Island = {
  id: string;
  label: string;
  count: number;
  tier: Tier;
  x: number;
  y: number;
  r: number;
};

export type Seat = {
  member: CircleMember;
  x: number;
  y: number;
  size: number;
  band: string;
  tier: Tier;
  /** Rank inside the island — drives the cascade, and who gets a name. */
  order: number;
  island: number;
};

export type Field = { seats: Seat[]; islands: Island[]; cx: number; cy: number };

/** Above this many in the headline island, the names come off. */
export const LABEL_CAP = 8;

/** Screens are wider than they are tall, so the islands spread elliptically. */
const SQUASH = 0.8;

/** The golden angle. Phyllotaxis packs a disc evenly with no seams or spokes. */
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** How big one person is drawn, by the weight of the group they are in. */
function sizeFor(tier: Tier, n: number): number {
  if (tier === "rest") return 9;
  if (tier === "lead") return n <= LABEL_CAP ? 46 : n <= 16 ? 34 : 24;
  return n <= 24 ? 26 : 18;
}

/**
 * How a group of n arranges itself, and how wide that makes it.
 *
 * Two regimes, because one formula cannot serve both ends. Up to ten, a
 * single ring with the spacing worked out from the chord — six faces at 46px
 * need a radius of 58 to clear each other, and phyllotaxis, which assumes
 * dimensionless points, happily stacked the first one almost on top of the
 * second and ran two names into each other. Past ten, the golden angle packs
 * a disc evenly with no seams and no spokes, and the point-approximation is
 * close enough that nothing collides.
 */
function packFor(n: number, size: number): { r: number; at: (k: number) => [number, number] } {
  // Faces big enough to carry a name need room for the name, not the face.
  const gap = size >= 40 ? size * 0.55 : Math.max(5, size * 0.26);
  if (n <= 1) return { r: size * 0.8, at: () => [0, 0] };
  if (n <= 10) {
    const rr = Math.max(size * 0.85, (size + gap) / (2 * Math.sin(Math.PI / n)));
    return {
      r: rr + size / 2 + 4,
      at: (k) => {
        const a = (k / n) * Math.PI * 2 - Math.PI / 2;
        return [Math.cos(a) * rr, Math.sin(a) * rr];
      },
    };
  }
  const rr = Math.sqrt(n) * (size + gap) * 0.56;
  return {
    r: rr,
    at: (k) => {
      const a = k * GOLDEN;
      const rad = rr * Math.sqrt((k + 0.5) / n) * 0.92;
      return [Math.cos(a) * rad, Math.sin(a) * rad];
    },
  };
}

type Disc = { x: number; y: number; r: number };

/**
 * The first spot this island fits, searching outward from its own heading.
 *
 * Islands are laid out in band order, so the headline band asks first and
 * gets the closest seat to you; everything after it fits around what is
 * already placed. Greedy and deterministic — the same crowd lands in the
 * same arrangement every time, which matters, because a room that
 * rearranges itself on every render is a room nobody can learn.
 */
function place(r: number, base: number, taken: Disc[], cx: number, cy: number): Disc {
  /**
   * Angle outside, distance inside — and the order is the whole thing.
   *
   * Scanning distance first looked equivalent and wasn't: the field is
   * squashed vertically, so at any given distance the horizontal candidates
   * clear their neighbours before the vertical ones do, and every island
   * slid sideways into a row along the top. Holding the heading and pushing
   * outward until it fits keeps each island roughly where it was sent.
   */
  const start = r + 72;
  for (let k = 0; k <= 30; k++) {
    for (const sign of k === 0 ? [1] : [1, -1]) {
      const a = base + sign * k * (Math.PI / 20);
      for (let d = start; d < start + 2400; d += 10) {
        const x = cx + Math.cos(a) * d;
        const y = cy + Math.sin(a) * d * SQUASH;
        if (taken.every((o) => Math.hypot(x - o.x, y - o.y) >= r + o.r + 18)) return { x, y, r };
      }
    }
  }
  return { x: cx, y: cy - start, r };
}

export function layoutCrowd(bands: Band[], width: number, height: number): Field {
  const cx = width / 2;
  const cy = height / 2;

  /** Your own disc, so no island is placed on top of you. */
  const taken: Disc[] = [{ x: cx, y: cy, r: 54 }];
  const islands: Island[] = [];
  const seats: Seat[] = [];

  bands.forEach((b, i) => {
    const n = b.members.length;
    if (n === 0) return;
    const tier = tierOfBand(b, i);
    const size = sizeFor(tier, n);
    const pack = packFor(n, size);
    /**
     * Headings spread evenly around you rather than by golden angle.
     *
     * The golden angle is the right answer for hundreds of points and the
     * wrong one for three: it piled all three islands into the top-left and
     * left half the panel empty. Even spacing puts the headline island above
     * you and the rest around, and the greedy distance search still pushes
     * the big quiet ones further out on its own.
     */
    const base = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(bands.length, 3);
    const at = place(pack.r, base, taken, cx, cy);
    taken.push(at);
    islands.push({ id: b.id, label: b.label, count: n, tier, x: at.x, y: at.y, r: pack.r });

    b.members.forEach((member, k) => {
      const [dx, dy] = pack.at(k);
      seats.push({
        member,
        band: b.id,
        tier,
        order: k,
        island: islands.length - 1,
        size,
        x: at.x + dx,
        y: at.y + dy,
      });
    });
  });

  /**
   * Shrink the arrangement until it fits the canvas.
   *
   * Islands grow with the head-count and the panel doesn't. Positions scale
   * linearly; the faces scale by the square root of the same factor, so a
   * crowded room compresses the sea of dots rather than shrinking the six
   * people the view exists to show.
   */
  let maxX = 0;
  let maxY = 0;
  for (const is of islands) {
    maxX = Math.max(maxX, Math.abs(is.x - cx) + is.r);
    maxY = Math.max(maxY, Math.abs(is.y - cy) + is.r + 18);
  }
  /**
   * Capped at 1.3 in both directions. A crowded room has to shrink to fit;
   * a thin one was sitting in a puddle in the middle of a large panel with
   * the frame empty all round it, which reads as a rendering accident
   * rather than as a small room.
   */
  // The dock floats over the bottom of the panel; leave it room.
  const vertical = Math.min(cy - 22, height - cy - 56);
  const k = Math.min(1.3, (width / 2 - 18) / Math.max(maxX, 1), vertical / Math.max(maxY, 1));
  if (k !== 1 && k > 0) {
    const f = Math.sqrt(k);
    for (const s of seats) {
      s.x = cx + (s.x - cx) * k;
      s.y = cy + (s.y - cy) * k;
      s.size = Math.max(5, Math.min(58, s.size * f));
    }
    for (const is of islands) {
      is.x = cx + (is.x - cx) * k;
      is.y = cy + (is.y - cy) * k;
      is.r *= k;
    }
  }

  return { seats, islands, cx, cy };
}
