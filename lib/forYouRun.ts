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

export type Reach = "here" | "city" | "country" | "world" | "roster";

/**
 * How near "near" is, for the tightest rung.
 *
 * A short walk. Wide enough that a venue and the bar next door are one
 * place, tight enough that it still means something you'd cross a room
 * or a street for.
 */
export const NEAR_KM = 2;

/**
 * Where *you* are, precisely enough to measure from.
 *
 * Symmetry matters here: the tightest rung asks whether somebody is two
 * streets away, and that question is unanswerable if your own position is
 * a city centroid. So it needs both ends to be live — the same rule the
 * production pin reach applies to a reader, pointed at yourself.
 *
 * Members get a scattered point from their stored jitter; you have none,
 * so one is derived from your name. Deterministic, so you don't drift
 * around the map between runs.
 */
export function myPoint(me: CircleMe): { lat: number; lng: number } | null {
  const city = cityById(me.cityId);
  if (!city) return null;
  if (me.mode !== "live") return { lat: city.lat, lng: city.lng };
  const dx = ((rnd(`me-x-${me.name}`) % 1000) / 1000 - 0.5) * 0.09;
  const dy = ((rnd(`me-y-${me.name}`) % 1000) / 1000 - 0.5) * 0.09;
  return { lat: city.lat + dy, lng: city.lng + dx };
}

/** The tightest rung needs a precise position at both ends. */
export function canUseNear(me: CircleMe): boolean {
  return me.mode === "live";
}

export const REACH_LABEL: Record<Reach, string> = {
  here: "Near me now",
  city: "In my city",
  country: "In my country",
  world: "Anywhere",
  roster: "Everyone attending",
};

/**
 * The ladder's length depends on the audience, because the value of a
 * match decays with distance at completely different rates.
 *
 * An event is one room — reach above the venue is meaningless. A community
 * is bound by identity rather than proximity, so a fellow alum in Singapore
 * is genuinely useful and "anywhere" is the right default. The open network
 * has no bond except stated intent, so proximity is the only thing making a
 * match actionable; past the country it is noise, and it stops there.
 */
export function reachesFor(a: Audience): Reach[] {
  if (a.kind === "event") return ["roster", "here"];
  if (a.kind === "community") return ["here", "city", "country", "world"];
  return ["here", "city", "country"];
}

export function defaultReach(a: Audience): Reach {
  if (a.kind === "event") return "roster";
  if (a.kind === "community") return "city";
  return "city";
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
  /**
   * The tightest rung is a real distance, and only a live position can
   * satisfy it.
   *
   * Somebody publishing only their city sits at the city centroid, which
   * can be twenty kilometres from where they actually are — letting that
   * count as "near you" would invent precision they never gave. Same rule
   * the pin reach uses: a coarse position can say "in town" and can never
   * say "two streets away".
   *
   * This replaced a version that meant "same city and sharing live", which
   * was indistinguishable from "in my city" for somebody on the far side
   * of Bengaluru.
   */
  if (reach === "here") {
    if (!canUseNear(me) || m.mode !== "live") return false;
    const theirPoint = pointOf(m);
    const myPos = myPoint(me);
    if (!theirPoint || !myPos) return false;
    return distanceKm(myPos.lat, myPos.lng, theirPoint[1], theirPoint[0]) <= NEAR_KM;
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
  const where =
    c.reach === "roster"
      ? "everyone attending"
      : c.reach === "world"
        ? "anywhere"
        : c.reach === "country"
          ? `in ${city?.country ?? "my country"}`
          : c.reach === "city"
            ? `in ${city?.name ?? "my city"}`
            : `within ${NEAR_KM} km`;
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
