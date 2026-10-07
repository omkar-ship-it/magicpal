import { ancestorsOf, entityById, expandMembership } from "./networks";
import { hashSeed } from "./prototypeData";

/**
 * hashSeed is `h * 31 + charCode`, which leaves the low bits almost entirely
 * determined by the last few characters — so `hashSeed("beacon-" + id) % 100`
 * over a set of ids like cm-1, cm-2… clusters hard instead of spreading.
 * This is a standard avalanche finalizer: it mixes the high bits down so
 * every output bit depends on the whole input.
 *
 * Attributes must also each get their *own* key rather than a different
 * shift of one shared hash, or they end up correlated with each other —
 * which is how the first build of this file put a whole community in twelve
 * cities and nobody at all on a beacon.
 */
function mix32(x: number): number {
  let v = x >>> 0;
  v = Math.imul(v ^ (v >>> 16), 0x7feb352d) >>> 0;
  v = Math.imul(v ^ (v >>> 15), 0x846ca68b) >>> 0;
  return (v ^ (v >>> 16)) >>> 0;
}

/** A well-spread 32-bit number for a given key. */
export const rnd = (key: string): number => mix32(hashSeed(key));

/**
 * Data for the members-only experience (/circle) — a second prototype that
 * drops the public map entirely. There is no "everyone nearby" here: you see
 * the people in communities you belong to, anywhere on earth, and nobody
 * else sees you.
 *
 * Everything below is deterministic from a name hash, same convention as
 * lib/prototypeData.ts — no database, no network calls, identical on every
 * load and for every viewer.
 */

// ─────────────────────────────────────────────────────────── privacy

/**
 * What a member lets other members see. The whole map is built around this
 * being an honest, visible choice rather than a buried setting:
 *
 *  off  — not on the map at all; still in the directory, still messageable
 *  base — your city, and only your city: you sit in the city's bubble
 *  live — your actual position, as a pin of your own
 */
/**
 * The sentinel for "everyone", used by the open experience at /open.
 *
 * There, membership isn't the boundary — it's a filter. `membersOf` answers
 * with the whole roster for this id, and the UI leans on role, city and what
 * people can help with to make a map of strangers navigable instead.
 *
 * Declared up here because `membersOf` reads it and runs during module
 * initialisation, when anything declared further down is still in its
 * temporal dead zone.
 */
export const OPEN_ID = "__open";

export type LocationMode = "off" | "base" | "live";

export const LOCATION_MODES: Array<{ id: LocationMode; label: string; detail: string }> = [
  { id: "off", label: "Off the map", detail: "Nobody sees where you are. You're still in the directory and can still message anyone." },
  { id: "base", label: "My city", detail: "Members see which city you're based in — never a street or an address." },
  { id: "live", label: "My live location", detail: "Members see roughly where you are now. Useful when you travel; switch it off any time." },
];

// ─────────────────────────────────────────────────────────── cities

/**
 * `weight` is how likely a member is to be here. Alumni networks cluster hard
 * — a class of 600 has forty people in Bengaluru and one in Lisbon — and a
 * uniform scatter across fifty cities reads as fake the moment you look at it.
 */
export type CircleCity = { id: string; name: string; country: string; lat: number; lng: number; region: Region; weight: number };

type Region = "south-asia" | "sea" | "east-asia" | "mideast" | "europe" | "africa" | "north-america" | "latam" | "oceania";

export const CIRCLE_CITIES: CircleCity[] = [
  { id: "blr", name: "Bengaluru", country: "India", lat: 12.9716, lng: 77.5946, region: "south-asia" , weight: 40 },
  { id: "bom", name: "Mumbai", country: "India", lat: 19.076, lng: 72.8777, region: "south-asia" , weight: 26 },
  { id: "del", name: "Delhi", country: "India", lat: 28.6139, lng: 77.209, region: "south-asia" , weight: 20 },
  { id: "hyd", name: "Hyderabad", country: "India", lat: 17.385, lng: 78.4867, region: "south-asia" , weight: 22 },
  { id: "maa", name: "Chennai", country: "India", lat: 13.0827, lng: 80.2707, region: "south-asia" , weight: 10 },
  { id: "pnq", name: "Pune", country: "India", lat: 18.5204, lng: 73.8567, region: "south-asia" , weight: 9 },
  { id: "ccu", name: "Kolkata", country: "India", lat: 22.5726, lng: 88.3639, region: "south-asia" , weight: 6 },
  { id: "amd", name: "Ahmedabad", country: "India", lat: 23.0225, lng: 72.5714, region: "south-asia" , weight: 5 },
  { id: "cmb", name: "Colombo", country: "Sri Lanka", lat: 6.9271, lng: 79.8612, region: "south-asia" , weight: 2 },
  { id: "sin", name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198, region: "sea" , weight: 18 },
  { id: "cgk", name: "Jakarta", country: "Indonesia", lat: -6.2088, lng: 106.8456, region: "sea" , weight: 5 },
  { id: "bkk", name: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018, region: "sea" , weight: 4 },
  { id: "sgn", name: "Ho Chi Minh City", country: "Vietnam", lat: 10.8231, lng: 106.6297, region: "sea" , weight: 3 },
  { id: "mnl", name: "Manila", country: "Philippines", lat: 14.5995, lng: 120.9842, region: "sea" , weight: 3 },
  { id: "kul", name: "Kuala Lumpur", country: "Malaysia", lat: 3.139, lng: 101.6869, region: "sea" , weight: 4 },
  { id: "nrt", name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503, region: "east-asia" , weight: 8 },
  { id: "icn", name: "Seoul", country: "South Korea", lat: 37.5665, lng: 126.978, region: "east-asia" , weight: 5 },
  { id: "pvg", name: "Shanghai", country: "China", lat: 31.2304, lng: 121.4737, region: "east-asia" , weight: 5 },
  { id: "hkg", name: "Hong Kong", country: "Hong Kong", lat: 22.3193, lng: 114.1694, region: "east-asia" , weight: 7 },
  { id: "tpe", name: "Taipei", country: "Taiwan", lat: 25.033, lng: 121.5654, region: "east-asia" , weight: 3 },
  { id: "dxb", name: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708, region: "mideast" , weight: 16 },
  { id: "auh", name: "Abu Dhabi", country: "UAE", lat: 24.4539, lng: 54.3773, region: "mideast" , weight: 5 },
  { id: "ruh", name: "Riyadh", country: "Saudi Arabia", lat: 24.7136, lng: 46.6753, region: "mideast" , weight: 4 },
  { id: "tlv", name: "Tel Aviv", country: "Israel", lat: 32.0853, lng: 34.7818, region: "mideast" , weight: 4 },
  { id: "lon", name: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278, region: "europe" , weight: 24 },
  { id: "ber", name: "Berlin", country: "Germany", lat: 52.52, lng: 13.405, region: "europe" , weight: 8 },
  { id: "ams", name: "Amsterdam", country: "Netherlands", lat: 52.3676, lng: 4.9041, region: "europe" , weight: 7 },
  { id: "par", name: "Paris", country: "France", lat: 48.8566, lng: 2.3522, region: "europe" , weight: 6 },
  { id: "zrh", name: "Zurich", country: "Switzerland", lat: 47.3769, lng: 8.5417, region: "europe" , weight: 5 },
  { id: "arn", name: "Stockholm", country: "Sweden", lat: 59.3293, lng: 18.0686, region: "europe" , weight: 4 },
  { id: "dub", name: "Dublin", country: "Ireland", lat: 53.3498, lng: -6.2603, region: "europe" , weight: 5 },
  { id: "lis", name: "Lisbon", country: "Portugal", lat: 38.7223, lng: -9.1393, region: "europe" , weight: 3 },
  { id: "waw", name: "Warsaw", country: "Poland", lat: 52.2297, lng: 21.0122, region: "europe" , weight: 3 },
  { id: "mad", name: "Madrid", country: "Spain", lat: 40.4168, lng: -3.7038, region: "europe" , weight: 3 },
  { id: "nbo", name: "Nairobi", country: "Kenya", lat: -1.2921, lng: 36.8219, region: "africa" , weight: 4 },
  { id: "los", name: "Lagos", country: "Nigeria", lat: 6.5244, lng: 3.3792, region: "africa" , weight: 4 },
  { id: "cpt", name: "Cape Town", country: "South Africa", lat: -33.9249, lng: 18.4241, region: "africa" , weight: 3 },
  { id: "cai", name: "Cairo", country: "Egypt", lat: 30.0444, lng: 31.2357, region: "africa" , weight: 3 },
  { id: "sfo", name: "San Francisco", country: "United States", lat: 37.7749, lng: -122.4194, region: "north-america" , weight: 32 },
  { id: "nyc", name: "New York", country: "United States", lat: 40.7128, lng: -74.006, region: "north-america" , weight: 26 },
  { id: "sea", name: "Seattle", country: "United States", lat: 47.6062, lng: -122.3321, region: "north-america" , weight: 14 },
  { id: "aus", name: "Austin", country: "United States", lat: 30.2672, lng: -97.7431, region: "north-america" , weight: 9 },
  { id: "bos", name: "Boston", country: "United States", lat: 42.3601, lng: -71.0589, region: "north-america" , weight: 11 },
  { id: "chi", name: "Chicago", country: "United States", lat: 41.8781, lng: -87.6298, region: "north-america" , weight: 8 },
  { id: "lax", name: "Los Angeles", country: "United States", lat: 34.0522, lng: -118.2437, region: "north-america" , weight: 9 },
  { id: "yyz", name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832, region: "north-america" , weight: 10 },
  { id: "yvr", name: "Vancouver", country: "Canada", lat: 49.2827, lng: -123.1207, region: "north-america" , weight: 6 },
  { id: "gru", name: "São Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333, region: "latam" , weight: 5 },
  { id: "mex", name: "Mexico City", country: "Mexico", lat: 19.4326, lng: -99.1332, region: "latam" , weight: 4 },
  { id: "eze", name: "Buenos Aires", country: "Argentina", lat: -34.6037, lng: -58.3816, region: "latam" , weight: 3 },
  { id: "bog", name: "Bogotá", country: "Colombia", lat: 4.711, lng: -74.0721, region: "latam" , weight: 3 },
  { id: "syd", name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093, region: "oceania" , weight: 8 },
  { id: "mel", name: "Melbourne", country: "Australia", lat: -37.8136, lng: 144.9631, region: "oceania" , weight: 6 },
  { id: "akl", name: "Auckland", country: "New Zealand", lat: -36.8485, lng: 174.7633, region: "oceania" , weight: 3 },
];

const CITY_BY_ID = new Map(CIRCLE_CITIES.map((c) => [c.id, c]));
export const cityById = (id: string): CircleCity | undefined => CITY_BY_ID.get(id);

/** Regions are how the name pools are organised; continents are what people count. */
const CONTINENT_OF: Record<Region, string> = {
  "south-asia": "Asia",
  sea: "Asia",
  "east-asia": "Asia",
  mideast: "Asia",
  europe: "Europe",
  africa: "Africa",
  "north-america": "North America",
  latam: "South America",
  oceania: "Oceania",
};

export const continentOf = (c: CircleCity): string => CONTINENT_OF[c.region];

// ─────────────────────────────────────────────────────────── members

/** Names are drawn per region so a member in Tokyo doesn't read as a member in Lagos. */
const GIVEN: Record<Region, string[]> = {
  "south-asia": ["Aarav", "Diya", "Rohan", "Ananya", "Vikram", "Meera", "Karthik", "Shreya", "Imran", "Nandini", "Siddharth", "Kavya"],
  sea: ["Wei", "Siti", "Nguyen", "Arif", "Mei", "Rizal", "Thanh", "Aisyah", "Hock", "Dewi", "Bayu", "Ling"],
  "east-asia": ["Haruto", "Yuki", "Jisoo", "Minjun", "Wen", "Xiuying", "Kenji", "Aiko", "Chen", "Soo-ah", "Takumi", "Mei-ling"],
  mideast: ["Omar", "Layla", "Yusuf", "Noor", "Khalid", "Rania", "Tamar", "Eitan", "Farah", "Zayd", "Maya", "Hassan"],
  europe: ["Elena", "Lukas", "Sofia", "Mateusz", "Ingrid", "Felix", "Chloé", "Niall", "Astrid", "Marco", "Freya", "Tomas"],
  africa: ["Amara", "Kwame", "Zanele", "Chidi", "Aisha", "Thabo", "Ngozi", "Omar", "Lerato", "Yusuf", "Adaeze", "Kofi"],
  "north-america": ["Jordan", "Maya", "Ethan", "Priya", "Noah", "Camille", "Tyler", "Aisha", "Logan", "Sofia", "Marcus", "Hannah"],
  latam: ["Mateo", "Valentina", "Santiago", "Camila", "Diego", "Luciana", "Rafael", "Isabela", "Tomás", "Gabriela", "Andrés", "Renata"],
  oceania: ["Charlotte", "Liam", "Ruby", "Hemi", "Isla", "Jack", "Aroha", "Oliver", "Matilda", "Tane", "Georgia", "Noah"],
};

const FAMILY: Record<Region, string[]> = {
  "south-asia": ["Sharma", "Iyer", "Nair", "Reddy", "Banerjee", "Qureshi", "Desai", "Pillai", "Menon", "Chandran", "Bose", "Raman"],
  sea: ["Tan", "Nguyen", "Lim", "Santoso", "Wong", "Rahman", "Tran", "Goh", "Putra", "Chong", "Hartono", "Lee"],
  "east-asia": ["Tanaka", "Kim", "Zhang", "Nakamura", "Park", "Chen", "Sato", "Lee", "Wang", "Yamamoto", "Choi", "Lin"],
  mideast: ["Al-Rashid", "Haddad", "Qasimi", "Levy", "Nasser", "Mansour", "Cohen", "Farouk", "Khalil", "Aziz", "Shamsi", "Barak"],
  europe: ["Novak", "Müller", "Rossi", "Kowalski", "Berg", "Dubois", "O'Brien", "Lindqvist", "Fernandes", "Weber", "Jansen", "Costa"],
  africa: ["Okonkwo", "Mensah", "Dlamini", "Abiodun", "Mwangi", "Nkosi", "Adeyemi", "Osei", "Molefe", "Diallo", "Achebe", "Kamau"],
  "north-america": ["Rivera", "Chen", "Patel", "Morgan", "Okafor", "Bennett", "Nguyen", "Alvarez", "Foster", "Kaur", "Brooks", "Silva"],
  latam: ["Silva", "González", "Oliveira", "Ramírez", "Costa", "Fernández", "Souza", "Herrera", "Lima", "Vargas", "Rocha", "Castro"],
  oceania: ["Walker", "Ngata", "Thompson", "Patel", "Harrison", "Te Rangi", "Baker", "Singh", "Morrison", "Kaur", "Hayes", "Wiremu"],
};

const ROLES = [
  "Founder & CEO",
  "Head of Product",
  "VP Engineering",
  "Principal, early-stage fund",
  "Director of Design",
  "Chief of Staff",
  "Head of Data",
  "GM, International",
  "Partner",
  "Head of Growth",
  "Staff Engineer",
  "Head of Climate Strategy",
  "Operating Partner",
  "Head of Talent",
];

const COMPANIES = [
  "Stealth",
  "Nimbus",
  "Clearline",
  "Lumen Health",
  "Horizon Ventures",
  "Northwind",
  "Kite Labs",
  "Verdant",
  "Saffron Pay",
  "Tessellate",
  "Meridian",
  "Bluecap",
  "Orchard",
  "Driftwood",
];

/** The communities this experience runs on — all real nodes in lib/networks.ts. */
export const CIRCLE_ENTITY_IDS = [
  "isb-pgp-2019",
  "isb-pgp-2022",
  "isb-egp-2022",
  "iitb-2018",
  "iitb-blr",
  "iitb-bay",
  "stanford-gsb-2019",
  "climate",
  "women-product",
  "blr-founders",
  "yc",
] as const;

export type CircleMember = {
  id: string;
  name: string;
  headline: string;
  company: string;
  cityId: string;
  mode: LocationMode;
  /** Degrees offset from the city centre, used only when mode is "live". */
  jitter: [number, number];
  /** The leaf communities they belong to; parents roll up via expandMembership. */
  entityIds: string[];
  bio: string;
  /**
   * The reciprocity pair, and the reason a directory becomes a network.
   *
   * A roster of names and job titles tells you who exists. "Ask me about
   * pricing" and "Looking for a senior backend hire in Bengaluru" tell you
   * what to actually say when you open the message — which is the step
   * everybody stalls on. Most members have something to offer; far fewer
   * are asking for something at any given moment, and that's modelled.
   */
  helpWith: string[];
  lookingFor: string | null;
  /** Where they were before, newest first. */
  past: Array<{ role: string; company: string; years: string }>;
  /** Year they came out of the institution. */
  gradYear: number;
  links: { linkedin: boolean; site: string | null };
};

const HELP_WITH = [
  "fundraising",
  "go-to-market",
  "hiring engineers",
  "pricing",
  "entering India",
  "entering the US",
  "product strategy",
  "board management",
  "design systems",
  "data infrastructure",
  "B2B sales",
  "marketplace dynamics",
  "regulated industries",
  "scaling support",
  "brand and positioning",
  "org design",
  "climate hardware",
  "developer relations",
  "turning around a flat quarter",
  "first ten hires",
];

const LOOKING_FOR = [
  "a design partner for an early beta",
  "intros to CTOs in fintech",
  "a senior backend hire, Bengaluru or remote",
  "a second opinion on a Series A term sheet",
  "customers in US healthcare",
  "someone who has run a marketplace at scale",
  "a mentor who has done a turnaround",
  "a co-founder, technical, for something new",
  "my first enterprise logo",
  "advice on moving a team across borders",
];

const BIOS = [
  "Spent the last few years building {company}. Mostly interested in the unglamorous parts — pricing, support, the second hundred customers.",
  "Operator turned investor and back again. Happiest with a spreadsheet and a problem nobody has named yet.",
  "Building at {company}. Previously consulting, which taught me what not to do.",
  "I care about the gap between what a team ships and what a customer actually feels. Currently at {company}.",
  "Twelve years in, still convinced most of this is judgement rather than process. At {company} now.",
  "Left a big company to find out whether I could do it without the brand. Early signs are mixed and it is the best job I have had.",
  "{company} by day. Reading, running and arguing about org design the rest of the time.",
  "Quietly good at hiring and loudly opinionated about onboarding.",
];

const MEMBER_COUNT = 1800;

/** Cumulative weights, so a draw lands in Bengaluru far more often than Lisbon. */
const CITY_CUMULATIVE = (() => {
  let total = 0;
  return CIRCLE_CITIES.map((c) => {
    total += c.weight;
    return { city: c, upTo: total };
  });
})();
const CITY_WEIGHT_TOTAL = CITY_CUMULATIVE[CITY_CUMULATIVE.length - 1].upTo;

function pickCity(h: number): CircleCity {
  const draw = h % CITY_WEIGHT_TOTAL;
  for (const entry of CITY_CUMULATIVE) if (draw < entry.upTo) return entry.city;
  return CIRCLE_CITIES[0];
}

/**
 * The year a member actually graduated, read off the community they're in.
 *
 * A random year contradicted the class they belong to — a profile reading
 * "Class of 2017" directly under an "In common: Class of 2019" chip, which
 * is exactly the sort of thing an alumnus spots in a demo.
 */
function gradYearFor(...entityIds: string[]): number | null {
  for (const id of entityIds) {
    const year = entityById(id)?.name.match(/(\d{4})/)?.[1] ?? id.match(/(\d{4})/)?.[1];
    if (year) return Number(year);
  }
  return null;
}

function buildMembers(): CircleMember[] {
  const out: CircleMember[] = [];
  for (let i = 0; i < MEMBER_COUNT; i++) {
    const city = pickCity(rnd(`city-${i}`));
    const given = GIVEN[city.region][rnd(`given-${i}`) % 12];
    const family = FAMILY[city.region][rnd(`family-${i}`) % 12];
    // A fifth of the roster is off the map, a third shares live location —
    // enough of each that the privacy model is visible at a glance.
    const roll = rnd(`mode-${i}`) % 100;
    const mode: LocationMode = roll < 20 ? "off" : roll < 55 ? "live" : "base";
    const primary = CIRCLE_ENTITY_IDS[rnd(`ent1-${i}`) % CIRCLE_ENTITY_IDS.length];
    const second = CIRCLE_ENTITY_IDS[rnd(`ent2-${i}`) % CIRCLE_ENTITY_IDS.length];
    out.push({
      id: `cm-${i}`,
      name: `${given} ${family}`,
      headline: ROLES[rnd(`role-${i}`) % ROLES.length],
      company: COMPANIES[rnd(`co-${i}`) % COMPANIES.length],
      cityId: city.id,
      mode,
      // ±0.055° ≈ ±6km — a believable spread across a metro, never an address.
      jitter: [((rnd(`jx-${i}`) % 1100) - 550) / 10000, ((rnd(`jy-${i}`) % 1100) - 550) / 10000],
      entityIds: primary === second ? [primary] : [primary, second],
      bio: BIOS[rnd(`bio-${i}`) % BIOS.length].replace(/\{company\}/g, COMPANIES[rnd(`co-${i}`) % COMPANIES.length]),
      helpWith: Array.from(
        new Set([
          HELP_WITH[rnd(`h1-${i}`) % HELP_WITH.length],
          HELP_WITH[rnd(`h2-${i}`) % HELP_WITH.length],
          HELP_WITH[rnd(`h3-${i}`) % HELP_WITH.length],
        ])
      ),
      // Only about a third are actively asking for something — a roster
      // where everyone wants something reads as a jobs board.
      lookingFor: rnd(`lf-${i}`) % 100 < 34 ? LOOKING_FOR[rnd(`lfx-${i}`) % LOOKING_FOR.length] : null,
      past: [
        {
          role: ROLES[rnd(`p1r-${i}`) % ROLES.length],
          company: COMPANIES[rnd(`p1c-${i}`) % COMPANIES.length],
          years: `${2018 + (rnd(`p1y-${i}`) % 3)}-${2021 + (rnd(`p1y-${i}`) % 3)}`,
        },
        {
          role: ROLES[rnd(`p2r-${i}`) % ROLES.length],
          company: COMPANIES[rnd(`p2c-${i}`) % COMPANIES.length],
          years: `${2014 + (rnd(`p2y-${i}`) % 3)}-${2017 + (rnd(`p2y-${i}`) % 3)}`,
        },
      ].slice(0, 1 + (rnd(`pn-${i}`) % 2)),
      gradYear: gradYearFor(primary, second) ?? 2015 + (rnd(`gy-${i}`) % 9),
      links: { linkedin: rnd(`li-${i}`) % 100 < 72, site: rnd(`si-${i}`) % 100 < 28 ? `${COMPANIES[rnd(`co-${i}`) % COMPANIES.length].toLowerCase().replace(/[^a-z]/g, "")}.com` : null },
    });
  }
  return out;
}

export const CIRCLE_MEMBERS: CircleMember[] = buildMembers();

const MEMBER_BY_ID = new Map(CIRCLE_MEMBERS.map((m) => [m.id, m]));
export const memberById = (id: string): CircleMember | undefined => MEMBER_BY_ID.get(id);

/**
 * Community → members, built once. The roll-up is the expensive part (every
 * member's ancestry, per lookup), and `membersOf` is called on every render
 * of the map, so it happens here instead.
 */
const BY_ENTITY = (() => {
  const index = new Map<string, CircleMember[]>();
  for (const m of CIRCLE_MEMBERS) {
    for (const id of expandMembership(m.entityIds)) {
      const list = index.get(id);
      if (list) list.push(m);
      else index.set(id, [m]);
    }
  }
  return index;
})();

/** Everyone in a community, counting the roll-up: ISB includes every ISB class. */
export function membersOf(entityId: string): CircleMember[] {
  if (entityId === OPEN_ID) return CIRCLE_MEMBERS;
  return BY_ENTITY.get(entityId) ?? [];
}

/** Where a member sits on the map, or null when they've chosen to be off it. */
export function pointOf(m: CircleMember): [number, number] | null {
  const city = cityById(m.cityId);
  if (!city || m.mode === "off") return null;
  if (m.mode === "base") return [city.lng, city.lat];
  return [city.lng + m.jitter[0], city.lat + m.jitter[1]];
}

// ─────────────────────────────────────────────────────────── events

/**
 * Three shapes, and the difference is who can make one.
 *
 *  official — the institution's own event. Admins only: it reaches the whole
 *             community, so the gate matches the reach.
 *  meetup   — any member, in their own city. Reaches only the handful of
 *             members in that city, which is why it needs no gate at all:
 *             a dinner for the eleven alumni in Berlin is nobody's broadcast.
 *  online   — no venue and no city; the audience is the whole community, so
 *             it's gated like an official one.
 */
export type EventKind = "official" | "meetup" | "online";

export type CircleEvent = {
  id: string;
  name: string;
  hostEntityId: string;
  kind: EventKind;
  /** Set for official and member meetups; null for online. */
  venue: string | null;
  cityId: string | null;
  /** The venue itself, not the city — the beacon view zooms to this. */
  lat: number | null;
  lng: number | null;
  dateLabel: string;
  timeLabel: string;
  /** Days from today; drives "this week" and ordering. */
  daysAway: number;
  /** Happening right now, so beacons are live and the map has something to show. */
  liveNow: boolean;
  about: string;
  /** The member who called it. null = the community itself. */
  hostMemberId: string | null;
  /** Online events only. */
  joinUrl?: string;
};

export const CIRCLE_EVENTS: CircleEvent[] = [
  {
    id: "ce-reunion",
    name: "PGP '19 Five-Year Reunion",
    hostEntityId: "isb-pgp-2019",
    kind: "official",
    venue: "ISB Campus, Gachibowli",
    cityId: "hyd",
    lat: 17.4239,
    lng: 78.3413,
    dateLabel: "Today",
    timeLabel: "6:00pm - late",
    daysAway: 0,
    liveNow: true,
    about: "Five years out. Dinner on the lawn, the class photo nobody will agree to, and the bar until it closes.",
    hostMemberId: null,
  },
  {
    id: "ce-online-ama",
    name: "Fundraising AMA with the '19 founders",
    hostEntityId: "isb-pgp-2019",
    kind: "online",
    venue: null,
    cityId: null,
    lat: null,
    lng: null,
    dateLabel: "Tue, Oct 13",
    timeLabel: "8:00pm IST",
    daysAway: 6,
    liveNow: false,
    about: "Four classmates who raised this year, one hour, no slides. Ask anything about terms, timing and what they'd do differently.",
    hostMemberId: null,
    joinUrl: "https://meet.example.com/pgp19-ama",
  },
  {
    id: "ce-london",
    name: "London Alumni Supper",
    hostEntityId: "isb-pgp-2019",
    kind: "official",
    venue: "Dishoom, Shoreditch",
    cityId: "lon",
    lat: 51.5255,
    lng: -0.0776,
    dateLabel: "Thu, Oct 15",
    timeLabel: "7:30pm",
    daysAway: 8,
    liveNow: false,
    about: "Long table, one bill, no agenda. Whoever's in town.",
    hostMemberId: null,
  },
  {
    id: "ce-sf",
    name: "Bay Area Founders Breakfast",
    hostEntityId: "iitb-bay",
    kind: "official",
    venue: "Blue Bottle, Mint Plaza",
    cityId: "sfo",
    lat: 37.7825,
    lng: -122.4089,
    dateLabel: "Sat, Oct 10",
    timeLabel: "9:00am",
    daysAway: 3,
    liveNow: false,
    about: "Six founders, ninety minutes, one problem each.",
    hostMemberId: null,
  },
  {
    id: "ce-climate",
    name: "Climate Hardware Teardown",
    hostEntityId: "climate",
    kind: "official",
    venue: "Factory Berlin, Mitte",
    cityId: "ber",
    lat: 52.5323,
    lng: 13.3989,
    dateLabel: "Fri, Oct 23",
    timeLabel: "5:00pm",
    daysAway: 16,
    liveNow: false,
    about: "Three teams open up their hardware and take questions on what broke.",
    hostMemberId: null,
  },
  {
    id: "ce-blr",
    name: "Bengaluru Founders Mixer",
    hostEntityId: "blr-founders",
    kind: "official",
    venue: "Toit, Indiranagar",
    cityId: "blr",
    lat: 12.9784,
    lng: 77.6408,
    dateLabel: "Wed, Oct 14",
    timeLabel: "7:00pm",
    daysAway: 7,
    liveNow: false,
    about: "No talks, no badges. Beer and whoever shows up.",
    hostMemberId: null,
  },
];

/**
 * Member-called meetups, seeded so the city layer isn't empty before you
 * make your own. Each one is hosted by a real member who actually lives in
 * that city — `buildMeetups` resolves the host from the roster rather than
 * naming someone who isn't on the map.
 */
const MEETUP_SEEDS: Array<{ id: string; cityId: string; entityId: string; name: string; venue: string; dateLabel: string; timeLabel: string; daysAway: number; about: string }> = [
  {
    id: "mu-blr-coffee",
    cityId: "blr",
    entityId: "isb-pgp-2019",
    name: "Indiranagar coffee, Saturday",
    venue: "Third Wave, 12th Main",
    dateLabel: "Sat, Oct 11",
    timeLabel: "10:00am",
    daysAway: 4,
    about: "Nothing formal. I'm there most Saturdays anyway - come if you're free.",
  },
  {
    id: "mu-sfo-walk",
    cityId: "sfo",
    entityId: "isb-pgp-2019",
    name: "Presidio walk + brunch",
    venue: "Lover's Lane trailhead",
    dateLabel: "Sun, Oct 12",
    timeLabel: "9:30am",
    daysAway: 5,
    about: "Ninety minutes of walking, then brunch for whoever's still hungry.",
  },
  {
    id: "mu-lon-pub",
    cityId: "lon",
    entityId: "isb-pgp-2019",
    name: "Thursday pub, Soho",
    venue: "The French House",
    dateLabel: "Thu, Oct 9",
    timeLabel: "6:30pm",
    daysAway: 2,
    about: "Standing invitation. Back room, under my name.",
  },
  {
    id: "mu-sin-dinner",
    cityId: "sin",
    entityId: "isb-pgp-2019",
    name: "Dinner in Tiong Bahru",
    venue: "Por Kee Eating House",
    dateLabel: "Fri, Oct 17",
    timeLabel: "7:30pm",
    daysAway: 10,
    about: "Booked a table for eight. Reply and I'll make it bigger.",
  },
  {
    id: "mu-dxb-padel",
    cityId: "dxb",
    entityId: "isb-pgp-2019",
    name: "Padel, then shawarma",
    venue: "Padel Pro, Al Quoz",
    dateLabel: "Sat, Oct 18",
    timeLabel: "6:00pm",
    daysAway: 11,
    about: "Two courts booked. Beginners genuinely welcome, I am one.",
  },
  {
    id: "mu-bom-sundowner",
    cityId: "bom",
    entityId: "isb-pgp-2019",
    name: "Sundowner at Bandra Fort",
    venue: "Bandstand promenade",
    dateLabel: "Fri, Oct 10",
    timeLabel: "6:30pm",
    daysAway: 3,
    about: "Walk, sit on the rocks, watch the sun go down. Bring whoever.",
  },
  {
    id: "mu-nyc-breakfast",
    cityId: "nyc",
    entityId: "iitb-2018",
    name: "Breakfast before work",
    venue: "Bluestone Lane, Flatiron",
    dateLabel: "Wed, Oct 15",
    timeLabel: "8:00am",
    daysAway: 8,
    about: "Early, short, and you'll still make your 9:30.",
  },
  {
    id: "mu-ber-climate",
    cityId: "ber",
    entityId: "climate",
    name: "Hardware folks, Kreuzberg",
    venue: "Oberholz, Rosenthaler",
    dateLabel: "Tue, Oct 14",
    timeLabel: "6:00pm",
    daysAway: 7,
    about: "Anyone building physical things. Bring the thing if it fits.",
  },
];

function buildMeetups(): CircleEvent[] {
  return MEETUP_SEEDS.map((s) => {
    const city = cityById(s.cityId)!;
    // The host has to be someone who actually lives there, or the meetup is
    // a claim the map contradicts.
    const locals = membersOf(s.entityId).filter((m) => m.cityId === s.cityId);
    const host = locals[rnd(`host-${s.id}`) % Math.max(1, locals.length)] ?? null;
    return {
      id: s.id,
      name: s.name,
      hostEntityId: s.entityId,
      kind: "meetup" as const,
      venue: s.venue,
      cityId: s.cityId,
      // A meetup pins to its city with a small offset, not to a surveyed
      // address — the venue name is the precise part, not the coordinate.
      lat: city.lat + ((rnd(`mly-${s.id}`) % 160) - 80) / 10000,
      lng: city.lng + ((rnd(`mlx-${s.id}`) % 160) - 80) / 10000,
      dateLabel: s.dateLabel,
      timeLabel: s.timeLabel,
      daysAway: s.daysAway,
      liveNow: false,
      about: s.about,
      hostMemberId: host?.id ?? null,
    };
  });
}

/** Everything on the calendar: official events, online sessions and member meetups. */
export const ALL_CIRCLE_EVENTS: CircleEvent[] = [...CIRCLE_EVENTS, ...buildMeetups()];


export const eventById = (id: string): CircleEvent | undefined => ALL_CIRCLE_EVENTS.find((e) => e.id === id);

/**
 * Who's coming. Takes the event rather than its id, because a meetup you
 * called this session exists only in component state — an id lookup would
 * find nothing and report nobody going to your own event.
 *
 * A city meetup draws from the members who are actually in that city; an
 * official or online event draws from the whole community. That's the same
 * reach distinction the permission model uses, applied to the guest list.
 */
export function attendeesOf(ev: CircleEvent): CircleMember[] {
  const pool =
    ev.kind === "meetup" && ev.cityId
      ? membersOf(ev.hostEntityId).filter((m) => m.cityId === ev.cityId)
      : membersOf(ev.hostEntityId);
  const rate = ev.kind === "meetup" ? 55 : 42;
  return pool.filter((m) => rnd(`going-${ev.id}-${m.id}`) % 100 < rate);
}

/**
 * Who's beaconing at the venue right now.
 *
 * A beacon is deliberately narrower than the location setting above: it
 * shares your precise spot with the people at *this* event, for as long as
 * it runs — which is why someone normally "off the map" can still turn one
 * on without changing what the rest of the network sees.
 */
export function beaconsAt(ev: CircleEvent | null | undefined): CircleMember[] {
  if (!ev?.liveNow || ev.lat == null) return [];
  return attendeesOf(ev).filter((m) => rnd(`beacon-${ev.id}-${m.id}`) % 100 < 38);
}

/** A beaconing member's spot inside the venue — metres apart, not kilometres. */
export function beaconPoint(ev: CircleEvent, m: CircleMember): [number, number] | null {
  // An online event has no venue to stand in — presence there is a badge,
  // not a position, so there's deliberately no point to return.
  if (ev.lat == null || ev.lng == null) return null;
  // ±0.001° ≈ ±110m: a crowd spread across one venue, not across a district.
  return [
    ev.lng + ((rnd(`bpx-${ev.id}-${m.id}`) % 200) - 100) / 100000,
    ev.lat + ((rnd(`bpy-${ev.id}-${m.id}`) % 200) - 100) / 100000,
  ];
}

// ─────────────────────────────────────────────────────────── invites

export type CircleInvite = {
  code: string;
  entityId: string;
  adminName: string;
  adminRole: string;
  /** What the admin wrote on the invite. */
  note: string;
};

/**
 * The link an admin shares. One code, one community — opening it is the
 * entire onboarding: no account to create first, no public profile to fill
 * in, no approval queue. You're in the moment you give your name.
 */
export const CIRCLE_INVITES: CircleInvite[] = [
  {
    code: "pgp19",
    entityId: "isb-pgp-2019",
    adminName: "Priya Raman",
    adminRole: "Class rep, PGP '19",
    note: "Five years out and we've lost half the batch. This is the map — add yourself, find whoever's in your city, and come to the reunion.",
  },
  {
    code: "iitb18",
    entityId: "iitb-2018",
    adminName: "Dev Chandran",
    adminRole: "Batch coordinator",
    note: "The 2018 batch, everywhere it ended up. Join and you'll see who's in town next time you travel.",
  },
  {
    code: "climate",
    entityId: "climate",
    adminName: "Elin Berg",
    adminRole: "Community lead",
    note: "Hardware and software people working on decarbonisation. Small, vetted, and worth being findable in.",
  },
];

/**
 * A community named so it stands on its own. "Class of 2019" is meaningless
 * out of context — every institution has one — so a nested node carries its
 * parents: "ISB · PGP · Class of 2019".
 */
export function qualifiedName(entityId: string): string {
  const e = entityById(entityId);
  if (!e) return "";
  return [...ancestorsOf(entityId).map((a) => a.name), e.name].join(" · ");
}

export const inviteByCode = (code: string): CircleInvite | undefined =>
  CIRCLE_INVITES.find((i) => i.code.toLowerCase() === code.toLowerCase());

/** The invite an admin would copy out of their own community page. */
export function inviteFor(entityId: string): CircleInvite | undefined {
  return CIRCLE_INVITES.find((i) => i.entityId === entityId);
}

// ───────────────────────────────────────────────────────────── feed

export type CirclePostKind = "update" | "career" | "job" | "ask" | "milestone";

/**
 * A post, authored by someone who is actually on the map.
 *
 * That link is the point: tapping an author takes you to their pin, and a
 * post about a city flies you there. A feed whose people exist somewhere is
 * a different object from a feed of names.
 */
export type CirclePost = {
  id: string;
  /** The node it was posted at — ISB, PGP, or Class of 2019. */
  entityId: string;
  /** null = posted by the community itself, by an admin. */
  authorId: string | null;
  kind: CirclePostKind;
  body: string;
  minutesAgo: number;
  likes: number;
  comments: Array<{ id: string; authorId: string; body: string; minutesAgo: number }>;
  /** The place the post is about — a job's city, a move's destination. */
  cityId?: string;
};

const BODIES: Record<CirclePostKind, string[]> = {
  career: [
    "Wrapped up four years at {company}. Taking a few weeks off before the next thing.",
    "Started as {role} at {company} this week. Ask me in a month how it's going.",
    "Moved to {city} for the new role. Know anyone here worth meeting?",
    "Back in {city} after six years away and rebuilding my circle from scratch.",
    "Left to start something. Too early to name it, happy to talk about the problem.",
    "Switched from consulting to operating. Hardest and best decision in a while.",
    "Took the {role} job in the end. The commute is worse and the work is better.",
  ],
  job: [
    "Hiring a {role} at {company}, based in {city}. Referrals from here skip the queue.",
    "Two engineering roles open in {city}. Happy to walk anyone from this group straight in.",
    "Looking for a founding designer — {city} or remote, equity-heavy, and I'll be honest about the risk.",
    "Backfilling my old role at {company}. It's a good job and I would know.",
    "We need someone who's run support at scale. {city}, hybrid, start whenever.",
  ],
  ask: [
    "Anyone sold into Indian banks? Trying to work out whether our pricing is insane.",
    "Looking for an intro to someone who's run a marketplace at real scale.",
    "Has anyone moved a team between offices and lived to tell it? Want to know what broke.",
    "Need a second opinion on a term sheet. Twenty minutes this week, anyone?",
    "Who here has hired in {city}? Our offer acceptance rate is embarrassing.",
    "Anyone used a PEO to hire into the US from India — worth the overhead?",
  ],
  milestone: [
    "We closed our seed. {company} is hiring across the board.",
    "Shipped the thing we've been quiet about for a year. It's finally out.",
    "Crossed a million users this week and it still feels made up.",
    "First profitable quarter, four years in. Nobody tells you how boring that feels.",
    "Our first hire out of this group started Monday. The thing works.",
  ],
  update: [
    "Reading group forming for anyone who misses having one. Genuinely low commitment.",
    "Can confirm the {city} WhatsApp group remains unusable. This is better.",
    "Six of us got dinner in {city} last night off a post here. Recommend it.",
    "Spent the weekend going through the map city by city. We are everywhere.",
    "If you're lurking: say something. Half this group is people you already know.",
  ],
};

/** Posted as the institution, not a person — rare by design, which is what makes it land. */
const OFFICIAL_BODIES = [
  "Applications for the mentorship cohort close Friday. Thirty mentors, eighty seats.",
  "The directory now runs on this map. Your location setting controls all of it — nothing is shared by default.",
  "Reunion logistics are up, and the room block is going faster than last year.",
  "Campus library access is open to alumni again. Bring photo ID and your year.",
  "We're funding five chapter meetups a quarter. If you want to run one in your city, say so.",
];

const COMMENT_BODIES = [
  "Sent you a note.",
  "I did this two years ago — happy to save you the mistakes.",
  "Count me in.",
  "Can intro you to someone who's done exactly this.",
  "Congratulations, genuinely.",
  "Which part of the city?",
  "This is the first useful thing I've read all week.",
];

function fill(template: string, m: CircleMember, cityName: string): string {
  return template
    .replace(/\{company\}/g, m.company)
    .replace(/\{role\}/g, m.headline)
    .replace(/\{city\}/g, cityName);
}

function buildPosts(): CirclePost[] {
  const out: CirclePost[] = [];
  const kinds: CirclePostKind[] = ["update", "career", "job", "ask", "milestone"];

  // Member posts sit at the node the author is a direct member of — which is
  // exactly where they'd be allowed to write them.
  CIRCLE_MEMBERS.forEach((m, i) => {
    if (rnd(`posts-${m.id}`) % 100 >= 22) return; // most alumni never post, and the map works anyway
    const entityId = m.entityIds[rnd(`post-where-${m.id}`) % m.entityIds.length];
    const kind = kinds[rnd(`post-kind-${m.id}`) % kinds.length];
    const pool = BODIES[kind];
    const city = cityById(m.cityId)!;
    const commentCount = rnd(`post-cc-${m.id}`) % 3;
    out.push({
      id: `cp-${i}`,
      entityId,
      authorId: m.id,
      kind,
      body: fill(pool[rnd(`post-body-${m.id}`) % pool.length], m, city.name),
      minutesAgo: 30 + (rnd(`post-age-${m.id}`) % 20000),
      likes: rnd(`post-likes-${m.id}`) % 90,
      comments: Array.from({ length: commentCount }, (_, c) => {
        const other = CIRCLE_MEMBERS[rnd(`post-c-${m.id}-${c}`) % CIRCLE_MEMBERS.length];
        return {
          id: `cc-${i}-${c}`,
          authorId: other.id,
          body: COMMENT_BODIES[rnd(`post-cb-${m.id}-${c}`) % COMMENT_BODIES.length],
          minutesAgo: 10 + (rnd(`post-ca-${m.id}-${c}`) % 4000),
        };
      }),
      cityId: kind === "job" || kind === "career" ? m.cityId : undefined,
    });
  });

  // A handful of official posts, spread up the hierarchy — the institution's
  // own voice, which is why it belongs at the levels nobody else can write to.
  const officialNodes = ["isb", "isb-pgp", "iitb", "stanford", "climate"];
  officialNodes.forEach((entityId, i) => {
    out.push({
      id: `cp-off-${i}`,
      entityId,
      authorId: null,
      kind: "update",
      body: OFFICIAL_BODIES[i % OFFICIAL_BODIES.length],
      minutesAgo: 200 + i * 900,
      likes: 40 + ((rnd(`off-${entityId}`) % 300) | 0),
      comments: [],
    });
  });

  return out.sort((a, b) => a.minutesAgo - b.minutesAgo);
}

export const CIRCLE_POSTS: CirclePost[] = buildPosts();

/**
 * A node's own feed — exactly what was posted *at* that node, never its
 * children. ISB's feed is ISB's voice; the chatter lives one level down.
 * Rolling children up would make this byte-identical to the merged feed.
 */
export function postsAt(entityId: string): CirclePost[] {
  return CIRCLE_POSTS.filter((p) => p.entityId === entityId);
}

/**
 * Everything you're in, merged — the ceiling of this world, since there's no
 * public network above it. Reading rolls up even though writing doesn't, so
 * an ISB-wide announcement reaches every class without being re-posted.
 */
export function everythingFeed(entityIds: string[]): CirclePost[] {
  const scope = expandMembership(entityIds);
  return CIRCLE_POSTS.filter((p) => scope.has(p.entityId));
}

/** Nodes you can post at: the ones you joined, never the ancestors you inherit. */
export function postableNodes(entityIds: string[]): string[] {
  return entityIds;
}

// ───────────────────────────────────────────────── the open network

/** Coarse buckets over free-text headlines, so a map of 1,800 can be narrowed fast. */
export const ROLE_GROUPS: Array<{ id: string; label: string; match: (m: CircleMember) => boolean }> = [
  { id: "all", label: "Everyone", match: () => true },
  { id: "founder", label: "Founders", match: (m) => /founder|ceo|chief of staff/i.test(m.headline) },
  { id: "investor", label: "Investors", match: (m) => /partner|principal|fund/i.test(m.headline) },
  { id: "product", label: "Product", match: (m) => /product|design/i.test(m.headline) },
  { id: "eng", label: "Engineering", match: (m) => /engineer|data|staff|vp eng/i.test(m.headline) },
  { id: "ops", label: "Ops & growth", match: (m) => /growth|talent|gm|operating/i.test(m.headline) },
];


/**
 * Why a stranger might matter to you.
 *
 * In the closed network the answer is always "you're in the same class". Out
 * here nothing is given, so it has to be computed — a shared community, the
 * same city, or something they've offered to help with that you said you
 * wanted. Without this the open map is just a lot of faces.
 */
export function commonGround(
  me: { cityId: string; entityIds: string[]; interests?: string[]; headline?: string },
  m: CircleMember
): string | null {
  // Strongest first: something you said you wanted beats a shared postcode.
  const wanted = m.helpWith.find((h) => (me.interests ?? []).includes(h));
  if (wanted) return `Can help with ${wanted}`;
  const shared = m.entityIds.find((id) => me.entityIds.includes(id));
  if (shared) return `Also in ${entityById(shared)?.name ?? "a community you're in"}`;
  if (m.cityId === me.cityId) return `Also in ${cityById(m.cityId)?.name}`;
  const mine = ROLE_GROUPS.find((r) => r.id !== "all" && me.headline && r.match({ headline: me.headline } as CircleMember));
  if (mine && mine.match(m)) return `Also in ${mine.label.toLowerCase()}`;
  return null;
}

/** How relevant a stranger is, for ordering a list of 1,800 of them. */
export function relevance(me: { cityId: string; entityIds: string[]; interests?: string[]; headline?: string }, m: CircleMember): number {
  let score = 0;
  if (m.helpWith.some((h) => (me.interests ?? []).includes(h))) score += 4;
  if (m.entityIds.some((id) => me.entityIds.includes(id))) score += 3;
  if (m.cityId === me.cityId) score += 2;
  if (m.lookingFor) score += 1;
  return score;
}

/** Everything someone could put on their "here for" list — the open network's only onboarding question. */
export const OPEN_INTERESTS = HELP_WITH;
