import { cityById, membersOf, rnd, type CircleMember } from "./circleData";
import { ancestorsOf, entityById } from "./networks";

/**
 * Mentorship, for alumni networks only.
 *
 * ── Why this belongs to institutions and not communities ──────────────
 * Mentorship runs on a gradient: someone who went through the same thing
 * seven years before you, and whose advice is therefore about a road you
 * are actually on. An institution manufactures that gradient every year by
 * definition. An interest community doesn't — everyone joined last Tuesday
 * and owes each other nothing — which is why the module is gated on
 * `isAlumniNetwork` rather than offered everywhere and quietly ignored.
 *
 * ── Why most alumni mentorship programmes die ─────────────────────────
 * Four failures, and the shape below is a direct answer to each:
 *
 *   Matching is a spreadsheet and a committee, once a year.
 *     → matching is continuous and explains itself.
 *   "Here's your mentor, good luck" — neither side knows what to do.
 *     → a four-session arc with a stated purpose for each conversation.
 *   Open-ended commitment frightens mentors off.
 *     → it ends. Four conversations over three months, then renew or don't.
 *     → and mentors cap at two, so saying yes is survivable.
 *   Nobody can tell whether it worked, so it can't be renewed or funded.
 *     → a goal named at the start and an outcome logged at the end, rolling
 *       up to a number the institution can actually look at.
 */

/**
 * The arc. This is the product — more than the matching is.
 *
 * Diagnose, decide, review, hand off. A mentor agreeing to this is agreeing
 * to something finite and legible, which is why they agree at all.
 */
export const SESSION_ARC = [
  {
    n: 1,
    label: "Where you actually are",
    purpose: "No advice yet. The mentee talks, the mentor asks questions until the real problem shows up — it is usually not the stated one.",
    weeksIn: 0,
  },
  {
    n: 2,
    label: "The one thing to change",
    purpose: "Pick a single change worth making before the next session. One, not a plan. Write it down.",
    weeksIn: 3,
  },
  {
    n: 3,
    label: "What happened",
    purpose: "Review it honestly, including if nothing happened — why it didn't is the useful part.",
    weeksIn: 7,
  },
  {
    n: 4,
    label: "What's next without me",
    purpose: "Close it out. What the mentee does from here, who else they should talk to, and whether this is worth another round.",
    weeksIn: 11,
  },
] as const;

/** Goals people actually bring, rather than "grow my network". */
export const GOAL_TEMPLATES = [
  "Decide whether to leave and start something",
  "Move from consulting into an operating role",
  "Get to my first VP title",
  "Raise a seed round without wasting a year",
  "Switch function into product",
  "Build and run a team for the first time",
  "Work out whether to take the offer",
  "Go back to a market I left five years ago",
];

/**
 * Outcomes, including the ones that don't look like wins.
 *
 * "Decided against it" is a genuinely good outcome and most programmes have
 * no way to record it, so their numbers only ever count the people who did
 * the thing — which quietly teaches mentors that talking someone out of a
 * bad idea doesn't count.
 */
export const OUTCOMES = [
  { id: "did", label: "Did the thing", good: true },
  { id: "against", label: "Decided against it, deliberately", good: true },
  { id: "going", label: "Still going", good: false },
  { id: "stalled", label: "Didn't work out", good: false },
];

export type MentorMatch = {
  member: CircleMember;
  yearsAhead: number;
  why: string;
  helpWith: string[];
  sessionsGiven: number;
  menteesNow: number;
  /** Two live mentees is the cap. Capacity is what keeps a yes survivable. */
  full: boolean;
};

const MENTOR_CAP = 2;

/** Seniority, reused from the same reading the rest of the app does. */
function band(headline: string): number {
  if (/founder|ceo|partner|principal/i.test(headline)) return 3;
  if (/vp|head|director|gm|chief/i.test(headline)) return 2;
  return 1;
}

/**
 * The pool is the institution, never the class.
 *
 * Your mentor is an alum who came out years before you — by definition not
 * a classmate. Searching inside the class returns nobody, which is the
 * single easiest way to build this feature and have it quietly show an
 * empty list forever.
 */
export function institutionOf(entityId: string): string {
  return ancestorsOf(entityId)[0]?.id ?? entityId;
}

/** Alumni who've put themselves forward. Senior, and earlier out than you. */
export function mentorsIn(entityId: string, myGradYear: number): CircleMember[] {
  return membersOf(institutionOf(entityId)).filter(
    (m) => m.gradYear <= myGradYear - 3 && band(m.headline) >= 2 && rnd(`mentor-${m.id}`) % 100 < 42
  );
}

export function mentorStats(m: CircleMember): { sessionsGiven: number; menteesNow: number; full: boolean } {
  const menteesNow = rnd(`mentees-${m.id}`) % 3;
  return { sessionsGiven: 4 + (rnd(`sess-${m.id}`) % 28), menteesNow, full: menteesNow >= MENTOR_CAP };
}

/**
 * Who to ask, and why them.
 *
 * The alumni-specific signal is the batch gap: far enough ahead to have
 * been through it, close enough that the world hasn't changed underneath
 * the advice. Seven years is better than twenty.
 */
export function mentorMatchesFor(
  entityId: string,
  myGradYear: number,
  goal: string,
  interests: string[],
  limit = 4
): MentorMatch[] {
  return mentorsIn(entityId, myGradYear)
    .map((m) => {
      const stats = mentorStats(m);
      const yearsAhead = myGradYear - m.gradYear;
      const overlap = m.helpWith.filter((h) => interests.includes(h));
      // Sweet spot around seven years out, but gently: what they can
      // actually help with should beat being exactly the right vintage.
      const gapScore = 24 - Math.abs(yearsAhead - 7) * 2;
      const score = gapScore + overlap.length * 18 + (stats.full ? -40 : 0) + (rnd(`mm-${m.id}-${goal}`) % 6);
      const why = overlap.length
        ? `${m.name.split(" ")[0]} came out ${yearsAhead} years before you and will talk about ${overlap[0]} — which is most of what this goal turns on.`
        : `${yearsAhead} years ahead of you out of the same place, now ${m.headline} at ${m.company}. Close enough that the advice still applies.`;
      return { member: m, yearsAhead, why, helpWith: m.helpWith, ...stats, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ ...rest }) => rest as MentorMatch);
}

/** Dates for the arc, from a start offset, so the commitment reads as finite. */
export function sessionDates(startedDaysAgo: number): string[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return SESSION_ARC.map((s) => {
    const d = new Date();
    d.setDate(d.getDate() - startedDaysAgo + s.weeksIn * 7);
    return `${months[d.getMonth()]} ${d.getDate()}`;
  });
}

/**
 * The number an alumni office can look at.
 *
 * Deliberately includes the outcomes that aren't wins — a programme that
 * only reports successes is one nobody believes.
 */
export function mentorshipStats(entityId: string, myGradYear: number) {
  const pool = membersOf(entityId);
  const mentors = mentorsIn(entityId, myGradYear + 20);
  const pairs = Math.round(pool.length * 0.11);
  const sessions = pairs * 3 + (rnd(`ms-${entityId}`) % 20);
  const did = Math.round(pairs * 0.34);
  const against = Math.round(pairs * 0.16);
  const going = Math.round(pairs * 0.38);
  return {
    mentorsAvailable: mentors.filter((m) => !mentorStats(m).full).length,
    pairs,
    sessions,
    outcomes: { did, against, going, stalled: Math.max(0, pairs - did - against - going) },
  };
}

export type MenteeCandidate = { member: CircleMember; goal: string; note: string; wants: string | null };

/**
 * People asking, ranked for one mentor.
 *
 * A mentor shouldn't be handed a single take-it-or-leave-it request —
 * choosing who you spend four hours on is most of why anyone agrees to
 * spend them. Verified only, and ordered so the ones who want something
 * the mentor actually said they'd talk about come first.
 */
export function menteeCandidatesFor(entityId: string, myGradYear: number, myTopics: string[], limit = 6): MenteeCandidate[] {
  return membersOf(institutionOf(entityId))
    .filter((m) => m.verified && m.gradYear >= myGradYear + 2 && rnd(`req-${m.id}`) % 100 < 22)
    .map((m) => {
      const goal = GOAL_TEMPLATES[rnd(`rg-${m.id}`) % GOAL_TEMPLATES.length];
      const wants = m.helpWith.find((h) => myTopics.includes(h)) ?? null;
      return {
        member: m,
        goal,
        wants,
        note: `We haven't met — I'm ${m.gradYear - myGradYear} years behind you out of the same place. ${
          wants ? `You've said you'll talk about ${wants}, which is most of what this turns on.` : "I think you've already made the decision I'm stuck on."
        } Four conversations, and I'll come prepared to each.`,
        score: (wants ? 20 : 0) + (10 - Math.abs(m.gradYear - myGradYear - 7)) + (rnd(`mcs-${m.id}`) % 5),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ ...rest }) => rest as MenteeCandidate);
}

export const cityOf = (m: CircleMember) => cityById(m.cityId)?.name ?? "";

/** The institution's display name, for copy that should say "ISB" not "Class of 2019". */
export const institutionName = (entityId: string) => entityById(institutionOf(entityId))?.name ?? "this network";

/**
 * Who a mentor says they want.
 *
 * Preferences, not filters. The point isn't to exclude people — it's that a
 * mentor who has written down "early-career, thinking about leaving" gets
 * requests they actually want to answer, which is the whole supply problem.
 */
export const MENTOR_WANTS = [
  "Anyone who asks well",
  "Early career, first five years out",
  "People thinking about leaving",
  "First-time founders",
  "People moving function",
  "Women earlier in the same track",
];

/** How long a request has been sitting, said the way a person would say it. */
export function waitedLabel(days: number): string {
  if (days <= 0) return "just now";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return `${Math.round(days / 7)} weeks ago`;
}

/**
 * The request itself, drafted.
 *
 * A blank box produces "Hi, would you be my mentor?", which is the message
 * mentors ignore. This one states the goal, why this person specifically,
 * and what the mentee is committing to — and it's editable, because a
 * request somebody didn't write isn't worth reading either.
 */
export function draftRequest(mentorName: string, yearsAhead: number, goal: string, overlap: string | null): string {
  const f = mentorName.split(" ")[0];
  return [
    `Hi ${f} —`,
    ``,
    `I'm ${yearsAhead} years behind you out of the same place, and what I'm trying to work out is: ${goal.toLowerCase()}.`,
    overlap
      ? `You've put ${overlap} down as something you'll talk about, which is most of what this turns on.`
      : `You've done the version of this I'm looking at, which is why I'm asking you rather than anyone else.`,
    ``,
    `Four conversations over three months. I'll come to each one with something specific and I won't waste them.`,
  ].join("\n");
}
