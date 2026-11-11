import { rnd } from "./circleData";
import { distanceKm } from "./geo";

/**
 * One WhatsApp community, fifty members deep — the pitch for group admins.
 *
 * It is the same product as `/in-person-event` pointed at a different
 * problem, and almost every design decision inverts, which is the
 * interesting part.
 *
 * **Geography matters again.** At an event everybody is in one building
 * and ninety seconds apart, so where somebody stands tells you almost
 * nothing about whether they are worth your evening — which is why that
 * prototype throws the floorplan away the moment you ask it who to meet.
 * A WhatsApp group is spread across a city. "Who in here is in
 * Gachibowli" is a real question with a real answer, and it is one the
 * group chat cannot answer at any price. So the map is a map again.
 *
 * **Presence is not attendance.** An event has check-in: a fact about
 * right now, and the strongest thing the matcher knows. A group has no
 * such moment. What it has instead is the thing every admin complains
 * about — two hundred members and the same twelve talking. So the
 * equivalent signal is how much of a member the chat has ever surfaced,
 * and the demo's whole argument is that the quiet ones are not inactive
 * people. They are people the group has no way to hear from.
 *
 * **Asks expire differently.** At an event an unanswered ask dies when
 * the doors close. In a group it dies by scrolling, which is worse,
 * because the person who could have answered was in the room the whole
 * time and never saw it. `FEED` keeps the receipts.
 *
 * Deterministic from a name hash like every other prototype here — no
 * database, no network, identical on every load, so a URL sent to an
 * admin shows them exactly what it showed you.
 */

// ───────────────────────────────────────────────────────── the community

export const COMMUNITY = {
  name: "Hyderabad Founders",
  platform: "WhatsApp group",
  about: "Founders, operators and early-stage investors in Hyderabad.",
  admin: "Hyderabad Founders Collective",
  created: "Started March 2024",
  /** Messages this month, against how many people sent them. See `VOICE`. */
  messages: 1284,
  /** Roughly the centre of the western corridor the group lives in. */
  lat: 17.4446,
  lng: 78.4035,
} as const;

/**
 * Localities, because a city is where the information is.
 *
 * Real coordinates, real neighbourhoods, weighted the way a Hyderabad
 * founders' group actually skews — the IT corridor is most of it and
 * Secunderabad is three people who always say the traffic is not that
 * bad.
 *
 * The view anchors a readable block of faces to each of these points
 * rather than scattering fifty pins across twenty-five kilometres. At
 * city scale a locality *is* a point: a block pinned to it claims
 * exactly as much precision as a cluster bubble would, and unlike a
 * bubble you can read the faces inside it.
 */
const AREAS = [
  { id: "gachibowli", label: "Gachibowli", lat: 17.4401, lng: 78.3489, weight: 9 },
  { id: "madhapur", label: "Madhapur & HITEC City", lat: 17.4483, lng: 78.3915, weight: 11 },
  { id: "kondapur", label: "Kondapur", lat: 17.4615, lng: 78.3647, weight: 6 },
  { id: "jubilee", label: "Jubilee Hills", lat: 17.4319, lng: 78.4073, weight: 7 },
  { id: "banjara", label: "Banjara Hills", lat: 17.4156, lng: 78.4347, weight: 6 },
  { id: "begumpet", label: "Begumpet", lat: 17.4435, lng: 78.4645, weight: 4 },
  { id: "kukatpally", label: "Kukatpally", lat: 17.4849, lng: 78.4138, weight: 4 },
  { id: "secunderabad", label: "Secunderabad", lat: 17.4399, lng: 78.4983, weight: 3 },
] as const;

export type AreaId = (typeof AREAS)[number]["id"];

export const AREA_ORDER = AREAS.map((a) => ({
  id: a.id as AreaId,
  label: a.label,
  lat: a.lat,
  lng: a.lng,
  size: a.weight,
}));

export const AREA_LABEL: Record<string, string> = Object.fromEntries(AREAS.map((a) => [a.id, a.label]));

// ──────────────────────────────────────────────────────── the vocabulary

/**
 * The same six subjects as the event, deliberately.
 *
 * An admin who runs both a group and its meetups should see one product
 * with two front doors, not two products. Where the vocabulary diverges
 * is in the asks themselves: a group gets asked things nobody says out
 * loud at a mixer, because there is no eye contact and no three-hour
 * limit.
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
    "an intro to a seed fund that has done climate hardware",
    "someone who has closed a bridge without a lead investor",
    "an honest read on whether we are ready to raise",
    "an angel who understands long sales cycles",
  ],
  hiring: [
    "a senior backend engineer who has done payments",
    "my first design hire, part-time to start",
    "someone who has hired in Hyderabad without a recruiter",
    "a founding GTM person who will do outbound themselves",
  ],
  customers: [
    "intros to hospital procurement teams",
    "my first three enterprise logos",
    "design partners for an early beta",
    "anyone who has sold to Indian manufacturers",
  ],
  product: [
    "a brutal review of our onboarding",
    "help naming the thing we have built",
    "someone who has taken a product 0 to 1 twice",
    "a second opinion on our pricing page",
  ],
  tech: [
    "advice on moving off a managed database",
    "someone who has run inference at scale cheaply",
    "a technical co-founder, ML, for something new",
    "an honest read on our architecture before we scale it",
  ],
  gtm: [
    "a playbook for outbound that is not spam",
    "someone who has done community-led growth",
    "help pricing a seat-based product",
    "a partner for a joint launch in Q1",
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

const BIOS = [
  "Second company. The first one taught me what not to build.",
  "Ten years an operator, eighteen months a founder, still adjusting.",
  "I like the unglamorous half — pricing, support, the second hundred customers.",
  "Left a large company to find out if I could do it without the logo.",
  "Mostly interested in the gap between what we ship and what people feel.",
  "Technical by training, commercial by necessity.",
  "Spent a year saying no to the wrong customers. Worth it.",
  "In this group since the beginning. Mostly reading.",
];

// ─────────────────────────────────────────────────────────────── members

/**
 * How much of somebody the group chat has ever surfaced.
 *
 * Not a measure of how good a member they are — a measure of how well
 * the medium works. `quiet` is the majority in every large group and it
 * is the single most valuable segment on this map, because those people
 * have never been visible to anybody and several of them can answer the
 * question somebody asked on Tuesday.
 */
export type Voice = "active" | "quiet" | "new";

export const VOICE: Record<Voice, { label: string; colour: string; hint: string }> = {
  active: { label: "Posts regularly", colour: "var(--good)", hint: "You have seen them in the chat." },
  quiet: { label: "Rarely posts", colour: "var(--ink-soft)", hint: "Reads everything. The group has never heard from them." },
  new: { label: "Joined this month", colour: "var(--brand)", hint: "Arrived recently and has not said hello yet." },
};

export type Member = {
  id: string;
  name: string;
  role: string;
  company: string;
  area: AreaId;
  /** Their place in the locality's reading order. The view turns it into a cell. */
  seat: number;
  lat: number;
  lng: number;
  askTopic: TopicId;
  ask: string;
  offerTopic: TopicId;
  offer: string;
  voice: Voice;
  /** Messages sent in the group this month. Zero is the common case. */
  posts: number;
  /**
   * Whether they have said they will take a direct message.
   *
   * The one genuinely actionable fact on a community map, and the thing
   * a WhatsApp group makes impossible: everybody's number is visible to
   * everybody, which means nobody knows who actually wants to be
   * contacted, which means almost nobody is. Opting in once turns a
   * directory of phone numbers into a list of people you may approach.
   */
  openToMeet: boolean;
  joined: string;
  bio: string;
};

function buildMembers(): Member[] {
  const out: Member[] = [];
  let i = 0;
  for (const area of AREAS) {
    for (let seat = 0; seat < area.weight; seat++, i++) {
      const askTopic = TOPICS[rnd(`c-at-${i}`) % TOPICS.length].id;
      /** Never the same topic on both sides: a card that asks and offers
       *  the same thing says nothing about why two people should talk. */
      const offerPool = TOPICS.filter((t) => t.id !== askTopic);
      const offerTopic = offerPool[rnd(`c-ot-${i}`) % offerPool.length].id;
      const v = rnd(`c-v-${i}`) % 100;
      /** Twelve of fifty do the talking, which is the number every admin
       *  recognises and the reason this page exists. */
      const voice: Voice = v < 24 ? "active" : v < 86 ? "quiet" : "new";
      out.push({
        id: `m-${i}`,
        name: `${GIVEN[rnd(`c-g-${i}`) % GIVEN.length]} ${FAMILY[rnd(`c-f-${i}`) % FAMILY.length]}`,
        role: ROLES[rnd(`c-r-${i}`) % ROLES.length],
        company: COMPANIES[rnd(`c-c-${i}`) % COMPANIES.length],
        area: area.id,
        seat,
        /* A deterministic offset inside the locality, so "near me" is a
           real sort rather than eight people tied at zero. Roughly a
           kilometre either way — the size of a neighbourhood, which is
           the precision anybody actually wants published. */
        lat: area.lat + ((rnd(`c-la-${i}`) % 200) - 100) / 12000,
        lng: area.lng + ((rnd(`c-ln-${i}`) % 200) - 100) / 12000,
        askTopic,
        ask: ASKS[askTopic][rnd(`c-ax-${i}`) % ASKS[askTopic].length],
        offerTopic,
        offer: OFFERS[offerTopic][rnd(`c-ofx-${i}`) % OFFERS[offerTopic].length],
        voice,
        posts: voice === "active" ? 6 + (rnd(`c-p-${i}`) % 40) : voice === "new" ? 0 : rnd(`c-p-${i}`) % 3,
        /* Most people will take a message; the map's job is to say which,
           not to assume. */
        openToMeet: rnd(`c-om-${i}`) % 100 < 68,
        joined: voice === "new" ? "this month" : `${1 + (rnd(`c-j-${i}`) % 19)} months ago`,
        bio: BIOS[rnd(`c-b-${i}`) % BIOS.length],
      });
    }
  }
  return out;
}

export const MEMBERS: Member[] = buildMembers();

export const memberById = (id: string): Member | undefined => MEMBERS.find((m) => m.id === id);

/**
 * You, in this community.
 *
 * A fixed visitor rather than a sign-up: the page exists to be opened
 * from a link in a pitch, and a form in front of the thing being pitched
 * loses most of the people it is meant to persuade.
 */
export const YOU = {
  id: "you",
  name: "You",
  role: "Founder",
  company: "—",
  area: "gachibowli" as AreaId,
  lat: 17.4401,
  lng: 78.3489,
  askTopic: "hiring" as TopicId,
  ask: "a technical co-founder, ML, for something new",
  offerTopic: "gtm" as TopicId,
  offer: "go-to-market for a technical founder",
};

export const kmFromYou = (m: Member, from: { lat: number; lng: number } = YOU): number =>
  distanceKm(from.lat, from.lng, m.lat, m.lng);

/** One decimal under ten kilometres, whole numbers after — nobody needs
 *  three significant figures to decide whether to suggest coffee. */
export const km = (d: number): string => (d < 10 ? `${d.toFixed(1)} km` : `${Math.round(d)} km`);

// ─────────────────────────────────────────────────────────── the matcher

/**
 * The same four tiers as the event, with distance as the tiebreak
 * instead of attendance.
 *
 * At an event the tiebreak is who is standing in the building right
 * now, because an introduction you can make in ten minutes beats one
 * you have to arrange. In a city nobody is ten minutes away by
 * definition, so the equivalent question is who you could plausibly have
 * coffee with this week — which is distance, and secondarily whether
 * they have said they will take a message at all.
 */
export type Tier = "mutual" | "they-help" | "you-help" | "none";

export const TIER: Record<Tier, { label: string; colour: string; rank: number }> = {
  mutual: { label: "Both ways", colour: "var(--good)", rank: 3 },
  "they-help": { label: "They can help you", colour: "#d99a00", rank: 2 },
  "you-help": { label: "You can help them", colour: "var(--brand)", rank: 1 },
  none: { label: "No overlap", colour: "var(--ink-soft)", rank: 0 },
};

export type Match = {
  a: Member;
  tier: Tier;
  score: number;
  reason: string;
  /** The first line, already written. See `opener`. */
  opener: string;
  distance: number;
};

const label = (t: TopicId) => TOPICS.find((x) => x.id === t)?.label.toLowerCase() ?? t;
const firstName = (name: string) => name.split(" ")[0];

/**
 * The first message, drafted from the overlap and the map.
 *
 * The step everybody stalls on is not deciding who to talk to, it is the
 * opening sentence — which is why a matcher that stops at a name has
 * done about half the job. These are built only from facts both people
 * have published, so a draft can never claim a connection neither of
 * them stated.
 *
 * The one addition over the event's version is the place. "I'm in
 * Gachibowli too" is the sentence that turns a group member into a
 * coffee, and it is available here and nowhere in WhatsApp.
 */
function opener(a: Member, you: typeof YOU, tier: Tier, near: boolean): string {
  const n = firstName(a.name);
  const where = near ? ` We're both in ${AREA_LABEL[a.area]} — coffee this week?` : " Happy to do a call.";
  if (tier === "mutual")
    return `Hi ${n} — we're in Hyderabad Founders together. I'm after ${you.ask}, and ${label(
      a.offerTopic
    )} is your thing. I can probably help with ${label(you.offerTopic)}, which looks like what you're looking for.${where}`;
  if (tier === "they-help")
    return `Hi ${n} — from the Hyderabad Founders group. You mentioned ${a.offer}, which is exactly what I'm stuck on.${where}`;
  if (tier === "you-help")
    return `Hi ${n} — from Hyderabad Founders. Saw you're looking for ${a.ask}. I've done some of that and I'm glad to talk it through.${where}`;
  return `Hi ${n} — we're in the Hyderabad Founders group together. Thought I'd say hello properly.`;
}

export function matchOf(a: Member, you: typeof YOU = YOU): Match {
  const theyHelpYou = a.offerTopic === you.askTopic;
  const youHelpThem = a.askTopic === you.offerTopic;
  const tier: Tier = theyHelpYou && youHelpThem ? "mutual" : theyHelpYou ? "they-help" : youHelpThem ? "you-help" : "none";
  const distance = kmFromYou(a, you);
  const near = distance < 4;

  const reason =
    tier === "mutual"
      ? `You're after ${label(you.askTopic)} and they do it — and they want ${label(you.offerTopic)}, which is yours.`
      : tier === "they-help"
        ? `You're looking for ${label(you.askTopic)}. They can help with ${a.offer}.`
        : tier === "you-help"
          ? `They're looking for ${a.ask} — that's what you offer.`
          : `No overlap stated, but they're in the group.`;

  /**
   * Close enough for coffee is worth about as much as one tier, and an
   * opt-in to be messaged is worth slightly more — a perfect match who
   * has not said they want contacting is not a match you can act on.
   */
  const near5 = Math.max(0, 1 - distance / 12) * 0.5;
  return {
    a,
    tier,
    score: TIER[tier].rank + near5 + (a.openToMeet ? 0.6 : 0),
    reason,
    opener: opener(a, you, tier, near),
    distance,
  };
}

export function matchesFor(you: typeof YOU = YOU, pool: Member[] = MEMBERS, limit = 6): Match[] {
  return pool
    .map((a) => matchOf(a, you))
    .filter((m) => m.tier !== "none")
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}

// ──────────────────────────────────────────────────────────────── feed

/**
 * The group chat, with the receipts.
 *
 * This is the part of the demo that sells, and it only works because it
 * is unflattering. Every item is a real thing somebody typed into a
 * WhatsApp group; `replies` is what it got; `couldHaveHelped` is how
 * many people on this map had already published the matching offer and
 * never saw the question, because it arrived at 11pm between a poll and
 * a good-morning sticker.
 *
 * An admin reads this and recognises their own group immediately. That
 * recognition is the entire pitch — the map is not a nicer directory,
 * it is the answer to a loss they are already taking.
 */
export type FeedItem = {
  id: string;
  who: Member;
  text: string;
  ago: string;
  replies: number;
  /** The topic the ask belongs to, so the view can count who could answer. */
  topic: TopicId | null;
};

const POSTS: Array<{ text: string; replies: number; topic: TopicId | null; ago: string }> = [
  {
    text: "Does anyone here know hospital procurement? We keep getting to the last stage and stalling. Genuinely stuck.",
    replies: 0,
    topic: "customers",
    ago: "3 weeks ago",
  },
  {
    text: "Good morning everyone 🌸",
    replies: 14,
    topic: null,
    ago: "2 weeks ago",
  },
  {
    text: "Looking for a senior backend engineer who has worked on payments. Hyderabad or remote. Will pay well.",
    replies: 1,
    topic: "hiring",
    ago: "11 days ago",
  },
  {
    text: "Can someone share the deck template from the last session? 🙏",
    replies: 9,
    topic: null,
    ago: "8 days ago",
  },
  {
    text: "Moving off a managed database before it eats our whole runway. Has anyone done this without downtime?",
    replies: 0,
    topic: "tech",
    ago: "6 days ago",
  },
  {
    text: "If you are raising right now and want a brutal read on your deck, my DMs are open this weekend.",
    replies: 3,
    topic: "funding",
    ago: "4 days ago",
  },
  {
    text: "Anyone selling into Indian manufacturers? Trying to work out if our pricing is insane or just early.",
    replies: 0,
    topic: "gtm",
    ago: "yesterday",
  },
];

export const FEED: FeedItem[] = POSTS.map((p, i) => ({
  id: `cp-${i}`,
  who: MEMBERS[rnd(`c-fw-${i}`) % MEMBERS.length],
  ...p,
}));

/** How many members published an offer that answers this ask. */
export const couldHaveHelped = (item: FeedItem): number =>
  item.topic ? MEMBERS.filter((m) => m.offerTopic === item.topic).length : 0;

// ─────────────────────────────────────────────────────────────── chats

export type Line = { from: "them" | "me"; text: string; ago: string };

/**
 * Conversations already in flight, because an empty inbox is the worst
 * thing to show somebody you are trying to persuade.
 *
 * Each ends where a group chat cannot: a named place and a time. That
 * last line is the pitch in miniature — the group has had all fifty of
 * these people in it for a year and produced none of these meetings.
 */
export const THREADS: Array<{ withId: string; lines: Line[]; unread: boolean }> = [
  {
    withId: "m-4",
    unread: true,
    lines: [
      {
        from: "me",
        text: "Hi — from the Hyderabad Founders group. You mentioned interview loops that don't waste a week, which is exactly what I'm stuck on. We're both in Gachibowli — coffee this week?",
        ago: "2d",
      },
      {
        from: "them",
        text: "Ha — I've been in that group for a year and never posted once. Yes, happy to. We cut ours from five rounds to two and hired faster.",
        ago: "2d",
      },
      { from: "me", text: "Thursday morning? There's a decent place near DLF.", ago: "1d" },
      { from: "them", text: "Thursday 9am works. I'll bring the scorecard we use.", ago: "1d" },
    ],
  },
  {
    withId: "m-21",
    unread: true,
    lines: [
      {
        from: "them",
        text: "Saw you're looking for a technical co-founder with ML. I'm not available but I ran a team doing exactly that, and there are two people in this group who might be — neither of them has ever posted, so you'd never have found them.",
        ago: "5h",
      },
      { from: "me", text: "That is extremely useful. Are they both in Hyderabad?", ago: "3h" },
      { from: "them", text: "One in Kondapur, one in Jubilee Hills. I'll introduce you to both.", ago: "2h" },
    ],
  },
  {
    withId: "m-33",
    unread: false,
    lines: [
      {
        from: "me",
        text: "Hi — from Hyderabad Founders. You asked about hospital procurement three weeks ago and nobody replied. I've done that twice and the second sale is very different to the first.",
        ago: "1w",
      },
      {
        from: "them",
        text: "Honestly I assumed nobody in the group did healthcare. Would love twenty minutes.",
        ago: "1w",
      },
      { from: "them", text: "That call was worth more than the last six months of the group chat, no offence to the group chat.", ago: "6d" },
    ],
  },
];
