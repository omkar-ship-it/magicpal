import { CIRCLE_MEMBERS, attendeesOf, cityById, pointOf, rnd, type CircleEvent, type CircleMember } from "./circleData";
import { distanceKm } from "./geo";
import { expandMembership } from "./networks";
import type { CircleMe } from "./circleMe";
import { matchesFor, type Match } from "./matching";

/**
 * "For you" as something you *run*, not something you're handed.
 *
 * The shape borrows from search — visible controls, a live count, a run
 * button, "nothing found, try loosening" — and rejects what makes search
 * the wrong tool here. Search filters on attributes and more results feel
 * better. This scores a *relationship*, every card carries the reason it
 * was chosen, and fewer is better. The moment the output becomes a list
 * without reasons it has collapsed back into the member directory.
 *
 * Three layers, and they never cross:
 *
 *   scope  → who is eligible at all (this event, this community, the open
 *            network). Reach can never widen it.
 *   reach  → how far, *within* that scope. "Worldwide" inside a community
 *            means every member with no distance filter — not everyone on
 *            earth.
 *   criteria → what you want from them today, which is seeded from your
 *            profile but overridable for this run only.
 */

export type Audience =
  | { kind: "event"; event: CircleEvent }
  | { kind: "community"; entityId: string; name: string }
  | { kind: "open" };

export type Reach = "km1" | "km2" | "km5" | "km10" | "city" | "country" | "world" | "roster";

/**
 * How far, as named steps rather than a slider.
 *
 * A slider invites fiddling with no feedback — nobody knows whether 3.4 km
 * is a better answer than 2.8 km, so they drag it about and learn nothing.
 * Naming the distances is what makes the choice decidable, which is the
 * same reasoning the production ladder already encodes.
 *
 * `km: null` marks the steps that aren't distances at all. "My city" is an
 * administrative question, not a radius — 500 km from Hyderabad reaches
 * Chennai and not Delhi — and the user shouldn't have to care that the two
 * are different queries underneath.
 */
export const REACH_STEPS = [
  { id: "km1", km: 1, label: "Within 1 km" },
  { id: "km2", km: 2, label: "Within 2 km" },
  { id: "km5", km: 5, label: "Within 5 km" },
  { id: "km10", km: 10, label: "Within 10 km" },
  { id: "city", km: null, label: "My city" },
  { id: "country", km: null, label: "My country" },
  { id: "world", km: null, label: "Anywhere" },
  { id: "roster", km: null, label: "Everyone attending" },
] as const;

const STEP = new Map(REACH_STEPS.map((s) => [s.id as Reach, s]));

export const REACH_LABEL: Record<Reach, string> = Object.fromEntries(
  REACH_STEPS.map((s) => [s.id, s.label])
) as Record<Reach, string>;

export function kmOf(r: Reach): number | null {
  return STEP.get(r)?.km ?? null;
}

/**
 * A distance step needs a live position at *both* ends.
 *
 * Somebody publishing only their city sits at the centroid, which in a city
 * the size of Bengaluru can be twenty kilometres from where they actually
 * are — so their distance from you is not merely imprecise, it is unknown.
 * They can honestly answer "in my city" and can never answer "within 2 km".
 * The same is true of you: measuring from your own centroid would invent
 * precision you never gave either.
 */
export function isDistanceStep(r: Reach): boolean {
  return kmOf(r) != null;
}

/**
 * Where *you* are, precisely enough to measure from.
 *
 * Members carry a scattered point already; you have none, so one is derived
 * from your name — deterministic, so you don't drift around the map between
 * runs.
 */
export function myPoint(me: CircleMe): { lat: number; lng: number } | null {
  const city = cityById(me.cityId);
  if (!city) return null;
  if (me.mode !== "live") return { lat: city.lat, lng: city.lng };
  const dx = ((rnd(`me-x-${me.name}`) % 1000) / 1000 - 0.5) * 0.09;
  const dy = ((rnd(`me-y-${me.name}`) % 1000) / 1000 - 0.5) * 0.09;
  return { lat: city.lat + dy, lng: city.lng + dx };
}

export function canUseDistance(me: CircleMe): boolean {
  return me.mode === "live";
}

/**
 * The ladder's length depends on the audience, because the value of a
 * match decays with distance at completely different rates.
 *
 * An event is one room — "my country" is meaningless there. A community is
 * bound by identity rather than proximity, so a fellow alum in Singapore is
 * genuinely useful and the ladder runs all the way out. The open network
 * has no bond except stated intent, so proximity is the only thing making a
 * match actionable; past the country it is noise, and it stops there.
 */
export function reachesFor(a: Audience): Reach[] {
  if (a.kind === "event") return ["roster", "km1", "km2", "km5"];
  if (a.kind === "community") return ["km1", "km2", "km5", "km10", "city", "country", "world"];
  return ["km1", "km2", "km5", "km10", "city", "country"];
}

export function defaultReach(a: Audience): Reach {
  if (a.kind === "event") return "roster";
  if (a.kind === "community") return "city";
  // On the open map proximity is the whole point of the match.
  return "km5";
}

export type Criteria = {
  reach: Reach;
  /** Seeded from your profile, changed for this run only. */
  lookingFor: string[];
  canHelpWith: string[];
  /** The highest-converting cohort: the exchange works both ways. */
  twoWayOnly: boolean;
  /** Off means "show me everyone again", including people I've dismissed. */
  skipSeen: boolean;
};

export type Memory = {
  shown: string[];
  connected: string[];
  dismissed: string[];
};

export const EMPTY_MEMORY: Memory = { shown: [], connected: [], dismissed: [] };

export type RunResult = {
  /** What to show now — a deck, not the whole pool. */
  deck: Match[];
  /** How many cleared the criteria, so depth is felt without being dumped. */
  total: number;
  /** How many were eligible before criteria narrowed it. */
  eligible: number;
  /** The query, in words. If it can't be said, it shouldn't be a control. */
  sentence: string;
  /**
   * Why nothing came back, and the nearest loosening — so a dead end turns
   * into the next run instead of a shrug.
   */
  blocked: { line: string; widenTo: Reach | null } | null;
  /**
   * Shown to you before and still not acted on. Not a feature anybody
   * curates: it is simply what the deck left behind, which is exactly the
   * "who did I miss" list after an event.
   */
  followUp: Match[];
};

const DECK_SIZE = 5;

/** Everyone the scope admits, before any distance or criteria filtering. */
export function poolFor(a: Audience, me: CircleMe): CircleMember[] {
  if (a.kind === "event") return attendeesOf(a.event);
  if (a.kind === "community") {
    return CIRCLE_MEMBERS.filter((m) => expandMembership(m.entityIds).has(a.entityId));
  }
  // The open network: everyone who is on the map at all. Somebody with
  // location off has opted out of being found this way.
  void me;
  return CIRCLE_MEMBERS.filter((m) => m.mode !== "off");
}

/** Reach, applied strictly inside the scope — it never widens the pool. */
function withinReach(m: CircleMember, reach: Reach, me: CircleMe): boolean {
  if (reach === "roster" || reach === "world") return true;
  const mine = cityById(me.cityId);
  const theirs = cityById(m.cityId);
  if (!mine || !theirs) return false;

  const km = kmOf(reach);
  if (km != null) {
    if (!canUseDistance(me) || m.mode !== "live") return false;
    const theirPoint = pointOf(m);
    const myPos = myPoint(me);
    if (!theirPoint || !myPos) return false;
    return distanceKm(myPos.lat, myPos.lng, theirPoint[1], theirPoint[0]) <= km;
  }

  if (reach === "city") return theirs.id === mine.id;
  return theirs.country === mine.country;
}

export function runForYou(opts: {
  me: CircleMe;
  audience: Audience;
  criteria: Criteria;
  memory: Memory;
}): RunResult {
  const { me, audience, criteria, memory } = opts;

  const scoped = poolFor(audience, me).filter((m) => m.name !== me.name);
  const eligible = scoped.length;
  const reached = scoped.filter((m) => withinReach(m, criteria.reach, me));

  // Criteria are applied by scoring against an overridden copy of you —
  // the run changes what you're asking for, never how you appear to anyone
  // else. Nobody starts showing up as offering something they only typed
  // into a search box.
  const asked: CircleMe = { ...me, interests: criteria.lookingFor, helpWith: criteria.canHelpWith };

  /**
   * "Skip people I've seen" has to mean *seen*, not just acted on.
   *
   * Otherwise the deck never advances: the same five stay top-ranked, you
   * are shown them again on every visit, and nobody ever lands on the
   * follow-up list because they are always still in the deck. Working
   * through a room means the deck moves and what you passed over is kept.
   */
  const skip = criteria.skipSeen
    ? [...memory.shown, ...memory.connected, ...memory.dismissed]
    : memory.connected;
  let all = matchesFor(asked, reached, { limit: 500, exclude: skip });
  if (criteria.twoWayOnly) all = all.filter((m) => m.kind === "mutual");

  const deck = all.slice(0, DECK_SIZE);

  // Shown before, never acted on. The follow-up list is a by-product of the
  // deck rather than something anybody has to save.
  const acted = new Set([...memory.connected, ...memory.dismissed]);
  const pending = memory.shown.filter((id) => !acted.has(id));
  // Scored separately, because these are deliberately *excluded* from the
  // run above — they are the people the deck has already moved past.
  const deckIds = new Set(deck.map((d) => d.member.id));
  const followUp = matchesFor(asked, scoped.filter((m) => pending.includes(m.id)), { limit: 50 }).filter(
    (m) => !deckIds.has(m.member.id)
  );

  return {
    deck,
    total: all.length,
    eligible,
    sentence: sentenceFor(audience, criteria, me),
    blocked: all.length > 0 ? null : diagnose(audience, criteria, me, scoped),
    followUp,
  };
}

/** The query, said out loud above the results. */
function sentenceFor(a: Audience, c: Criteria, me: CircleMe): string {
  const who =
    a.kind === "event" ? a.event.name : a.kind === "community" ? a.name : "The open network";
  const city = cityById(me.cityId);
  const km = kmOf(c.reach);
  const where =
    c.reach === "roster"
      ? "everyone attending"
      : c.reach === "world"
        ? "anywhere"
        : c.reach === "country"
          ? `in ${city?.country ?? "my country"}`
          : c.reach === "city"
            ? `in ${city?.name ?? "my city"}`
            : `within ${km} km`;
  const want = c.lookingFor.length > 0 ? ` who can help with ${c.lookingFor.slice(0, 2).join(" or ")}` : "";
  const two = c.twoWayOnly ? ", both ways only" : "";
  return `${who} · ${where}${want}${two}`;
}

/**
 * Name what's blocking, and offer the nearest loosening.
 *
 * With six controls people will filter to nothing and blame the product.
 * "Nobody in Bengaluru — 6 elsewhere in India" turns a dead end into the
 * next run, which is the whole loop.
 */
function diagnose(a: Audience, c: Criteria, me: CircleMe, scoped: CircleMember[]): RunResult["blocked"] {
  const ladder = reachesFor(a);
  const at = ladder.indexOf(c.reach);
  const wider = at >= 0 && at < ladder.length - 1 ? ladder[at + 1] : null;

  if (wider) {
    const count = scoped.filter((m) => withinReach(m, wider, me)).length;
    if (count > 0) {
      return {
        line: `Nobody here matches. ${count} more people are ${REACH_LABEL[wider].toLowerCase()}.`,
        widenTo: wider,
      };
    }
  }
  if (c.twoWayOnly) {
    return { line: "No two-way matches at this reach. Try allowing one-way help.", widenTo: null };
  }
  if (c.lookingFor.length > 0) {
    return { line: "Nothing matches what you asked for. Try fewer things, or a wider reach.", widenTo: wider };
  }
  return { line: "Nobody here yet. This gets better as the board fills.", widenTo: wider };
}
