/**
 * The network hierarchy — prototype data only, no schema or API behind it.
 *
 *   Public Network  (all-encompassing — everyone on the map, no membership)
 *     └── Networks   (IIT Bombay, ISB, Stanford, Ex-Google, … — you're in ~20)
 *           └── Groups   (a group ALWAYS belongs to one network: "Bay Area Chapter")
 *     └── Clubs      (independent — belong to no network: "Weekend Hikers")
 *
 * Every one of those levels — public included — has its own feed you can
 * post to and its own membership you can join.
 */

import { hashSeed } from "./prototypeData";

export type NetworkKind = "institution" | "employer" | "professional";

export type MockNetwork = {
  id: string;
  name: string;
  kind: NetworkKind;
  memberCountMock: number;
  missionMock: string;
  /** Institutions and employers have a real campus/office, so they earn a map pin. Professional networks usually don't. */
  place?: { city: string; lat: number; lng: number };
};

/** Groups and clubs share a shape; the parent is what separates them. A group must have a network; a club must not. */
export type MockGroup = {
  id: string;
  name: string;
  /** null = an independent club, belonging to no network. */
  networkId: string | null;
  memberCountMock: number;
  blurbMock: string;
};

export type MockPost = {
  id: string;
  /** "public", or a network / group / club id — the feed this belongs to. */
  entityId: string;
  author: string;
  body: string;
  dateLabel: string;
};

export const PUBLIC_ENTITY_ID = "public";

export const NETWORK_KIND_LABEL: Record<NetworkKind, string> = {
  institution: "University",
  employer: "Employer alumni",
  professional: "Professional network",
};

export const NETWORK_KIND_EMOJI: Record<NetworkKind, string> = {
  institution: "🎓",
  employer: "🏢",
  professional: "🧭",
};

export const MOCK_NETWORKS: MockNetwork[] = [
  // --- Institutions
  { id: "net-iitb", name: "IIT Bombay", kind: "institution", memberCountMock: 12400, missionMock: "IIT Bombay graduates building and leading across the world.", place: { city: "Mumbai", lat: 19.1334, lng: 72.9133 } },
  { id: "net-isb", name: "Indian School of Business", kind: "institution", memberCountMock: 8600, missionMock: "ISB graduates across product, strategy, and venture.", place: { city: "Hyderabad", lat: 17.4239, lng: 78.3413 } },
  { id: "net-stanford", name: "Stanford University", kind: "institution", memberCountMock: 15100, missionMock: "Stanford alumni building and connecting worldwide.", place: { city: "Stanford, CA", lat: 37.4275, lng: -122.1697 } },
  { id: "net-bits", name: "BITS Pilani", kind: "institution", memberCountMock: 9300, missionMock: "BITSians in tech, research, and startups everywhere.", place: { city: "Pilani", lat: 28.3639, lng: 75.5869 } },
  { id: "net-nitt", name: "NIT Trichy", kind: "institution", memberCountMock: 6100, missionMock: "NIT Trichy alumni across engineering and product.", place: { city: "Tiruchirappalli", lat: 10.7596, lng: 78.8148 } },
  { id: "net-hbs", name: "Harvard Business School", kind: "institution", memberCountMock: 11200, missionMock: "HBS alumni in operating, investing, and founding roles.", place: { city: "Boston", lat: 42.3663, lng: -71.1222 } },

  // --- Employer alumni
  { id: "net-exgoogle", name: "Ex-Google", kind: "employer", memberCountMock: 5400, missionMock: "Former Googlers helping each other build what's next.", place: { city: "Bengaluru", lat: 12.9351, lng: 77.6947 } },
  { id: "net-exmsft", name: "Ex-Microsoft", kind: "employer", memberCountMock: 4100, missionMock: "Microsoft alumni across cloud, AI, and enterprise.", place: { city: "Hyderabad", lat: 17.4399, lng: 78.3489 } },
  { id: "net-exmck", name: "Ex-McKinsey", kind: "employer", memberCountMock: 3300, missionMock: "Ex-consultants now operating, founding, and investing." },
  { id: "net-exflipkart", name: "Ex-Flipkart", kind: "employer", memberCountMock: 3900, missionMock: "The Flipkart mafia — commerce, logistics, and fintech.", place: { city: "Bengaluru", lat: 12.9237, lng: 77.675 } },
  { id: "net-exstripe", name: "Ex-Stripe", kind: "employer", memberCountMock: 1800, missionMock: "Payments and infra people from the Stripe diaspora." },

  // --- Professional networks
  { id: "net-pm-india", name: "Product Managers India", kind: "professional", memberCountMock: 14200, missionMock: "Product people across India swapping craft and war stories." },
  { id: "net-women-product", name: "Women in Product", kind: "professional", memberCountMock: 16800, missionMock: "Product leaders supporting other women building product." },
  { id: "net-design-leaders", name: "Design Leaders India", kind: "professional", memberCountMock: 9100, missionMock: "Senior design leaders across India's product companies." },
  { id: "net-blr-founders", name: "Bengaluru Founders", kind: "professional", memberCountMock: 21000, missionMock: "Early-stage founders in Bengaluru trading notes and intros." },
  { id: "net-saas", name: "SaaS Founders Collective", kind: "professional", memberCountMock: 7600, missionMock: "B2B SaaS operators comparing pipeline, pricing, and churn." },
  { id: "net-climate", name: "Climate Tech Collective", kind: "professional", memberCountMock: 5200, missionMock: "Builders working on decarbonisation across hardware and software." },
  { id: "net-angels", name: "Angel Investors India", kind: "professional", memberCountMock: 4400, missionMock: "Active angels sharing deal flow and diligence notes." },
  { id: "net-hyd-tech", name: "Hyderabad Tech Circle", kind: "professional", memberCountMock: 6700, missionMock: "The HITEC City crowd — engineers, founders, and operators." },
  { id: "net-yc", name: "Y Combinator Alumni", kind: "professional", memberCountMock: 8800, missionMock: "YC founders across batches, hiring and helping each other." },
];

/** Groups — each one belongs to exactly one network. */
export const MOCK_GROUPS: MockGroup[] = [
  { id: "grp-iitb-bay", networkId: "net-iitb", name: "Bay Area Chapter", memberCountMock: 980, blurbMock: "IITB alumni around San Francisco and the peninsula." },
  { id: "grp-iitb-blr", networkId: "net-iitb", name: "Bengaluru Chapter", memberCountMock: 1640, blurbMock: "The largest IITB chapter outside Mumbai." },
  { id: "grp-iitb-08", networkId: "net-iitb", name: "Class of 2008", memberCountMock: 410, blurbMock: "Batchmates keeping the hostel group chat alive since '08." },
  { id: "grp-iitb-founders", networkId: "net-iitb", name: "IITB Founders", memberCountMock: 720, blurbMock: "Alumni who've started something — seed to Series C." },

  { id: "grp-isb-co19", networkId: "net-isb", name: "Co '19", memberCountMock: 580, blurbMock: "The 2019 cohort, still arguing about the same case studies." },
  { id: "grp-isb-product", networkId: "net-isb", name: "ISB Product Club", memberCountMock: 390, blurbMock: "ISB grads who went into product rather than consulting." },
  { id: "grp-isb-investors", networkId: "net-isb", name: "ISB Investors", memberCountMock: 260, blurbMock: "Alumni writing cheques — angel through growth." },

  { id: "grp-stan-gsb", networkId: "net-stanford", name: "GSB Alumni", memberCountMock: 2100, blurbMock: "Graduate School of Business alumni worldwide." },
  { id: "grp-stan-india", networkId: "net-stanford", name: "Stanford in India", memberCountMock: 640, blurbMock: "Alumni who've moved back or are building in India." },
  { id: "grp-stan-climate", networkId: "net-stanford", name: "Stanford Climate", memberCountMock: 480, blurbMock: "Alumni working on climate across hardware, policy, and capital." },

  { id: "grp-exg-blr", networkId: "net-exgoogle", name: "Bengaluru Xooglers", memberCountMock: 860, blurbMock: "Ex-Googlers in and around Bengaluru." },
  { id: "grp-exg-founders", networkId: "net-exgoogle", name: "Xoogler Founders", memberCountMock: 540, blurbMock: "Left to start something — comparing notes on the jump." },

  { id: "grp-wip-mentor", networkId: "net-women-product", name: "Mentorship Circle", memberCountMock: 1200, blurbMock: "Structured mentor pairings, two cohorts a year." },
  { id: "grp-wip-leaders", networkId: "net-women-product", name: "Senior Leaders", memberCountMock: 640, blurbMock: "Director-and-above product leaders, closed-door discussions." },

  { id: "grp-blrf-seed", networkId: "net-blr-founders", name: "Pre-seed & Seed", memberCountMock: 1800, blurbMock: "Founders at the raw end — first cheques, first hires." },
  { id: "grp-blrf-b2b", networkId: "net-blr-founders", name: "B2B SaaS", memberCountMock: 1340, blurbMock: "Selling to businesses, mostly from Bengaluru to the US." },
];

/** Clubs — independent, no parent network. */
export const MOCK_CLUBS: MockGroup[] = [
  { id: "club-hikers", networkId: null, name: "Weekend Hikers", memberCountMock: 320, blurbMock: "Trail-first, work-second — a standing Saturday hike." },
  { id: "club-bookclub", networkId: null, name: "Founders' Book Club", memberCountMock: 150, blurbMock: "One business book a month, one dinner to argue about it." },
  { id: "club-run", networkId: null, name: "Sunday Run Club", memberCountMock: 260, blurbMock: "10k every Sunday, coffee immediately after." },
  { id: "club-boardgames", networkId: null, name: "Board Game Nights", memberCountMock: 110, blurbMock: "Heavy euros and light trash-talk, every other Friday." },
];

export const ALL_GROUPS_AND_CLUBS: MockGroup[] = [...MOCK_GROUPS, ...MOCK_CLUBS];

export function networkById(id: string): MockNetwork | undefined {
  return MOCK_NETWORKS.find((n) => n.id === id);
}

export function groupById(id: string): MockGroup | undefined {
  return ALL_GROUPS_AND_CLUBS.find((g) => g.id === id);
}

export function groupsOfNetwork(networkId: string): MockGroup[] {
  return MOCK_GROUPS.filter((g) => g.networkId === networkId);
}

export function isClub(g: MockGroup): boolean {
  return g.networkId === null;
}

export const MOCK_POSTS: MockPost[] = [
  // Public — the all-encompassing feed
  { id: "post-pub-1", entityId: PUBLIC_ENTITY_ID, author: "Sarah Chen", body: "In Bengaluru all next week — happy to meet anyone building in B2B infra.", dateLabel: "3h ago" },
  { id: "post-pub-2", entityId: PUBLIC_ENTITY_ID, author: "Kwame Asante", body: "Looking for intros to payments folks in Nairobi or Lagos. Will trade notes on informal-market rails.", dateLabel: "yesterday" },
  { id: "post-pub-3", entityId: PUBLIC_ENTITY_ID, author: "Elin Berg", body: "Anyone in Stockholm up for a climate-hardware coffee on Thursday?", dateLabel: "2 days ago" },

  // Networks
  { id: "post-iitb-1", entityId: "net-iitb", author: "Rhea Kapoor", body: "Powai meet is on for Nov 8 — bring a +1, first round's on the network.", dateLabel: "2 days ago" },
  { id: "post-iitb-2", entityId: "net-iitb", author: "Arjun Bose", body: "Hiring two infra engineers in Bengaluru. Alumni referrals jump the queue.", dateLabel: "5 days ago" },
  { id: "post-isb-1", entityId: "net-isb", author: "Priya Raman", body: "Putting together a product-vs-consulting panel for the winter reunion. Volunteers?", dateLabel: "1 day ago" },
  { id: "post-stanford-1", entityId: "net-stanford", author: "Jordan Lee", body: "SF social on Nov 14 at The Battery — alums from every era welcome.", dateLabel: "4 days ago" },
  { id: "post-exgoogle-1", entityId: "net-exgoogle", author: "Meera Pillai", body: "Mixer at Toit on Nov 6 — RSVP so we can hold the back room.", dateLabel: "1 day ago" },
  { id: "post-blrf-1", entityId: "net-blr-founders", author: "Vikram Shah", body: "Third Wave on Saturday — come swap fundraising war stories.", dateLabel: "3 days ago" },
  { id: "post-wip-1", entityId: "net-women-product", author: "Nandini Rao", body: "Mentorship sign-ups open — 20 pairings this cohort, closing Friday.", dateLabel: "5 days ago" },
  { id: "post-yc-1", entityId: "net-yc", author: "Rohit Agarwal", body: "W26 applications close soon — happy to read anyone's application draft.", dateLabel: "6 days ago" },

  // Groups inside networks
  { id: "post-iitb-bay-1", entityId: "grp-iitb-bay", author: "Marcus Webb", body: "Palo Alto dinner on the 22nd — 12 seats, reply to claim one.", dateLabel: "1 day ago" },
  { id: "post-iitb-blr-1", entityId: "grp-iitb-blr", author: "Divya Menon", body: "Chapter brunch moved to Koramangala — new spot has actual parking.", dateLabel: "4 days ago" },
  { id: "post-isb-product-1", entityId: "grp-isb-product", author: "Vikram Nair", body: "Doing a teardown of three Indian fintech onboarding flows next Tuesday.", dateLabel: "2 days ago" },
  { id: "post-stan-gsb-1", entityId: "grp-stan-gsb", author: "Emma Whitfield", body: "London GSB drinks — first Thursday of every month, same pub.", dateLabel: "1 week ago" },
  { id: "post-blrf-seed-1", entityId: "grp-blrf-seed", author: "Farhan Qureshi", body: "Sharing our pre-seed deck template — DM and I'll send it over.", dateLabel: "3 days ago" },

  // Clubs
  { id: "post-hikers-1", entityId: "club-hikers", author: "Rohan Mehta", body: "Nandi Hills this Saturday, 5am start. Bring a torch.", dateLabel: "2 days ago" },
  { id: "post-bookclub-1", entityId: "club-bookclub", author: "Tara Bhatt", body: "This month: The Hard Thing About Hard Things. Dinner on the 28th.", dateLabel: "1 week ago" },
];

/**
 * Curated memberships, so the flagship networks always have a genuinely
 * worldwide roster instead of whatever a hash happens to produce. These
 * names come from the seeded demo population (scripts/seed.mjs), picked to
 * span continents.
 */
const CURATED: Record<string, string[]> = {
  "net-iitb": ["Arjun Bose", "Dev Chandran", "Meera Pillai", "Divya Menon", "Imran Baig", "Suresh Pai", "Marcus Webb", "Wei Zhang", "Gabriel Souza", "Jiwoo Kim"],
  "net-isb": ["Priya Raman", "Vikram Nair", "Tara Bhatt", "Nisha Reddy", "Pranathi Rao", "Tejaswini Rao", "Sarah Chen", "Priyanka Malhotra", "Hana Al-Rashid", "Amara Njoroge"],
  "net-stanford": ["Rohan Mehta", "Kabir Singh", "Ananya Krishnan", "Rohit Agarwal", "Emma Whitfield", "Aiko Tanaka", "Olivia Bennett", "Noah Fortin", "Elin Berg", "Diego Fernández"],
};

function curatedNetworkIdsFor(name: string): string[] {
  return Object.entries(CURATED)
    .filter(([, names]) => names.includes(name))
    .map(([id]) => id);
}

/** Which networks a given person belongs to — 2–4 from a stable name hash, plus any curated ones. */
export function networksForName(name: string): MockNetwork[] {
  const h = hashSeed(name);
  const ids = new Set<string>(curatedNetworkIdsFor(name));
  const count = 2 + (h % 3);
  for (let i = 0; i < count; i++) {
    ids.add(MOCK_NETWORKS[(h >>> (i * 3)) % MOCK_NETWORKS.length].id);
  }
  return MOCK_NETWORKS.filter((n) => ids.has(n.id));
}

/** Which groups and clubs a person is in — groups only from networks they're actually in, plus the occasional independent club. */
export function groupsForName(name: string): MockGroup[] {
  const h = hashSeed(name);
  const out: MockGroup[] = [];
  for (const n of networksForName(name)) {
    const groups = groupsOfNetwork(n.id);
    if (groups.length === 0) continue;
    if ((h + n.id.length) % 3 === 0) continue;
    out.push(groups[(h >>> 2) % groups.length]);
  }
  for (const c of MOCK_CLUBS) {
    if ((h + c.id.length) % 6 === 0) out.push(c);
  }
  return out;
}

/** Real filters over whichever profiles are loaded — not fabricated rosters. */
export function membersOfNetwork<T extends { name: string }>(people: T[], networkId: string): T[] {
  return people.filter((p) => networksForName(p.name).some((n) => n.id === networkId));
}

export function membersOfGroup<T extends { name: string }>(people: T[], groupId: string): T[] {
  return people.filter((p) => groupsForName(p.name).some((g) => g.id === groupId));
}

// ------------------------------------------------------------ my membership

const MY_NETWORKS_KEY = "mp_my_networks";
const MY_GROUPS_KEY = "mp_my_groups";

/** You're in all twenty out of the box, so the selector has something real in it from the first look. All of it is joinable/leavable on your profile. */
const DEFAULT_MY_NETWORK_IDS = MOCK_NETWORKS.map((n) => n.id);
const DEFAULT_MY_GROUP_IDS = ["grp-iitb-bay", "grp-isb-product", "grp-stan-gsb", "club-hikers"];

function readIds(key: string, fallback: string[]): string[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : fallback;
  } catch {
    return fallback;
  }
}

function writeIds(key: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Private browsing or storage disabled — membership just won't persist across reloads.
  }
}

export function getMyNetworkIds(): string[] {
  return readIds(MY_NETWORKS_KEY, DEFAULT_MY_NETWORK_IDS);
}

export function setMyNetworkIds(ids: string[]): void {
  writeIds(MY_NETWORKS_KEY, ids);
}

export function getMyGroupIds(): string[] {
  return readIds(MY_GROUPS_KEY, DEFAULT_MY_GROUP_IDS);
}

export function setMyGroupIds(ids: string[]): void {
  writeIds(MY_GROUPS_KEY, ids);
}
