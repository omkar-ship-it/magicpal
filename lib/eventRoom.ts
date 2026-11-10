import { rnd } from "./circleData";

/**
 * One in-person event, fifty people deep — the pitch for organisers.
 *
 * Every other prototype here answers "who is in this city". An event asks
 * something smaller and harder: of the fifty people in this building for
 * the next three hours, which four are worth crossing the room for. The
 * answer is not a roster, because a roster of fifty job titles is the
 * badge wall people already fail at.
 *
 * Three things follow from that and shape everything below.
 *
 * Everybody is asking for something. In the open network only about a
 * third are, and that is honest — most people are not actively looking on
 * a Tuesday. But nobody buys a ticket to a founders' mixer to browse. A
 * roster where half the cards say nothing would be the real product
 * failing at the one moment it has to work.
 *
 * Nobody is standing in the same place. The venue is a footprint, not a
 * point: a hall, a mezzanine, a coffee bar, a workshop room. Fifty pins on
 * one coordinate is the density problem that makes a map worse than a
 * list, and the fix is that people are genuinely spread across a building
 * — which at this zoom they are.
 *
 * It is all deterministic from a name hash, like the rest of the
 * prototypes. No database, no network, identical on every load — so a URL
 * sent to an organiser shows them exactly what it showed you.
 */

// ───────────────────────────────────────────────────────────── the event

export const EVENT = {
  name: "StartUp Networking",
  venue: "T-Hub, Hyderabad",
  room: "Riverside Hall, 2nd floor",
  when: "Thursday, 6:30 – 9:30 pm",
  host: "Hyderabad Founders Collective",
  /** T-Hub 2.0, Raidurg. The map opens tight on this. */
  lat: 17.4356,
  lng: 78.3489,
} as const;

/**
 * Where people actually stand, which is never evenly.
 *
 * A venue has gravity: most of the room is by the stage, a knot forms at
 * the coffee, a few people take a call on the terrace. Scattering fifty
 * pins uniformly across a rectangle would be tidier and would read as
 * synthetic — a crowd has lumps, and the lumps are what make "who's near
 * the coffee" a question worth asking.
 *
 * Offsets are in degrees; 0.0001° ≈ 11m. The zones sit roughly ninety
 * metres apart and each holds its people within thirty to sixty, so at
 * the zoom this opens at a face is a face rather than part of a clump —
 * the first pass packed eighteen avatars into forty pixels, which is the
 * density problem this page exists to avoid.
 */
const ZONES = [
  { id: "hall", label: "Main hall", dx: 0.00004, dy: -0.00004, spread: 0.00058, weight: 18 },
  { id: "stage", label: "By the stage", dx: -0.00078, dy: 0.00044, spread: 0.00030, weight: 9 },
  { id: "coffee", label: "Coffee bar", dx: 0.00086, dy: -0.00020, spread: 0.00030, weight: 11 },
  { id: "mezz", label: "Mezzanine", dx: 0.00020, dy: 0.00080, spread: 0.00038, weight: 7 },
  { id: "workshop", label: "Workshop room", dx: -0.00080, dy: -0.00064, spread: 0.00032, weight: 5 },
] as const;

export type ZoneId = (typeof ZONES)[number]["id"];
export const ZONE_LABEL: Record<string, string> = Object.fromEntries(ZONES.map((z) => [z.id, z.label]));

/** The weighted bag, so "most people are in the hall" is true by construction. */
const ZONE_BAG: ZoneId[] = ZONES.flatMap((z) => Array<ZoneId>(z.weight).fill(z.id));

// ──────────────────────────────────────────────────────── the vocabulary

/**
 * Asks and offers as whole phrases, not tags.
 *
 * "Fundraising" is a category; "a warm intro to a seed fund that has done
 * climate hardware" is a sentence somebody can answer. The filters below
 * group by topic so the room stays navigable, but what a card *shows* is
 * always the sentence — the topic is for narrowing, the sentence is what
 * makes you walk over.
 */
export const TOPICS = [
  { id: "funding", label: "Funding" },
  { id: "hiring", label: "Hiring" },
  { id: "customers", label: "Customers" },
  { id: "product", label: "Product & design" },
  { id: "tech", label: "Engineering" },
  { id: "gtm", label: "Go-to-market" },
] as const;

export type TopicId = (typeof TOPICS)[number]["id"];

const ASKS: Record<TopicId, string[]> = {
  funding: [
    "a warm intro to a seed fund that backs hardware",
    "an angel who has sold into government",
    "a second opinion on our Series A term sheet",
    "someone who has raised a bridge without a lead",
  ],
  hiring: [
    "a senior backend engineer who has done payments",
    "my first design hire",
    "a founding GTM person in Hyderabad",
    "someone who has built an ML team from two to twenty",
  ],
  customers: [
    "my first three enterprise logos",
    "intros to hospital procurement teams",
    "design partners for an early beta",
    "anyone selling into Indian manufacturers",
  ],
  product: [
    "a brutal review of our onboarding",
    "someone who has taken a product 0 to 1 twice",
    "a design partner for a marketplace",
    "help naming the thing we have built",
  ],
  tech: [
    "advice on moving off a managed database",
    "someone who has run inference at scale cheaply",
    "a technical co-founder, ML, for something new",
    "an honest read on our architecture",
  ],
  gtm: [
    "a playbook for outbound that is not spam",
    "someone who has done community-led growth",
    "help pricing a seat-based product",
    "a partner for a joint launch",
  ],
};

const OFFERS: Record<TopicId, string[]> = {
  funding: [
    "intros to seed funds in India and SEA",
    "reading a term sheet without the theatre",
    "what angels actually ask in the second meeting",
    "getting to a first close in eight weeks",
  ],
  hiring: [
    "hiring engineers without a recruiter",
    "what to pay in Hyderabad right now",
    "interview loops that do not waste a week",
    "the first ten hires, and the order",
  ],
  customers: [
    "selling into Indian hospitals",
    "cold outbound that gets replies",
    "turning a pilot into a contract",
    "enterprise procurement, start to finish",
  ],
  product: [
    "0 to 1 product, twice over",
    "design systems for a team of three",
    "user research you can run yourself",
    "pricing and packaging",
  ],
  tech: [
    "infrastructure that does not fall over",
    "ML in production, cheaply",
    "mobile architecture and app performance",
    "data pipelines without a data team",
  ],
  gtm: [
    "community-led growth from zero",
    "positioning that survives a sales call",
    "go-to-market for a technical founder",
    "partnerships and joint launches",
  ],
};

const GIVEN = [
  "Ananya", "Vikram", "Radha", "Arjun", "Meera", "Rohan", "Priya", "Karthik", "Divya", "Aditya",
  "Sneha", "Nikhil", "Fatima", "Rahul", "Ishita", "Varun", "Kavya", "Siddharth", "Neha", "Aman",
  "Lakshmi", "Tanmay", "Pooja", "Harsha", "Anjali", "Rishi", "Sahana", "Dev", "Nandini", "Yash",
];

const FAMILY = [
  "Rao", "Iyer", "Krishna", "Mehta", "Reddy", "Nair", "Sharma", "Patel", "Desai", "Varma",
  "Kulkarni", "Banerjee", "Chopra", "Menon", "Joshi", "Gupta", "Pillai", "Shetty", "Bose", "Kapoor",
];

const ROLES = [
  "Founder", "Co-founder & CTO", "Product lead", "Head of engineering", "Design lead",
  "Growth lead", "Early-stage investor", "Data scientist", "Head of sales", "Operator turned angel",
  "Engineering manager", "Founding designer", "Head of partnerships", "Platform engineer", "Chief of staff",
];

const COMPANIES = [
  "Verdant", "Northwind", "Pierpoint", "Lakdhi", "Riverdale", "Adfice", "Scout7", "Growthly",
  "HealthAI", "VedaNexus", "Bandico", "Expedera", "Vofo", "Kismat Labs", "Tessellate",
  "Oryza", "Kalpa", "Bluejay", "Sankhya", "Marrow",
];

// ───────────────────────────────────────────────────────────── attendees

export type Status = "checked_in" | "going" | "no_show";

export type Attendee = {
  id: string;
  name: string;
  role: string;
  company: string;
  /** Degrees, already offset from the venue centre. */
  lat: number;
  lng: number;
  zone: ZoneId;
  askTopic: TopicId;
  ask: string;
  offerTopic: TopicId;
  offer: string;
  /**
   * Where they are in the funnel, which is three states and not two.
   *
   * `going` is a promise made last week. `checked_in` is a fact about
   * right now, and it is the single most valuable thing the matcher
   * knows — an introduction you can make in the next ten minutes beats
   * one you have to arrange. `no_show` is the honesty: some of the
   * guest list never arrives, and a product that pretends otherwise
   * sends people looking for somebody who is at home.
   *
   * Check-in only exists while the event is running. Before the doors
   * open everyone is `going` and the room view is empty by definition,
   * which is why this demo is pinned to an event in progress.
   */
  status: "checked_in" | "going" | "no_show";
  bio: string;
};

const BIOS = [
  "Second company. The first one taught me what not to build.",
  "Ten years an operator, eighteen months a founder, still adjusting.",
  "I like the unglamorous half — pricing, support, the second hundred customers.",
  "Left a large company to find out if I could do it without the logo.",
  "Mostly interested in the gap between what we ship and what people feel.",
  "Technical by training, commercial by necessity.",
  "Spent a year saying no to the wrong customers. Worth it.",
  "Here to meet people building hard things slowly.",
];

function buildAttendees(): Attendee[] {
  const out: Attendee[] = [];
  for (let i = 0; i < 50; i++) {
    const zone = ZONE_BAG[rnd(`z-${i}`) % ZONE_BAG.length];
    const z = ZONES.find((x) => x.id === zone)!;

    /**
     * Two independent offsets inside the zone, each its own hash key.
     * Deriving both from one number correlates them and lays the crowd
     * out along a diagonal — which is the tell that a map is generated.
     */
    const ox = ((rnd(`ox-${i}`) % 2000) / 1000 - 1) * z.spread;
    const oy = ((rnd(`oy-${i}`) % 2000) / 1000 - 1) * z.spread;

    const askTopic = TOPICS[rnd(`at-${i}`) % TOPICS.length].id;
    /** Never the same topic on both sides: a card that asks and offers the
     *  same thing says nothing about why two people should talk. */
    const offerPool = TOPICS.filter((t) => t.id !== askTopic);
    const offerTopic = offerPool[rnd(`ot-${i}`) % offerPool.length].id;

    out.push({
      id: `a-${i}`,
      name: `${GIVEN[rnd(`g-${i}`) % GIVEN.length]} ${FAMILY[rnd(`f-${i}`) % FAMILY.length]}`,
      role: ROLES[rnd(`r-${i}`) % ROLES.length],
      company: COMPANIES[rnd(`c-${i}`) % COMPANIES.length],
      lat: EVENT.lat + z.dy + oy,
      lng: EVENT.lng + z.dx + ox,
      zone,
      askTopic,
      ask: ASKS[askTopic][rnd(`ax-${i}`) % ASKS[askTopic].length],
      offerTopic,
      offer: OFFERS[offerTopic][rnd(`ofx-${i}`) % OFFERS[offerTopic].length],
      status: (() => {
        const r = rnd(`h-${i}`) % 100;
        return r < 72 ? "checked_in" : r < 92 ? "going" : "no_show";
      })(),
      bio: BIOS[rnd(`b-${i}`) % BIOS.length],
    });
  }
  return out;
}

export const ATTENDEES: Attendee[] = buildAttendees();

export const attendeeById = (id: string): Attendee | undefined => ATTENDEES.find((a) => a.id === id);

/**
 * You, at this event.
 *
 * A fixed visitor rather than a sign-up: the page exists to be opened from
 * a link in a pitch, and a form in front of the thing being pitched loses
 * most of the people it is meant to persuade.
 */
export const YOU = {
  id: "you",
  name: "You",
  role: "Founder",
  company: "—",
  askTopic: "hiring" as TopicId,
  ask: "a technical co-founder, ML, for something new",
  offerTopic: "gtm" as TopicId,
  offer: "go-to-market for a technical founder",
  lat: EVENT.lat + 0.00004,
  lng: EVENT.lng + 0.00006,
};

// ─────────────────────────────────────────────────────────── the matcher

/**
 * Four tiers, and a colour for each, because a number is not a decision.
 *
 * A score of 0.73 tells a reader nothing they can act on. What they can
 * act on is "this one goes both ways" — and a room where the mutual
 * matches are green and the rest fade out is read in a second, from
 * across the map, without opening anything.
 *
 * The order is by what the reader gets, not by symmetry. Mutual first.
 * Then people who can help *you*, because that is why you came. Then
 * people you could help, which is worth knowing and is not the same
 * favour. Then everybody else, who are not failures — they are the other
 * forty, and a room where everyone is a match is a room with no signal
 * in it.
 */
export type Tier = "mutual" | "they-help" | "you-help" | "none";

export const TIER: Record<Tier, { label: string; colour: string; rank: number }> = {
  mutual: { label: "Both ways", colour: "var(--good)", rank: 3 },
  "they-help": { label: "They can help you", colour: "#d99a00", rank: 2 },
  "you-help": { label: "You can help them", colour: "var(--brand)", rank: 1 },
  none: { label: "No overlap", colour: "var(--ink-soft)", rank: 0 },
};

export type Match = {
  a: Attendee;
  tier: Tier;
  score: number;
  reason: string;
  /** The first line, already written. See `opener`. */
  opener: string;
};

const label = (t: TopicId) => TOPICS.find((x) => x.id === t)?.label.toLowerCase() ?? t;
const first = (name: string) => name.split(" ")[0];

/**
 * The first message, drafted from the overlap and nothing else.
 *
 * The step everybody stalls on is not deciding who to talk to, it is the
 * opening sentence — which is why a matcher that stops at a name has
 * done about half the job. These are built from the two facts both
 * people have already published, so the draft can never claim a
 * connection neither of them stated. It is a starting point in a box
 * somebody edits, not a message sent on their behalf.
 */
function opener(a: Attendee, you: { askTopic: TopicId; offerTopic: TopicId; ask: string }, tier: Tier): string {
  const n = first(a.name);
  if (tier === "mutual")
    return `Hi ${n} — I'm after ${you.ask}, and ${label(a.offerTopic)} is your thing. I can probably help with ${label(
      you.offerTopic
    )}, which looks like what you're looking for. Worth ten minutes?`;
  if (tier === "they-help")
    return `Hi ${n} — you mentioned ${a.offer}. That's exactly what I'm stuck on. Could I borrow ten minutes before this wraps up?`;
  if (tier === "you-help")
    return `Hi ${n} — saw you're looking for ${a.ask}. I've done some of that and I'm happy to talk it through if it's useful.`;
  return `Hi ${n} — good to see you here tonight.`;
}

export function matchOf(
  a: Attendee,
  you: { askTopic: TopicId; offerTopic: TopicId; ask: string } = YOU
): Match {
  const theyHelpYou = a.offerTopic === you.askTopic;
  const youHelpThem = a.askTopic === you.offerTopic;
  const tier: Tier = theyHelpYou && youHelpThem ? "mutual" : theyHelpYou ? "they-help" : youHelpThem ? "you-help" : "none";

  const reason =
    tier === "mutual"
      ? `You're after ${label(you.askTopic)} and they do it — and they want ${label(you.offerTopic)}, which is yours.`
      : tier === "they-help"
        ? `You're looking for ${label(you.askTopic)}. They can help with ${a.offer}.`
        : tier === "you-help"
          ? `They're looking for ${a.ask} — that's what you offer.`
          : `No overlap stated, but they're in the room.`;

  // Presence breaks every tie: an introduction you can make tonight is
  // worth more than one you have to arrange.
  const presence = a.status === "checked_in" ? 0.6 : a.status === "going" ? 0.2 : 0;
  return { a, tier, score: TIER[tier].rank + presence, reason, opener: opener(a, you, tier) };
}

export function matchesFor(
  you: { askTopic: TopicId; offerTopic: TopicId; ask: string } = YOU,
  pool: Attendee[] = ATTENDEES,
  limit = 6
): Match[] {
  return pool
    .map((a) => matchOf(a, you))
    .filter((m) => m.tier !== "none")
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}

// ──────────────────────────────────────────────────────────────── feed

export type FeedItem = { id: string; who: Attendee; text: string; ago: string };

const POSTS = [
  "Anyone here worked with Indian hospital procurement? Twenty minutes of your time and the coffee is on me.",
  "I have two spare tickets to the hardware meetup on Saturday — first two replies.",
  "Looking for one more person for a table on pricing. Mezzanine, in ten.",
  "If you are raising right now and want a brutal read on your deck, find me by the coffee.",
  "Hiring a founding designer. Happy to talk about what the role actually is before you apply.",
  "Who else is building in climate? There seem to be four of us and we have not met.",
];

export const FEED: FeedItem[] = POSTS.map((text, i) => ({
  id: `p-${i}`,
  who: ATTENDEES[rnd(`fw-${i}`) % ATTENDEES.length],
  text,
  ago: `${2 + i * 7}m`,
}));

// ─────────────────────────────────────────────────────────────── chats

export type Line = { from: "them" | "me"; text: string; ago: string };

/**
 * Conversations already in flight, because an empty inbox is the worst
 * thing to show somebody you are trying to persuade.
 *
 * Each one is an hour of an evening compressed: an opener built from the
 * two stated facts, a reply, and the thing that actually matters — a
 * time and a place inside the venue. That last line is the whole pitch
 * in miniature, because it is the step a badge wall never reaches.
 */
export const THREADS: Array<{ withId: string; lines: Line[]; unread: boolean }> = [
  {
    withId: "a-3",
    unread: true,
    lines: [
      { from: "me", text: "Hi — you mentioned interview loops that don't waste a week. That's exactly what I'm stuck on. Could I borrow ten minutes before this wraps up?", ago: "24m" },
      { from: "them", text: "Yes — happy to. We cut ours from five rounds to two and hired faster. I'm by the coffee bar for the next twenty minutes if that works?", ago: "18m" },
      { from: "me", text: "On my way over. Tall, grey jacket.", ago: "17m" },
      { from: "them", text: "Found you. 👋", ago: "16m" },
    ],
  },
  {
    withId: "a-11",
    unread: true,
    lines: [
      { from: "them", text: "Hi — saw you're looking for a technical co-founder with ML. I'm not available but I ran a team doing exactly that at my last company, and I know two people here tonight who might be.", ago: "9m" },
      { from: "me", text: "That would be enormously useful. Are either of them still in the room?", ago: "6m" },
      { from: "them", text: "One is — she's in the workshop room. I'll walk you over.", ago: "4m" },
    ],
  },
  {
    withId: "a-22",
    unread: false,
    lines: [
      { from: "me", text: "Hi — you're after your first three enterprise logos. I've done that twice in India and the second one is a very different sale to the first. Worth a chat?", ago: "1h" },
      { from: "them", text: "Very. We keep losing them at procurement. Tomorrow morning any good? I'm out of here at nine.", ago: "52m" },
    ],
  },
];
