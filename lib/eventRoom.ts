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
  /** Checked in and in the room right now, as opposed to merely registered. */
  here: boolean;
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
      // Most of the room is here; a few registered and are still in traffic.
      here: rnd(`h-${i}`) % 100 < 78,
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

export type Match = { a: Attendee; score: number; reason: string };

/**
 * Why these four, and not the other forty-six.
 *
 * The score is deliberately legible rather than clever: a two-way fit —
 * they can help with what you asked for *and* you can help with what they
 * asked for — beats a one-way one, and being in the room beats being on
 * the guest list. Anything a reader cannot reconstruct from the sentence
 * underneath it is the kind of recommendation nobody acts on.
 */
export function matchesFor(
  you: { askTopic: TopicId; offerTopic: TopicId },
  pool: Attendee[] = ATTENDEES,
  limit = 5
): Match[] {
  const scored = pool.map((a) => {
    const theyHelpYou = a.offerTopic === you.askTopic;
    const youHelpThem = a.askTopic === you.offerTopic;
    let score = 0;
    let reason = "";
    if (theyHelpYou && youHelpThem) {
      score = 3;
      reason = `You're after ${label(you.askTopic)} and they do it. They're after ${label(
        you.offerTopic
      )}, which is yours.`;
    } else if (theyHelpYou) {
      score = 2;
      reason = `You're looking for ${label(you.askTopic)}. They can help with ${a.offer}.`;
    } else if (youHelpThem) {
      score = 1;
      reason = `They're looking for ${a.ask} — that's what you offer.`;
    }
    // Presence breaks ties, because an introduction you can make tonight
    // is worth more than one you have to arrange.
    if (a.here) score += 0.5;
    return { a, score, reason };
  });
  return scored
    .filter((m) => m.score >= 1)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}

const label = (t: TopicId) => TOPICS.find((x) => x.id === t)?.label.toLowerCase() ?? t;

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
