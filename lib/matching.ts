import { cityById, rnd, type CircleMember } from "./circleData";
import type { CircleMe } from "./circleMe";

/**
 * One-to-one matching for the open network.
 *
 * ── What this is ──────────────────────────────────────────────────────
 * A deterministic heuristic standing in for the model, so the experience
 * can be judged before the model exists. The seam is deliberate and narrow:
 * `matchesFor` takes a person and a pool and returns ranked, explained
 * matches. A real build swaps the body — embeddings over profile text,
 * intent and interaction history — and everything downstream is unchanged.
 *
 * ── Why it's shaped like this ─────────────────────────────────────────
 * Three decisions, and they're the product:
 *
 * No score is shown. "92% match" is fake precision; nobody can act on it
 * and nobody can argue with it. A *kind* of match can be understood and
 * corrected: "she can unblock you" is either true or it isn't.
 *
 * Reciprocity outranks similarity. The matches people actually act on are
 * the ones where they have something to give, because then the first
 * message isn't a favour being asked. Mutual matches score highest by a
 * wide margin, which is why the pair of fields on a profile — what you'll
 * answer, what you need — carries more weight than anything else here.
 *
 * It's scarce. Three a week, not fifty. A feed of recommendations is
 * ignored; three with names and reasons gets read.
 */

export type MatchKind = "mutual" | "unblocks-you" | "you-unblock" | "ahead" | "peer" | "nearby";

export type Match = {
  member: CircleMember;
  kind: MatchKind;
  /** Ordering only — deliberately never rendered. */
  score: number;
  /** The headline claim, in words a person would use. */
  why: string;
  /** The concrete exchange, stated in both directions. */
  theyOffer: string | null;
  youOffer: string | null;
  /** Signals the match was drawn from, shown so it can be disagreed with. */
  basis: string[];
  /** A first message, to edit rather than to send blind. */
  opener: string;
  confidence: "strong" | "worth a look";
};

export const MATCH_KIND: Record<MatchKind, { label: string; blurb: string }> = {
  mutual: { label: "Straight swap", blurb: "You each have something the other is looking for." },
  "unblocks-you": { label: "Can unblock you", blurb: "They've offered to talk about the thing you're stuck on." },
  "you-unblock": { label: "You can help them", blurb: "They're looking for something you've already done." },
  ahead: { label: "A few years ahead", blurb: "Same road as you, further along it." },
  peer: { label: "Same boat", blurb: "Close enough to your situation to be worth comparing notes." },
  nearby: { label: "Worth a coffee", blurb: "In your city, and in your line of work." },
};

/** Rough seniority, used to tell "ahead of you" from "same boat". */
function band(headline: string): number {
  if (/founder|ceo|partner|principal/i.test(headline)) return 3;
  if (/vp|head|director|gm|chief/i.test(headline)) return 2;
  return 1;
}

function first(name: string): string {
  return name.split(" ")[0];
}

function openerFor(kind: MatchKind, me: CircleMe, m: CircleMember, theyOffer: string | null): string {
  const f = first(m.name);
  const myCity = cityById(me.cityId)?.name ?? "my city";
  switch (kind) {
    case "mutual":
      return `Hi ${f} — you're after ${m.lookingFor}, and that's something I've actually done at ${me.company || "my last company"}. I'm going the other way on ${theyOffer}, which you've said you'll talk about. Straight swap, twenty minutes?`;
    case "unblocks-you":
      return `Hi ${f} — you've put ${theyOffer} down as something you'll talk about, and it's exactly where I'm stuck. I've got one specific question rather than a general one. Any chance of twenty minutes?`;
    case "you-unblock":
      return `Hi ${f} — saw you're looking for ${m.lookingFor}. I've done that before and could probably save you a few weeks of it. Happy to talk if it's useful, no agenda.`;
    case "ahead":
      return `Hi ${f} — you're a few years ahead of me on what looks like the same road (${m.headline} at ${m.company}). Would you take twenty minutes to tell me what you'd do differently?`;
    case "peer":
      return `Hi ${f} — we seem to be at much the same stage on much the same problem. I've found almost nobody to compare notes with. Worth a call?`;
    default:
      return `Hi ${f} — we're both in ${myCity} and both somewhere near ${m.headline.toLowerCase()}. Coffee sometime? Genuinely no agenda.`;
  }
}

function whyFor(kind: MatchKind, me: CircleMe, m: CircleMember, theyOffer: string | null): string {
  const f = first(m.name);
  const city = cityById(m.cityId)?.name ?? "their city";
  switch (kind) {
    case "mutual":
      return `${f} is looking for ${m.lookingFor} — which you've done — and will talk about ${theyOffer}, which you said you need. That goes both ways, so neither of you is asking for a favour.`;
    case "unblocks-you":
      return `You said you're here for ${theyOffer}. ${f} has put that on their profile as something they'll answer, and has ${m.past.length > 1 ? "two previous roles" : "form"} behind it.`;
    case "you-unblock":
      return `${f} is looking for ${m.lookingFor}. Going by what you've listed, you've been through that — which makes this an easy message to send rather than a hard one.`;
    case "ahead":
      return `${f} is ${m.headline} at ${m.company}, which is roughly where you're heading. Close enough to be relevant, far enough ahead to be worth asking.`;
    case "peer":
      return `Same kind of role, same kind of stage, different company. The people who find these useful say it's the only conversation where nobody is selling.`;
    default:
      return `${f} is in ${city}, same as you, and works close enough to your side of things that a coffee wouldn't be wasted.`;
  }
}

/**
 * Rank a pool against one person.
 *
 * `week` shifts the deterministic tie-breaking, so the set rotates rather
 * than handing back the same three faces forever.
 */
export function matchesFor(me: CircleMe, pool: CircleMember[], opts: { limit?: number; week?: number; exclude?: string[] } = {}): Match[] {
  const { limit = 3, week = 0, exclude = [] } = opts;
  const skip = new Set(exclude);
  const myInterests = me.interests ?? [];
  const myHelp = me.helpWith ?? [];
  const myBand = band(me.headline || "");

  const scored = pool
    .filter((m) => !skip.has(m.id))
    .map((m) => {
      const theyOffer = m.helpWith.find((h) => myInterests.includes(h)) ?? null;
      // You can help them when what they're asking for sits in your own list.
      const youOffer = m.lookingFor && myHelp.some((h) => m.lookingFor!.toLowerCase().includes(h.split(" ")[0].toLowerCase())) ? m.lookingFor : null;
      const sameCity = m.cityId === me.cityId;
      const theirBand = band(m.headline);

      let kind: MatchKind;
      let score: number;
      if (theyOffer && youOffer) {
        kind = "mutual";
        score = 100;
      } else if (theyOffer) {
        kind = "unblocks-you";
        score = 80;
      } else if (youOffer) {
        kind = "you-unblock";
        score = 70;
      } else if (theirBand > myBand && m.headline === me.headline) {
        kind = "ahead";
        score = 55;
      } else if (theirBand === myBand && sameCity) {
        kind = "peer";
        score = 45;
      } else if (sameCity) {
        kind = "nearby";
        score = 35;
      } else {
        kind = "peer";
        score = 10;
      }

      // Small nudges, none of them decisive on their own.
      if (sameCity) score += 6;
      if (m.lookingFor) score += 3;
      if (m.mode !== "off") score += 2;
      score += rnd(`match-${me.name}-${m.id}-${week}`) % 7;

      const basis = [
        theyOffer && `you're here for ${theyOffer}`,
        youOffer && `you've listed ${myHelp[0]}`,
        sameCity && `you're both in ${cityById(m.cityId)?.name}`,
        theirBand > myBand && "they're further along the same track",
        m.lookingFor && "they said what they need",
      ].filter(Boolean) as string[];

      return {
        member: m,
        kind,
        score,
        why: whyFor(kind, me, m, theyOffer),
        theyOffer,
        youOffer,
        basis,
        opener: openerFor(kind, me, m, theyOffer),
        confidence: (score >= 70 ? "strong" : "worth a look") as Match["confidence"],
      };
    })
    .sort((a, b) => b.score - a.score);

  /**
   * Spread the kinds before filling by score.
   *
   * Taking the top three by score hands back three of whatever kind scores
   * highest — three "can unblock you" in a row — and a batch that reads the
   * same three times gets skimmed. One of each kind first, then fill: a
   * slightly lower-scoring set that shows you the different *shapes* of
   * useful is the better set. Standard diversification, and it matters more
   * here than in a feed because there are only three.
   */
  const picked: Match[] = [];
  const seen = new Set<MatchKind>();
  for (const c of scored) {
    if (picked.length >= limit) break;
    if (seen.has(c.kind)) continue;
    seen.add(c.kind);
    picked.push(c);
  }
  for (const c of scored) {
    if (picked.length >= limit) break;
    if (!picked.includes(c)) picked.push(c);
  }
  return picked;
}

/** Days until the next batch — the thing that makes this a reason to come back. */
export function daysUntilNextBatch(): number {
  const d = new Date();
  // Monday.
  return (8 - (d.getDay() || 7)) % 7 || 7;
}
