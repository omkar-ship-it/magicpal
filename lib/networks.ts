/**
 * The network tree — prototype data only, no schema or API behind it.
 *
 * There is no fixed hierarchy. Every node is the same shape and carries its
 * own labels, so each institution configures its own depth and vocabulary:
 *
 *   TiE Global → Regions → Chapters → Programmes     (4 levels)
 *   ISB        → Programmes → Classes                (3 levels)
 *   IIT Bombay → Chapters → Groups                   (3 levels)
 *   Weekend Hikers                                   (1 level, no parent — a club)
 *
 * `label` is what a node calls *itself*; `childLabel` is what it calls its
 * children. That's the whole configuration surface.
 *
 * Chapter and programme lists for real organisations here are illustrative
 * demo data, not an authoritative roster.
 */

import { hashSeed } from "./prototypeData";

export type MockEntity = {
  id: string;
  name: string;
  /** null = top level: either a network, or an independent club with no parent at all. */
  parentId: string | null;
  /** What this node is, in the institution's own words: "Network", "Region", "Chapter", "Programme", "Class", "Group", "Club". */
  label: string;
  /** Plural term this node uses for its children. Absent means it's a leaf. */
  childLabel?: string;
  emoji: string;
  memberCountMock: number;
  blurbMock: string;
  /** A real campus, office, or chapter city earns a map pin. */
  place?: { city: string; lat: number; lng: number };
};

export const PUBLIC_ENTITY_ID = "public";

function node(
  id: string,
  name: string,
  parentId: string | null,
  label: string,
  emoji: string,
  memberCountMock: number,
  blurbMock: string,
  opts: { childLabel?: string; place?: { city: string; lat: number; lng: number } } = {}
): MockEntity {
  return { id, name, parentId, label, emoji, memberCountMock, blurbMock, ...opts };
}

/** TiE chapter shorthand — every chapter is the same shape, just a different city. */
function tieChapter(slug: string, name: string, regionId: string, city: string, lat: number, lng: number, members: number): MockEntity {
  return node(`tie-${slug}`, name, regionId, "Chapter", "📍", members, `TiE's ${city} chapter — mentoring, funding, and founder events.`, {
    childLabel: "Programmes",
    place: { city, lat, lng },
  });
}

/** Every TiE chapter runs the same four flagship programmes, so they're generated rather than written out 220 times. */
function tiePrograms(chapterSlug: string, chapterName: string): MockEntity[] {
  const parent = `tie-${chapterSlug}`;
  const short = chapterName.replace(/^TiE /, "");
  return [
    node(`tie-${chapterSlug}-women`, `TiE Women ${short}`, parent, "Programme", "👩‍💼", 120 + (hashSeed(chapterSlug) % 300), "Backing women founders with mentoring, visibility, and capital."),
    node(`tie-${chapterSlug}-tye`, `TYE ${short}`, parent, "Programme", "🎒", 60 + (hashSeed(chapterSlug + "tye") % 180), "TiE Young Entrepreneurs — the schools programme for teenage founders."),
    node(`tie-${chapterSlug}-angels`, `TiE Angels ${short}`, parent, "Programme", "💰", 40 + (hashSeed(chapterSlug + "ang") % 120), "The chapter's angel investing group — syndicated early cheques."),
    node(`tie-${chapterSlug}-charter`, `Charter Members ${short}`, parent, "Programme", "⭐", 30 + (hashSeed(chapterSlug + "cm") % 90), "Charter Members — the chapter's mentors and senior operators."),
  ];
}

const TIE_CHAPTERS: Array<[string, string, string, string, number, number, number]> = [
  // slug, name, regionId, city, lat, lng, members
  // --- South Asia
  ["bangalore", "TiE Bangalore", "tie-southasia", "Bengaluru", 12.9716, 77.5946, 2400],
  ["delhi", "TiE Delhi-NCR", "tie-southasia", "New Delhi", 28.6139, 77.209, 2900],
  ["mumbai", "TiE Mumbai", "tie-southasia", "Mumbai", 19.076, 72.8777, 2100],
  ["hyderabad", "TiE Hyderabad", "tie-southasia", "Hyderabad", 17.385, 78.4867, 1900],
  ["chennai", "TiE Chennai", "tie-southasia", "Chennai", 13.0827, 80.2707, 1400],
  ["pune", "TiE Pune", "tie-southasia", "Pune", 18.5204, 73.8567, 1300],
  ["ahmedabad", "TiE Ahmedabad", "tie-southasia", "Ahmedabad", 23.0225, 72.5714, 1100],
  ["kolkata", "TiE Kolkata", "tie-southasia", "Kolkata", 22.5726, 88.3639, 820],
  ["kerala", "TiE Kerala", "tie-southasia", "Kochi", 9.9312, 76.2673, 760],
  ["chandigarh", "TiE Chandigarh", "tie-southasia", "Chandigarh", 30.7333, 76.7794, 540],
  ["jaipur", "TiE Rajasthan", "tie-southasia", "Jaipur", 26.9124, 75.7873, 620],
  ["indore", "TiE Indore", "tie-southasia", "Indore", 22.7196, 75.8577, 410],
  ["nagpur", "TiE Nagpur", "tie-southasia", "Nagpur", 21.1458, 79.0882, 330],
  ["coimbatore", "TiE Coimbatore", "tie-southasia", "Coimbatore", 11.0168, 76.9558, 450],
  ["lucknow", "TiE Lucknow", "tie-southasia", "Lucknow", 26.8467, 80.9462, 290],
  ["bhubaneswar", "TiE Bhubaneswar", "tie-southasia", "Bhubaneswar", 20.2961, 85.8245, 260],
  ["surat", "TiE Surat", "tie-southasia", "Surat", 21.1702, 72.8311, 380],
  ["vadodara", "TiE Vadodara", "tie-southasia", "Vadodara", 22.3072, 73.1812, 310],
  ["goa", "TiE Goa", "tie-southasia", "Panaji", 15.4909, 73.8278, 240],
  ["mysore", "TiE Mysore", "tie-southasia", "Mysuru", 12.2958, 76.6394, 210],
  ["colombo", "TiE Sri Lanka", "tie-southasia", "Colombo", 6.9271, 79.8612, 320],
  ["kathmandu", "TiE Nepal", "tie-southasia", "Kathmandu", 27.7172, 85.324, 280],
  ["dhaka", "TiE Dhaka", "tie-southasia", "Dhaka", 23.8103, 90.4125, 350],

  // --- North America
  ["siliconvalley", "TiE Silicon Valley", "tie-northamerica", "Santa Clara", 37.3541, -121.9552, 3200],
  ["boston", "TiE Boston", "tie-northamerica", "Boston", 42.3601, -71.0589, 1500],
  ["newyork", "TiE New York", "tie-northamerica", "New York", 40.7128, -74.006, 1700],
  ["seattle", "TiE Seattle", "tie-northamerica", "Seattle", 47.6062, -122.3321, 1200],
  ["atlanta", "TiE Atlanta", "tie-northamerica", "Atlanta", 33.749, -84.388, 980],
  ["chicago", "TiE Midwest", "tie-northamerica", "Chicago", 41.8781, -87.6298, 870],
  ["dallas", "TiE Dallas", "tie-northamerica", "Dallas", 32.7767, -96.797, 1050],
  ["houston", "TiE Houston", "tie-northamerica", "Houston", 29.7604, -95.3698, 920],
  ["losangeles", "TiE Los Angeles", "tie-northamerica", "Los Angeles", 34.0522, -118.2437, 1100],
  ["phoenix", "TiE Arizona", "tie-northamerica", "Phoenix", 33.4484, -112.074, 560],
  ["philadelphia", "TiE Philadelphia", "tie-northamerica", "Philadelphia", 39.9526, -75.1652, 640],
  ["dc", "TiE DC", "tie-northamerica", "Washington DC", 38.9072, -77.0369, 780],
  ["detroit", "TiE Detroit", "tie-northamerica", "Detroit", 42.3314, -83.0458, 430],
  ["minnesota", "TiE Minnesota", "tie-northamerica", "Minneapolis", 44.9778, -93.265, 390],
  ["colorado", "TiE Rockies", "tie-northamerica", "Denver", 39.7392, -104.9903, 420],
  ["florida", "TiE Florida", "tie-northamerica", "Miami", 25.7617, -80.1918, 610],
  ["carolinas", "TiE Carolinas", "tie-northamerica", "Charlotte", 35.2271, -80.8431, 480],
  ["oregon", "TiE Oregon", "tie-northamerica", "Portland", 45.5152, -122.6784, 350],
  ["toronto", "TiE Toronto", "tie-northamerica", "Toronto", 43.6532, -79.3832, 1150],
  ["ottawa", "TiE Ottawa", "tie-northamerica", "Ottawa", 45.4215, -75.6972, 330],
  ["vancouver", "TiE Vancouver", "tie-northamerica", "Vancouver", 49.2827, -123.1207, 540],
  ["calgary", "TiE Calgary", "tie-northamerica", "Calgary", 51.0447, -114.0719, 290],

  // --- Europe
  ["london", "TiE London", "tie-europe", "London", 51.5072, -0.1276, 1400],
  ["paris", "TiE Paris", "tie-europe", "Paris", 48.8566, 2.3522, 520],
  ["amsterdam", "TiE Amsterdam", "tie-europe", "Amsterdam", 52.3676, 4.9041, 460],
  ["frankfurt", "TiE Germany", "tie-europe", "Frankfurt", 50.1109, 8.6821, 580],
  ["stockholm", "TiE Nordics", "tie-europe", "Stockholm", 59.3293, 18.0686, 340],
  ["zurich", "TiE Switzerland", "tie-europe", "Zurich", 47.3769, 8.5417, 310],
  ["dublin", "TiE Ireland", "tie-europe", "Dublin", 53.3498, -6.2603, 280],

  // --- MENA & Africa
  ["dubai", "TiE Dubai", "tie-mena", "Dubai", 25.2048, 55.2708, 1300],
  ["abudhabi", "TiE Abu Dhabi", "tie-mena", "Abu Dhabi", 24.4539, 54.3773, 470],
  ["bahrain", "TiE Bahrain", "tie-mena", "Manama", 26.2285, 50.586, 260],
  ["nairobi", "TiE East Africa", "tie-mena", "Nairobi", -1.2921, 36.8219, 380],
  ["lagos", "TiE West Africa", "tie-mena", "Lagos", 6.5244, 3.3792, 420],
  ["cairo", "TiE Egypt", "tie-mena", "Cairo", 30.0444, 31.2357, 310],

  // --- Asia Pacific
  ["singapore", "TiE Singapore", "tie-apac", "Singapore", 1.3521, 103.8198, 1250],
  ["hongkong", "TiE Hong Kong", "tie-apac", "Hong Kong", 22.3193, 114.1694, 540],
  ["tokyo", "TiE Japan", "tie-apac", "Tokyo", 35.6762, 139.6503, 480],
  ["seoul", "TiE Korea", "tie-apac", "Seoul", 37.5665, 126.978, 360],
  ["kualalumpur", "TiE Malaysia", "tie-apac", "Kuala Lumpur", 3.139, 101.6869, 420],
  ["jakarta", "TiE Indonesia", "tie-apac", "Jakarta", -6.2088, 106.8456, 390],
  ["manila", "TiE Philippines", "tie-apac", "Manila", 14.5995, 120.9842, 330],
  ["bangkok", "TiE Thailand", "tie-apac", "Bangkok", 13.7563, 100.5018, 300],
  ["sydney", "TiE Sydney", "tie-apac", "Sydney", -33.8688, 151.2093, 760],
  ["melbourne", "TiE Melbourne", "tie-apac", "Melbourne", -37.8136, 144.9631, 640],
  ["perth", "TiE Perth", "tie-apac", "Perth", -31.9523, 115.8613, 290],
  ["auckland", "TiE New Zealand", "tie-apac", "Auckland", -36.8485, 174.7633, 270],
];

const TIE_TREE: MockEntity[] = [
  node("tie-global", "TiE Global", null, "Network", "🌐", 15000, "The Indus Entrepreneurs — fostering entrepreneurship through mentoring, networking, education, funding, and incubation.", {
    childLabel: "Regions",
    place: { city: "Santa Clara", lat: 37.3541, lng: -121.9552 },
  }),
  node("tie-southasia", "TiE South Asia", "tie-global", "Region", "🌏", 6200, "Chapters across India, Sri Lanka, Nepal, and Bangladesh.", { childLabel: "Chapters" }),
  node("tie-northamerica", "TiE North America", "tie-global", "Region", "🌎", 4100, "Chapters across the United States and Canada.", { childLabel: "Chapters" }),
  node("tie-europe", "TiE Europe", "tie-global", "Region", "🌍", 1600, "Chapters across the UK, EU, and Switzerland.", { childLabel: "Chapters" }),
  node("tie-mena", "TiE MENA & Africa", "tie-global", "Region", "🌍", 1400, "Chapters across the Gulf and Africa.", { childLabel: "Chapters" }),
  node("tie-apac", "TiE Asia Pacific", "tie-global", "Region", "🌏", 2300, "Chapters across East Asia, Southeast Asia, and Oceania.", { childLabel: "Chapters" }),
  ...TIE_CHAPTERS.map(([slug, name, region, city, lat, lng, members]) => tieChapter(slug, name, region, city, lat, lng, members)),
  // Only the larger chapters have their programmes mocked out, so the tree
  // has both deep branches and shallow ones — same as the real thing.
  ...["bangalore", "delhi", "mumbai", "hyderabad", "siliconvalley", "london", "dubai", "singapore", "newyork", "toronto"].flatMap((slug) =>
    tiePrograms(slug, TIE_CHAPTERS.find(([s]) => s === slug)![1])
  ),
];

/** ISB names its levels differently to TiE — programmes, then classes. Same engine, different configuration. */
const ISB_TREE: MockEntity[] = [
  node("isb", "Indian School of Business", null, "Network", "🎓", 14200, "ISB alumni across product, strategy, venture, and operating roles.", {
    childLabel: "Programmes",
    place: { city: "Hyderabad", lat: 17.4239, lng: 78.3413 },
  }),
  node("isb-pgp", "PGP", "isb", "Programme", "📘", 9800, "Post Graduate Programme in Management — the one-year flagship.", { childLabel: "Classes" }),
  node("isb-egp", "EGP", "isb", "Programme", "📗", 2600, "Executive Graduate Programme — for working senior managers.", { childLabel: "Classes" }),
  node("isb-ivi", "IVI", "isb", "Programme", "🚀", 480, "I-Venture @ ISB — the incubator and its founder cohorts.", { childLabel: "Cohorts" }),
  ...[2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map((y) =>
    node(`isb-pgp-${y}`, `Class of ${y}`, "isb-pgp", "Class", "🎓", 600 + (y % 7) * 40, `The PGP cohort that graduated in ${y}.`)
  ),
  ...[2020, 2022, 2024].map((y) => node(`isb-egp-${y}`, `Class of ${y}`, "isb-egp", "Class", "🎓", 180 + (y % 5) * 20, `The EGP cohort that graduated in ${y}.`)),
  ...["Cohort 7", "Cohort 8", "Cohort 9"].map((c, i) =>
    node(`isb-ivi-${i + 7}`, c, "isb-ivi", "Cohort", "🚀", 18 + i * 4, `I-Venture ${c} — currently incubating.`)
  ),
];

/** IIT Bombay calls them chapters and groups. Again: same engine. */
const IITB_TREE: MockEntity[] = [
  node("iitb", "IIT Bombay", null, "Network", "🎓", 12400, "IIT Bombay graduates building and leading across the world.", {
    childLabel: "Chapters",
    place: { city: "Mumbai", lat: 19.1334, lng: 72.9133 },
  }),
  node("iitb-bay", "Bay Area Chapter", "iitb", "Chapter", "📍", 980, "IITB alumni around San Francisco and the peninsula.", { childLabel: "Groups", place: { city: "San Francisco", lat: 37.7749, lng: -122.4194 } }),
  node("iitb-blr", "Bengaluru Chapter", "iitb", "Chapter", "📍", 1640, "The largest IITB chapter outside Mumbai.", { childLabel: "Groups", place: { city: "Bengaluru", lat: 12.9716, lng: 77.5946 } }),
  node("iitb-nyc", "New York Chapter", "iitb", "Chapter", "📍", 720, "East-coast alumni, finance and tech heavy.", { place: { city: "New York", lat: 40.7128, lng: -74.006 } }),
  node("iitb-sg", "Singapore Chapter", "iitb", "Chapter", "📍", 540, "Alumni across Southeast Asia.", { place: { city: "Singapore", lat: 1.3521, lng: 103.8198 } }),
  node("iitb-bay-founders", "Bay Area Founders", "iitb-bay", "Group", "👥", 310, "Alumni who've started something in the valley."),
  node("iitb-bay-deeptech", "Deep Tech", "iitb-bay", "Group", "👥", 180, "Semiconductors, robotics, and hard science."),
  node("iitb-blr-founders", "Bengaluru Founders", "iitb-blr", "Group", "👥", 420, "Seed to Series C founders in the city."),
  node("iitb-blr-08", "Class of 2008", "iitb-blr", "Group", "👥", 140, "Batchmates keeping the hostel group chat alive since '08."),
];

const STANFORD_TREE: MockEntity[] = [
  node("stanford", "Stanford University", null, "Network", "🎓", 15100, "Stanford alumni building and connecting worldwide.", {
    childLabel: "Schools",
    place: { city: "Stanford, CA", lat: 37.4275, lng: -122.1697 },
  }),
  node("stanford-gsb", "Graduate School of Business", "stanford", "School", "📘", 2100, "GSB alumni worldwide.", { childLabel: "Classes" }),
  node("stanford-eng", "School of Engineering", "stanford", "School", "⚙️", 3400, "Engineering alumni across software, hardware, and research.", { childLabel: "Classes" }),
  node("stanford-india", "Stanford in India", "stanford", "Chapter", "📍", 640, "Alumni who've moved back or are building in India.", { place: { city: "Bengaluru", lat: 12.9279, lng: 77.6271 } }),
  ...[2016, 2019, 2022].map((y) => node(`stanford-gsb-${y}`, `Class of ${y}`, "stanford-gsb", "Class", "🎓", 380, `GSB class of ${y}.`)),
  ...[2018, 2021].map((y) => node(`stanford-eng-${y}`, `Class of ${y}`, "stanford-eng", "Class", "🎓", 520, `Engineering class of ${y}.`)),
];

/** Flatter networks — no sub-levels configured at all. The tree doesn't force any. */
const FLAT_NETWORKS: MockEntity[] = [
  node("exgoogle", "Ex-Google", null, "Network", "🏢", 5400, "Former Googlers helping each other build what's next.", { childLabel: "Groups", place: { city: "Bengaluru", lat: 12.9351, lng: 77.6947 } }),
  node("exgoogle-blr", "Bengaluru Xooglers", "exgoogle", "Group", "👥", 860, "Ex-Googlers in and around Bengaluru."),
  node("exgoogle-founders", "Xoogler Founders", "exgoogle", "Group", "👥", 540, "Left to start something — comparing notes on the jump."),
  node("exmsft", "Ex-Microsoft", null, "Network", "🏢", 4100, "Microsoft alumni across cloud, AI, and enterprise.", { place: { city: "Hyderabad", lat: 17.4399, lng: 78.3489 } }),
  node("exmck", "Ex-McKinsey", null, "Network", "🏢", 3300, "Ex-consultants now operating, founding, and investing."),
  node("exflipkart", "Ex-Flipkart", null, "Network", "🏢", 3900, "The Flipkart mafia — commerce, logistics, and fintech.", { place: { city: "Bengaluru", lat: 12.9237, lng: 77.675 } }),
  node("bits", "BITS Pilani", null, "Network", "🎓", 9300, "BITSians in tech, research, and startups everywhere.", { place: { city: "Pilani", lat: 28.3639, lng: 75.5869 } }),
  node("hbs", "Harvard Business School", null, "Network", "🎓", 11200, "HBS alumni in operating, investing, and founding roles.", { place: { city: "Boston", lat: 42.3663, lng: -71.1222 } }),
  node("pm-india", "Product Managers India", null, "Network", "🧭", 14200, "Product people across India swapping craft and war stories."),
  node("women-product", "Women in Product", null, "Network", "🧭", 16800, "Product leaders supporting other women building product.", { childLabel: "Circles" }),
  node("women-product-mentor", "Mentorship Circle", "women-product", "Circle", "👥", 1200, "Structured mentor pairings, two cohorts a year."),
  node("women-product-leaders", "Senior Leaders", "women-product", "Circle", "👥", 640, "Director-and-above leaders, closed-door discussions."),
  node("design-leaders", "Design Leaders India", null, "Network", "🧭", 9100, "Senior design leaders across India's product companies."),
  node("blr-founders", "Bengaluru Founders", null, "Network", "🧭", 21000, "Early-stage founders in Bengaluru trading notes and intros."),
  node("climate", "Climate Tech Collective", null, "Network", "🧭", 5200, "Builders working on decarbonisation across hardware and software."),
  node("angels", "Angel Investors India", null, "Network", "🧭", 4400, "Active angels sharing deal flow and diligence notes."),
  node("yc", "Y Combinator Alumni", null, "Network", "🧭", 8800, "YC founders across batches, hiring and helping each other."),
];

/** Independent clubs — no parent, and none possible. */
const CLUBS: MockEntity[] = [
  node("club-hikers", "Weekend Hikers", null, "Club", "⛺", 320, "Trail-first, work-second — a standing Saturday hike."),
  node("club-bookclub", "Founders' Book Club", null, "Club", "⛺", 150, "One business book a month, one dinner to argue about it."),
  node("club-run", "Sunday Run Club", null, "Club", "⛺", 260, "10k every Sunday, coffee immediately after."),
  node("club-boardgames", "Board Game Nights", null, "Club", "⛺", 110, "Heavy euros and light trash-talk, every other Friday."),
];

export const ALL_ENTITIES: MockEntity[] = [...TIE_TREE, ...ISB_TREE, ...IITB_TREE, ...STANFORD_TREE, ...FLAT_NETWORKS, ...CLUBS];

const BY_ID = new Map(ALL_ENTITIES.map((e) => [e.id, e]));
const CHILDREN = new Map<string, MockEntity[]>();
for (const e of ALL_ENTITIES) {
  if (!e.parentId) continue;
  const list = CHILDREN.get(e.parentId) ?? [];
  list.push(e);
  CHILDREN.set(e.parentId, list);
}

export function entityById(id: string): MockEntity | undefined {
  return BY_ID.get(id);
}

export function childrenOf(id: string): MockEntity[] {
  return CHILDREN.get(id) ?? [];
}

/** Root-first breadcrumb path, excluding the node itself. */
export function ancestorsOf(id: string): MockEntity[] {
  const out: MockEntity[] = [];
  let cur = BY_ID.get(id)?.parentId ?? null;
  while (cur) {
    const e = BY_ID.get(cur);
    if (!e) break;
    out.unshift(e);
    cur = e.parentId;
  }
  return out;
}

export function descendantIds(id: string): string[] {
  const out: string[] = [];
  const stack = [...childrenOf(id)];
  while (stack.length) {
    const e = stack.pop()!;
    out.push(e.id);
    stack.push(...childrenOf(e.id));
  }
  return out;
}

/** Top-level nodes that are actual networks — clubs are top-level too, but they're not networks. */
export const TOP_NETWORKS: MockEntity[] = ALL_ENTITIES.filter((e) => e.parentId === null && e.label !== "Club");
export const TOP_CLUBS: MockEntity[] = ALL_ENTITIES.filter((e) => e.label === "Club");

export function isClub(e: MockEntity): boolean {
  return e.label === "Club";
}

/** Everything with a physical home — these are what get pins on the map. */
export const PLACED_ENTITIES: MockEntity[] = ALL_ENTITIES.filter((e) => e.place);

// ----------------------------------------------------------------- feeds

export type MockPost = {
  id: string;
  entityId: string;
  author: string;
  body: string;
  dateLabel: string;
};

export const MOCK_POSTS: MockPost[] = [
  { id: "p-pub-1", entityId: PUBLIC_ENTITY_ID, author: "Sarah Chen", body: "In Bengaluru all next week — happy to meet anyone building in B2B infra.", dateLabel: "3h ago" },
  { id: "p-pub-2", entityId: PUBLIC_ENTITY_ID, author: "Kwame Asante", body: "Looking for intros to payments folks in Nairobi or Lagos. Will trade notes on informal-market rails.", dateLabel: "yesterday" },
  { id: "p-pub-3", entityId: PUBLIC_ENTITY_ID, author: "Elin Berg", body: "Anyone in Stockholm up for a climate-hardware coffee on Thursday?", dateLabel: "2 days ago" },

  { id: "p-tie-1", entityId: "tie-global", author: "TiE Global", body: "TiE Global Summit registrations are open — 3,000 founders, 40 countries, December.", dateLabel: "1 day ago" },
  { id: "p-tie-2", entityId: "tie-global", author: "TiE Global", body: "Nominations for the Global Charter Member council close at the end of the month.", dateLabel: "6 days ago" },
  { id: "p-tie-sa-1", entityId: "tie-southasia", author: "Region Desk", body: "South Asia chapters crossed 6,000 members this quarter — Hyderabad grew fastest.", dateLabel: "4 days ago" },
  { id: "p-tie-blr-1", entityId: "tie-bangalore", author: "Vikram Shah", body: "TiECon Bangalore speaker list is live. Charter Members get early access to 1:1 mentor slots.", dateLabel: "2 days ago" },
  { id: "p-tie-blr-2", entityId: "tie-bangalore", author: "Nandini Rao", body: "Pitch night this Thursday at the chapter office — six teams, 8 minutes each.", dateLabel: "5 days ago" },
  { id: "p-tie-blr-women-1", entityId: "tie-bangalore-women", author: "Nandini Rao", body: "TiE Women Bangalore cohort 4 applications close Friday. 20 places.", dateLabel: "1 day ago" },
  { id: "p-tie-blr-angels-1", entityId: "tie-bangalore-angels", author: "Rohit Agarwal", body: "Two deals in diligence this month — a climate hardware seed and a devtools pre-seed.", dateLabel: "3 days ago" },
  { id: "p-tie-sv-1", entityId: "tie-siliconvalley", author: "Marcus Webb", body: "TiE SV mentor office hours moved to Wednesdays. Sign-up sheet in the chapter portal.", dateLabel: "2 days ago" },
  { id: "p-tie-dubai-1", entityId: "tie-dubai", author: "Hana Al-Rashid", body: "Gulf founders dinner on the 19th — bring one person who's never been to a TiE event.", dateLabel: "yesterday" },

  { id: "p-isb-1", entityId: "isb", author: "Alumni Office", body: "Homecoming weekend is the first weekend of February. Registration opens Monday.", dateLabel: "3 days ago" },
  { id: "p-isb-pgp-1", entityId: "isb-pgp", author: "Priya Raman", body: "Putting together a product-vs-consulting panel for the winter reunion. Volunteers?", dateLabel: "1 day ago" },
  { id: "p-isb-pgp19-1", entityId: "isb-pgp-2019", author: "Vikram Nair", body: "Class of 2019 — five-year reunion planning thread. Hyderabad or Goa?", dateLabel: "2 days ago" },
  { id: "p-isb-ivi-1", entityId: "isb-ivi", author: "I-Venture Desk", body: "Cohort 9 demo day is on the 28th. Investors, ping us for a seat.", dateLabel: "4 days ago" },

  { id: "p-iitb-1", entityId: "iitb", author: "Rhea Kapoor", body: "Powai meet is on for Nov 8 — bring a +1, first round's on the network.", dateLabel: "2 days ago" },
  { id: "p-iitb-bay-1", entityId: "iitb-bay", author: "Marcus Webb", body: "Palo Alto dinner on the 22nd — 12 seats, reply to claim one.", dateLabel: "1 day ago" },
  { id: "p-iitb-blr-1", entityId: "iitb-blr", author: "Divya Menon", body: "Chapter brunch moved to Koramangala — new spot has actual parking.", dateLabel: "4 days ago" },

  { id: "p-stanford-1", entityId: "stanford", author: "Jordan Lee", body: "SF social on Nov 14 at The Battery — alums from every era welcome.", dateLabel: "4 days ago" },
  { id: "p-stanford-gsb-1", entityId: "stanford-gsb", author: "Emma Whitfield", body: "London GSB drinks — first Thursday of every month, same pub.", dateLabel: "1 week ago" },

  { id: "p-exg-1", entityId: "exgoogle", author: "Meera Pillai", body: "Mixer at Toit on Nov 6 — RSVP so we can hold the back room.", dateLabel: "1 day ago" },
  { id: "p-blrf-1", entityId: "blr-founders", author: "Vikram Shah", body: "Third Wave on Saturday — come swap fundraising war stories.", dateLabel: "3 days ago" },
  { id: "p-wip-1", entityId: "women-product", author: "Nandini Rao", body: "Mentorship sign-ups open — 20 pairings this cohort, closing Friday.", dateLabel: "5 days ago" },
  { id: "p-yc-1", entityId: "yc", author: "Rohit Agarwal", body: "W26 applications close soon — happy to read anyone's application draft.", dateLabel: "6 days ago" },
  { id: "p-hikers-1", entityId: "club-hikers", author: "Rohan Mehta", body: "Nandi Hills this Saturday, 5am start. Bring a torch.", dateLabel: "2 days ago" },
  { id: "p-bookclub-1", entityId: "club-bookclub", author: "Tara Bhatt", body: "This month: The Hard Thing About Hard Things. Dinner on the 28th.", dateLabel: "1 week ago" },
];

// ------------------------------------------------------------ membership

/** Curated so the flagship branches always have a real, globally spread roster. */
const CURATED: Record<string, string[]> = {
  "tie-bangalore": ["Arjun Bose", "Nisha Reddy", "Farhan Qureshi", "Rohit Agarwal", "Divya Menon"],
  "tie-siliconvalley": ["Sarah Chen", "Marcus Webb"],
  "tie-dubai": ["Hana Al-Rashid"],
  "tie-london": ["Emma Whitfield"],
  "tie-singapore": ["Wei Zhang"],
  "tie-mumbai": ["Priyanka Malhotra"],
  "tie-hyderabad": ["Imran Baig", "Anika Rao"],
  "tie-toronto": ["Noah Fortin"],
  "tie-newyork": ["Rohan Mehta"],
  "isb-pgp-2019": ["Priya Raman", "Vikram Nair", "Tara Bhatt"],
  "isb-pgp-2022": ["Nisha Reddy", "Pranathi Rao"],
  "isb-egp-2020": ["Tejaswini Rao"],
  "isb-ivi-9": ["Sarah Chen", "Amara Njoroge"],
  "iitb-bay": ["Marcus Webb", "Gabriel Souza"],
  "iitb-blr": ["Arjun Bose", "Dev Chandran", "Meera Pillai", "Divya Menon"],
  "iitb-nyc": ["Jiwoo Kim"],
  "iitb-sg": ["Wei Zhang"],
  "stanford-gsb-2019": ["Emma Whitfield", "Olivia Bennett"],
  "stanford-eng-2018": ["Aiko Tanaka", "Elin Berg"],
  "stanford-india": ["Kabir Singh", "Ananya Krishnan"],
};

function curatedIdsFor(name: string): string[] {
  return Object.entries(CURATED)
    .filter(([, names]) => names.includes(name))
    .map(([id]) => id);
}

/** Leaf-ish nodes a person can be assigned to by hash — the tree is too deep to pick uniformly at random. */
const ASSIGNABLE = ALL_ENTITIES.filter((e) => e.label === "Chapter" || e.label === "Class" || e.label === "Group" || e.label === "Club" || e.label === "Programme" || e.label === "Circle");

/** The nodes a person belongs to directly — before ancestors are implied. */
export function directEntitiesForName(name: string): MockEntity[] {
  const h = hashSeed(name);
  const ids = new Set<string>(curatedIdsFor(name));
  const count = 2 + (h % 3);
  for (let i = 0; i < count; i++) {
    ids.add(ASSIGNABLE[(h >>> (i * 3)) % ASSIGNABLE.length].id);
  }
  return ALL_ENTITIES.filter((e) => ids.has(e.id));
}

/**
 * Every node a person counts as a member of — if you're in Class of 2019
 * you're in PGP, and in ISB. That's what makes a parent's member list the
 * union of everything beneath it.
 */
export function entityIdsForName(name: string): Set<string> {
  const out = new Set<string>();
  for (const e of directEntitiesForName(name)) {
    out.add(e.id);
    for (const a of ancestorsOf(e.id)) out.add(a.id);
  }
  return out;
}

/** The top-level networks a person is in — what shows as their headline affiliations. */
export function networksForName(name: string): MockEntity[] {
  const ids = entityIdsForName(name);
  return TOP_NETWORKS.filter((n) => ids.has(n.id));
}

export function membersOfEntity<T extends { name: string }>(people: T[], entityId: string): T[] {
  if (entityId === PUBLIC_ENTITY_ID) return people;
  return people.filter((p) => entityIdsForName(p.name).has(entityId));
}

// ----------------------------------------------------- my own membership

const MY_ENTITIES_KEY = "mp_my_entities";

/** You start out inside a realistic spread — deep in a couple of trees, shallow in others. */
const DEFAULT_MY_ENTITY_IDS = [
  "tie-bangalore",
  "tie-bangalore-angels",
  "tie-siliconvalley",
  "isb-pgp-2019",
  "isb-ivi-9",
  "iitb-blr",
  "stanford-gsb-2019",
  "exgoogle-founders",
  "blr-founders",
  "yc",
  "angels",
  "pm-india",
  "club-hikers",
];

export function getMyEntityIds(): string[] {
  if (typeof window === "undefined") return DEFAULT_MY_ENTITY_IDS;
  try {
    const raw = window.localStorage.getItem(MY_ENTITIES_KEY);
    if (raw == null) return DEFAULT_MY_ENTITY_IDS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : DEFAULT_MY_ENTITY_IDS;
  } catch {
    return DEFAULT_MY_ENTITY_IDS;
  }
}

export function setMyEntityIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MY_ENTITIES_KEY, JSON.stringify(ids));
  } catch {
    // Private browsing or storage disabled — membership just won't persist across reloads.
  }
}

/** Direct memberships plus every ancestor they imply. */
export function expandMembership(directIds: string[]): Set<string> {
  const out = new Set<string>();
  for (const id of directIds) {
    out.add(id);
    for (const a of ancestorsOf(id)) out.add(a.id);
  }
  return out;
}
