import { OPEN_INTERESTS, membersOf, memberById, rnd, type CircleMember } from "./circleData";
import type { CircleMe } from "./circleMe";
import { matchesFor, type Match } from "./matching";

/**
 * A co-working space, and the admission that a map was the wrong primitive.
 *
 * ── The mistake, written down so it isn't made again ──────────────────
 *
 * Three views of one room were built before this one: a circle field, a
 * floor plan, a list. All three were rejected, and all three deserved to
 * be, because they were the same idea drawn three ways — *render the
 * crowd and let the reader find someone in it*.
 *
 * Inside one building, position carries no information: everybody is at
 * the same point. So every view derived from position was derived from
 * nothing, and the work the reader was being handed — scan four hundred
 * strangers, decide who matters — is work nobody wants and nobody is good
 * at. A prettier drawing of that work is still that work.
 *
 * ── What actually solves it ───────────────────────────────────────────
 *
 * Every product that has solved density has solved it the same way, and
 * none of them solved it by drawing: dating apps show one person at a
 * time; conference matchmakers (Brella, Grip) run on declared intent and
 * hand out a short ranked list with booked slots; Lunchclub posts one
 * intro a week; Donut pairs two people and puts a time on it. The pattern
 * is the same every time — **never show the crowd. Show three people, say
 * why, and put a time and a place on it.**
 *
 * Which exposes two different jobs that had been conflated into one
 * surface, and that conflation is the whole bug:
 *
 *   SEARCH    — "I need a backend engineer." The reader knows what they
 *               want. A directory with filters is the right answer, it is
 *               not hard, and it has always worked. Keep it, in full,
 *               everyone present.
 *
 *   DISCOVERY — "I don't know who I should meet." The reader cannot
 *               specify the query, so handing them a browse surface asks
 *               them to answer the question they came to ask. This needs
 *               to be scarce, ranked, explained, and to end in a booked
 *               moment rather than an open message box.
 *
 * lib/matching.ts already had this right in its header — "three a week,
 * not fifty" — and was never made the front door anywhere. This file
 * makes it the front door.
 */

export const SPACE = {
  id: "sp-2gethr",
  name: "2gethr",
  place: "Bengaluru",
  /** Shown as the operator's own framing, not ours. */
  tagline: "A members' club for people who work for themselves, and for each other.",
  seats: 380,
};

/** Where a conversation can actually happen. Used by the matcher, not drawn. */
export const SPOTS = [
  "the café, ground floor",
  "the terrace",
  "the library nook, L2",
  "meeting room 3, L1",
];

const SLOTS = ["today, 3:30pm", "today, 5pm", "tomorrow, 11am", "tomorrow, 4pm"];

/* ───────────────────────────────────────────────────────────── the roster */

/**
 * Members, drawn from the Bengaluru roster.
 *
 * A co-working space is a local population — one whose members are
 * scattered across the world is an alumni network with a different label.
 */
export const ROSTER: CircleMember[] = membersOf(SPACE.id);

/** In today. The denominator for everything that happens in the building. */
export const IN_TODAY: CircleMember[] = ROSTER.filter((m) => rnd(`2g-in-${m.id}`) % 100 < 74);

/* ──────────────────────────────────────────────────────────────── you */

/**
 * The whole profile, and it is three questions long.
 *
 * Everything past this is optional. The pair that matters — what you need,
 * what you'll answer — is the only input the matcher has and the only
 * reason a first message isn't a favour being asked. A ten-field profile
 * form at a front desk gets abandoned; three questions gets filled in
 * while someone is waiting for their coffee.
 */
export type SpaceMe = {
  name: string;
  role: string;
  company: string;
  /** One line, in your words. The thing that gets read. */
  ask: string;
  /** The same line, as topics the matcher can see. */
  wants: string[];
  helpWith: string[];
  /** Prototype clock: how many days in you are. Advanced by hand in the demo. */
  day: number;
};

export type IntroState = "offered" | "passed" | "waiting" | "matched" | "booked" | "met";

export type Intro = {
  memberId: string;
  day: number;
  state: IntroState;
  /** Set once both sides have said yes. */
  slot?: { when: string; where: string };
  outcome?: string;
};

export type SpaceState = {
  me: SpaceMe | null;
  intros: Intro[];
  /** Open tables you've put your hand up for. */
  joinedTables: string[];
  myTable: Table | null;
};

const KEY = "mp_2gethr";

export const EMPTY: SpaceState = { me: null, intros: [], joinedTables: [], myTable: null };

export function load(): SpaceState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as SpaceState;
    return parsed && typeof parsed === "object" ? { ...EMPTY, ...parsed } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function save(s: SpaceState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private browsing. The session still works; it just won't survive a reload.
  }
}

/** The matcher speaks CircleMe, so this is the one adaptor between them. */
export function asCircleMe(me: SpaceMe): CircleMe {
  return {
    name: me.name,
    headline: me.role,
    company: me.company,
    cityId: "blr",
    mode: "base",
    entityIds: [SPACE.id],
    beaconEventId: null,
    interests: me.wants,
    helpWith: me.helpWith,
    lookingFor: me.ask,
    connectedIds: [],
  };
}

/* ─────────────────────────────────────────────────────────── today's three */

/**
 * Three. Not thirty, and not four hundred.
 *
 * Scarcity is the mechanic, not a limitation of the matcher — it could
 * return two hundred ranked people and that is exactly what would make it
 * useless. A list long enough to browse is a list long enough to postpone;
 * three faces with reasons attached is a decision somebody makes before
 * their coffee arrives. The same reason a dating app deals one card at a
 * time and a jobs board nobody opens deals ten thousand.
 *
 * They rotate daily and never repeat, so the room stays inexhaustible
 * without ever being dumped on anyone at once.
 */
export const DAILY = 3;

export function todaysThree(state: SpaceState): Match[] {
  if (!state.me) return [];
  /**
   * Only *earlier* days are excluded, never today's own decisions.
   *
   * Excluding everything decided meant the moment you said yes to one of
   * the three, a fourth slid in to take its place — an infinite feed
   * wearing a counter that always read "3 of 3 left". That is the exact
   * mechanic this is built to avoid: three is the day's allocation, and a
   * decision has to *spend* it or scarcity is a label rather than a rule.
   */
  const earlier = state.intros.filter((i) => i.day < state.me!.day).map((i) => i.memberId);
  return matchesFor(asCircleMe(state.me), IN_TODAY, {
    limit: DAILY,
    week: state.me.day,
    exclude: earlier,
  });
}

/**
 * Whether they said yes too.
 *
 * Deterministic rather than random so a demo is repeatable, and generous
 * rather than realistic-at-the-low-end because the thing being tested is
 * what happens *after* a mutual yes — which is the part every networking
 * product gets wrong and the part worth showing an operator.
 */
export function theySayYes(memberId: string): boolean {
  return rnd(`2g-yes-${memberId}`) % 100 < 74;
}

export function proposeSlot(memberId: string): { when: string; where: string } {
  return {
    when: SLOTS[rnd(`2g-when-${memberId}`) % SLOTS.length],
    where: SPOTS[rnd(`2g-where-${memberId}`) % SPOTS.length],
  };
}

/* ──────────────────────────────────────────────────────────── open tables */

/**
 * Somebody is at the café and has said what for.
 *
 * The matched intro is the engine; this is the pressure valve. Not every
 * useful conversation can wait for tomorrow's three, and "I'm at the
 * café" is not an invitation — an agenda is. It costs the host nothing,
 * it is the only part of the product anybody can start, and it is where
 * the serendipity a co-working space actually sells comes from.
 */
export type Table = {
  id: string;
  hostId: string | null;
  hostName: string;
  place: string;
  agenda: string;
  startsIn: number;
  minutes: number;
  joinedIds: string[];
};

export const TABLE_IDEAS = [
  "Coffee — anyone building in fintech",
  "Lunch, open table",
  "Stuck on a pricing model, want to argue about it",
  "Demo of what we shipped this week, 10 min",
];

export function seededTables(): Table[] {
  const pick = (k: string) => IN_TODAY[rnd(k) % Math.max(IN_TODAY.length, 1)];
  const a = pick("2g-t-a");
  const b = pick("2g-t-b");
  if (!a || !b) return [];
  return [
    {
      id: "t-a",
      hostId: a.id,
      hostName: a.name,
      place: "the café, ground floor",
      agenda: "Coffee — anyone who's taken a B2B product into the US",
      startsIn: 20,
      minutes: 30,
      joinedIds: IN_TODAY.slice(4, 7).map((m) => m.id),
    },
    {
      id: "t-b",
      hostId: b.id,
      hostName: b.name,
      place: "the terrace",
      agenda: "Lunch, open table — no agenda, just don't want to eat alone",
      startsIn: 95,
      minutes: 45,
      joinedIds: IN_TODAY.slice(12, 18).map((m) => m.id),
    },
  ];
}

/* ───────────────────────────────────────────────────────────── the asks */

/**
 * The room's open questions, which is the surface for people who want to
 * give rather than get.
 *
 * Worth building deliberately: in every network the scarce side is the
 * givers, and most products make giving the hard direction — you have to
 * go looking for someone to help. One screen of live asks with a single
 * "I can help with this" turns the scarce side into the easy side.
 */
export type Ask = { member: CircleMember; ask: string; topic: string; daysLeft: number };

const TOPICS: Array<[string, RegExp]> = [
  ["Hiring", /hir|recruit|engineer|designer|candidate|co-founder/i],
  ["Fundraising", /rais|seed|series|investor|angel|term sheet|cheque/i],
  ["Customers", /customer|sales|pilot|gtm|logo|design partner|beta/i],
  ["Going abroad", /us |india|borders|enterin|abroad|market/i],
  ["Advice", /advice|mentor|intro|second opinion|someone who/i],
];

export function topicOf(line: string): string {
  for (const [label, re] of TOPICS) if (re.test(line)) return label;
  return "Something else";
}

export function asksThisWeek(limit = 40): Ask[] {
  return IN_TODAY.filter((m) => m.lookingFor)
    .slice(0, limit)
    .map((m) => ({
      member: m,
      ask: m.lookingFor as string,
      topic: topicOf(m.lookingFor as string),
      daysLeft: 1 + (rnd(`2g-exp-${m.id}`) % 13),
    }));
}

/* ─────────────────────────────────────────────────────── proof, for the wall */

/**
 * The numbers the operator puts on their own landing page.
 *
 * This is the commercial centre of the whole thing. A co-working space
 * does not buy networking software; it sells desks, and desks are a
 * commodity — every competitor has chairs, wifi and coffee. The one asset
 * that cannot be copied is the particular people already in the building,
 * and nothing in their current stack turns that into something a prospect
 * can see on a tour. So the product has to *emit a number they can
 * publish*, or it is a nice feature nobody renews.
 *
 * Seeded from a plausible eleven weeks of operation, with whatever the
 * reader does in this session added on top.
 */
export type Proof = {
  intros: number;
  met: number;
  membersWhoMet: number;
  members: number;
  topAsks: Array<{ topic: string; n: number }>;
  stories: Array<{ name: string; company: string; line: string }>;
};

export function proof(extraIntros = 0, extraMet = 0): Proof {
  const asks = asksThisWeek(120);
  const counts = new Map<string, number>();
  for (const a of asks) counts.set(a.topic, (counts.get(a.topic) ?? 0) + 1);
  const named = (k: string) => ROSTER[rnd(k) % Math.max(ROSTER.length, 1)];
  const s1 = named("2g-s1");
  const s2 = named("2g-s2");
  const s3 = named("2g-s3");
  return {
    intros: 1186 + extraIntros,
    met: 814 + extraMet,
    membersWhoMet: 301,
    members: ROSTER.length,
    topAsks: [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, n]) => ({ topic, n })),
    stories: [
      { name: s1?.name ?? "Priya", company: s1?.company ?? "Clearwing", line: "Hired my first backend engineer from two floors up." },
      { name: s2?.name ?? "Rohan", company: s2?.company ?? "Tessel", line: "Found a design partner in week two. We ship together now." },
      { name: s3?.name ?? "Ananya", company: s3?.company ?? "Mirrorlake", line: "Someone here had already solved the exact pricing problem." },
    ],
  };
}

/* ──────────────────────────────────────────────────────── the manager's view */

/**
 * What the community manager needs, and why they are the champion.
 *
 * They already make introductions by hand — it is most of the job, it does
 * not scale past the thirty people they happen to know, and nobody has
 * ever given them a list. These three numbers are that list, and they are
 * the reason this gets rolled out rather than installed and forgotten:
 * the person whose job gets easier is the person who onboards the floor.
 */
export type ManagerView = {
  unmatched: CircleMember[];
  unanswered: Ask[];
  trending: Array<{ topic: string; n: number }>;
};

export function managerView(): ManagerView {
  const asks = asksThisWeek(120);
  const counts = new Map<string, number>();
  for (const a of asks) counts.set(a.topic, (counts.get(a.topic) ?? 0) + 1);
  return {
    unmatched: ROSTER.filter((m) => rnd(`2g-new-${m.id}`) % 100 < 2).slice(0, 5),
    unanswered: asks.filter((a) => rnd(`2g-un-${a.member.id}`) % 100 < 14).slice(0, 4),
    trending: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([topic, n]) => ({ topic, n })),
  };
}

/**
 * The ask, read back as topics the matcher can actually see.
 *
 * Without this the whole thing degrades quietly and in the worst possible
 * way: the matcher falls through to "same kind of role, same kind of
 * stage", every card says the identical sentence, and the product looks
 * like a random-pairing toy. The reason has to be specific or there is no
 * product — so the one line somebody types gets mapped into the shared
 * vocabulary rather than being left as prose nothing can match on.
 *
 * Crude keyword matching on purpose. It is wrong occasionally, visible
 * always — the derived topics are shown as editable chips, so a person can
 * see what the room will match them on and correct it in one tap, which a
 * model call could not offer at a front desk anyway.
 */
const ASK_TOPICS: Array<[RegExp, string[]]> = [
  [/hir|engineer|backend|frontend|designer|recruit|co-?founder|team/i, ["hiring engineers", "first ten hires"]],
  [/customer|sales|gtm|go-to-market|logo|pipeline|revenue/i, ["go-to-market", "B2B sales"]],
  [/rais|seed|series|investor|angel|term sheet|cheque|fund/i, ["fundraising", "board management"]],
  [/design partner|beta|pilot|product|roadmap|user research/i, ["product strategy", "design systems"]],
  [/\bus\b|america|abroad|border|expand|international/i, ["entering the US", "entering India"]],
  [/pricing|price|monetis|monetiz|packaging/i, ["pricing"]],
  [/data|infra|platform|scal|architect/i, ["data infrastructure", "scaling support"]],
  [/brand|position|marketing|content/i, ["brand and positioning", "developer relations"]],
  [/advice|mentor|second opinion|stuck|someone who|meet people/i, ["product strategy", "go-to-market"]],
];

export function topicsFromAsk(ask: string): string[] {
  const out = new Set<string>();
  for (const [re, topics] of ASK_TOPICS) {
    if (re.test(ask)) for (const t of topics) out.add(t);
    if (out.size >= 4) break;
  }
  // Never empty: an ask nothing matched still deserves the broadest pair.
  if (out.size === 0) return ["product strategy", "go-to-market"];
  return [...out].slice(0, 4);
}

/** Starters, so nobody faces an empty box at a front desk. */
export const ASK_STARTERS = [
  "A senior backend hire, Bengaluru",
  "My first ten customers",
  "A design partner for an early beta",
  "Advice on raising a seed round",
  "Someone who's taken a product into the US",
  "Honestly — just want to meet people here",
];

export const HELP_CHIPS = OPEN_INTERESTS;

export const memberOf = memberById;
