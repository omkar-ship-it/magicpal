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
export type LocationMode = "off" | "base" | "live";

export const LOCATION_MODES: Array<{ id: LocationMode; label: string; detail: string; emoji: string }> = [
  { id: "off", label: "Off the map", detail: "Nobody sees where you are. You're still in the directory and can still message anyone.", emoji: "🚫" },
  { id: "base", label: "My city", detail: "Members see which city you're based in — never a street or an address.", emoji: "🏙" },
  { id: "live", label: "My live location", detail: "Members see roughly where you are now. Useful when you travel; switch it off any time.", emoji: "📍" },
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
};

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

export type CircleEvent = {
  id: string;
  name: string;
  hostEntityId: string;
  venue: string;
  cityId: string;
  /** The venue itself, not the city — the beacon view zooms to this. */
  lat: number;
  lng: number;
  dateLabel: string;
  timeLabel: string;
  /** Happening right now, so beacons are live and the map has something to show. */
  liveNow: boolean;
  about: string;
};

export const CIRCLE_EVENTS: CircleEvent[] = [
  {
    id: "ce-reunion",
    name: "PGP '19 Five-Year Reunion",
    hostEntityId: "isb-pgp-2019",
    venue: "ISB Campus, Gachibowli",
    cityId: "hyd",
    lat: 17.4239,
    lng: 78.3413,
    dateLabel: "Today",
    timeLabel: "6:00pm – late",
    liveNow: true,
    about: "Five years out. Dinner on the lawn, the class photo nobody will agree to, and the bar until it closes.",
  },
  {
    id: "ce-london",
    name: "London Alumni Supper",
    hostEntityId: "isb-pgp-2019",
    venue: "Dishoom, Shoreditch",
    cityId: "lon",
    lat: 51.5255,
    lng: -0.0776,
    dateLabel: "Thu, Oct 15",
    timeLabel: "7:30pm",
    liveNow: false,
    about: "Long table, one bill, no agenda. Whoever's in town.",
  },
  {
    id: "ce-sf",
    name: "Bay Area Founders Breakfast",
    hostEntityId: "iitb-bay",
    venue: "Blue Bottle, Mint Plaza",
    cityId: "sfo",
    lat: 37.7825,
    lng: -122.4089,
    dateLabel: "Sat, Oct 10",
    timeLabel: "9:00am",
    liveNow: false,
    about: "Six founders, ninety minutes, one problem each.",
  },
  {
    id: "ce-climate",
    name: "Climate Hardware Teardown",
    hostEntityId: "climate",
    venue: "Factory Berlin, Mitte",
    cityId: "ber",
    lat: 52.5323,
    lng: 13.3989,
    dateLabel: "Fri, Oct 23",
    timeLabel: "5:00pm",
    liveNow: false,
    about: "Three teams open up their hardware and take questions on what broke.",
  },
  {
    id: "ce-blr",
    name: "Bengaluru Founders Mixer",
    hostEntityId: "blr-founders",
    venue: "Toit, Indiranagar",
    cityId: "blr",
    lat: 12.9784,
    lng: 77.6408,
    dateLabel: "Wed, Oct 14",
    timeLabel: "7:00pm",
    liveNow: false,
    about: "No talks, no badges. Beer and whoever shows up.",
  },
];

export const eventById = (id: string): CircleEvent | undefined => CIRCLE_EVENTS.find((e) => e.id === id);

/** Who's coming — the host community's members, deterministically thinned out. */
export function attendeesOf(eventId: string): CircleMember[] {
  const ev = eventById(eventId);
  if (!ev) return [];
  return membersOf(ev.hostEntityId).filter((m) => rnd(`going-${eventId}-${m.id}`) % 100 < 42);
}

/**
 * Who's beaconing at the venue right now.
 *
 * A beacon is deliberately narrower than the location setting above: it
 * shares your precise spot with the people at *this* event, for as long as
 * it runs — which is why someone normally "off the map" can still turn one
 * on without changing what the rest of the network sees.
 */
export function beaconsAt(eventId: string): CircleMember[] {
  const ev = eventById(eventId);
  if (!ev?.liveNow) return [];
  return attendeesOf(eventId).filter((m) => rnd(`beacon-${eventId}-${m.id}`) % 100 < 38);
}

/** A beaconing member's spot inside the venue — metres apart, not kilometres. */
export function beaconPoint(ev: CircleEvent, m: CircleMember): [number, number] {
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
