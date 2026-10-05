/**
 * Visual prototype data only — Events and Companies are not real features
 * yet. There's no schema, no API route, and nothing here is persisted.
 *
 * The network/group/club hierarchy lives in lib/networks.ts; this file keeps
 * the things that sit on the map beside it.
 */

/** Shared by event tickets and community membership — nothing here charges anything. */
export type PriceTier = {
  id: string;
  name: string;
  priceLabel: string;
  /** "per year", "one-off" — shown next to the price. */
  period?: string;
  perks: string[];
  /** The one to visually lead with. */
  featured?: boolean;
};

export type MockEvent = {
  id: string;
  name: string;
  dateLabel: string;
  timeLabel: string;
  venue: string;
  city: string;
  lat: number;
  lng: number;
  attendeesMock: number;
  /** The network, group, or club hosting this — ties an event to a feed. Not every event has a host. */
  hostEntityId?: string;
  about: string;
  agenda: Array<{ time: string; item: string }>;
  /** Names drawn from the seeded demo population so avatars resolve. */
  speakers: string[];
  /** Absent = free, RSVP only. */
  tickets?: PriceTier[];
};

export type MockCompany = {
  id: string;
  name: string;
  industry: string;
  city: string;
  lat: number;
  lng: number;
  about: string;
  founded: string;
  sizeLabel: string;
  openRoles: Array<{ title: string; location: string }>;
};

const FREE_AGENDA = [
  { time: "6:30pm", item: "Doors, coffee, and name tags" },
  { time: "7:00pm", item: "Three lightning talks" },
  { time: "7:45pm", item: "Open networking" },
];

export const MOCK_EVENTS: MockEvent[] = [
  {
    id: "evt-tie-summit",
    name: "TiE Global Summit 2026",
    dateLabel: "Thu, Dec 11 – Sat, Dec 13",
    timeLabel: "9:00am onwards",
    venue: "Bengaluru International Centre",
    city: "Bengaluru",
    lat: 12.9611,
    lng: 77.6387,
    attendeesMock: 3000,
    hostEntityId: "tie-global",
    about:
      "Three days, 3,000 founders, and delegations from 40 countries. The flagship gathering of the TiE network — mentoring tables, a pitch stage, and the Charter Member dinner.",
    agenda: [
      { time: "Day 1 · 9:00am", item: "Opening keynote and global chapter roll call" },
      { time: "Day 1 · 2:00pm", item: "Mentoring tables — 1:1 slots with Charter Members" },
      { time: "Day 2 · 10:00am", item: "Pitch stage: 24 startups, 6 minutes each" },
      { time: "Day 2 · 7:30pm", item: "Charter Member dinner (separate ticket)" },
      { time: "Day 3 · 11:00am", item: "Regional breakouts and closing" },
    ],
    speakers: ["Vikram Shah", "Sarah Chen", "Nandini Rao", "Marcus Webb"],
    tickets: [
      { id: "early", name: "Early bird", priceLabel: "₹4,500", period: "one-off", perks: ["All three days", "Pitch stage access", "Summit kit"] },
      { id: "general", name: "General", priceLabel: "₹7,500", period: "one-off", perks: ["All three days", "Pitch stage access", "Mentoring tables"], featured: true },
      { id: "vip", name: "Delegate", priceLabel: "₹18,000", period: "one-off", perks: ["Everything in General", "Charter Member dinner", "Reserved seating", "Investor lounge"] },
    ],
  },
  {
    id: "evt-tie-blr-pitch",
    name: "TiE Bangalore Pitch Night",
    dateLabel: "Thu, Nov 13",
    timeLabel: "6:30pm – 9:00pm",
    venue: "TiE Bangalore chapter office, Koramangala",
    city: "Bengaluru",
    lat: 12.9352,
    lng: 77.6245,
    attendeesMock: 120,
    hostEntityId: "tie-bangalore",
    about: "Six teams, eight minutes each, then questions from a panel of Charter Members and angels. Open to the chapter; guests welcome with a ticket.",
    agenda: [
      { time: "6:30pm", item: "Registration and chai" },
      { time: "7:00pm", item: "Six pitches, eight minutes each" },
      { time: "8:15pm", item: "Panel feedback and audience Q&A" },
      { time: "8:45pm", item: "Informal networking" },
    ],
    speakers: ["Vikram Shah", "Rohit Agarwal", "Nisha Reddy"],
    tickets: [
      { id: "member", name: "Chapter member", priceLabel: "Free", period: "included", perks: ["Entry", "Pitch deck pack"] },
      { id: "guest", name: "Guest", priceLabel: "₹750", period: "one-off", perks: ["Entry", "Pitch deck pack", "Refreshments"], featured: true },
    ],
  },
  {
    id: "evt-tie-women-blr",
    name: "TiE Women Bangalore — Cohort 4 Demo",
    dateLabel: "Wed, Nov 26",
    timeLabel: "5:00pm – 8:00pm",
    venue: "Rain Tree, Indiranagar",
    city: "Bengaluru",
    lat: 12.9784,
    lng: 77.6408,
    attendeesMock: 95,
    hostEntityId: "tie-bangalore-women",
    about: "Twenty women founders close out cohort 4 with a demo evening in front of mentors and investors.",
    agenda: FREE_AGENDA,
    speakers: ["Nandini Rao", "Lavanya Reddy"],
  },
  {
    id: "evt-tie-sv-officehours",
    name: "TiE Silicon Valley Mentor Office Hours",
    dateLabel: "Every Wednesday",
    timeLabel: "4:00pm – 6:00pm",
    venue: "TiE SV, Santa Clara",
    city: "Santa Clara",
    lat: 37.3541,
    lng: -121.9552,
    attendeesMock: 40,
    hostEntityId: "tie-siliconvalley",
    about: "Twenty-minute 1:1 slots with Charter Members. Book one slot per month; bring a specific question, not a general pitch.",
    agenda: [{ time: "4:00pm", item: "Six parallel mentor tables, 20-minute slots" }],
    speakers: ["Marcus Webb", "Sarah Chen"],
  },
  {
    id: "evt-tie-dubai-dinner",
    name: "Gulf Founders Dinner",
    dateLabel: "Wed, Nov 19",
    timeLabel: "7:30pm",
    venue: "DIFC, Dubai",
    city: "Dubai",
    lat: 25.2131,
    lng: 55.2796,
    attendeesMock: 60,
    hostEntityId: "tie-dubai",
    about: "A seated dinner for founders and funders across the Gulf. Bring one person who's never been to a TiE event.",
    agenda: [
      { time: "7:30pm", item: "Arrival and introductions round" },
      { time: "8:15pm", item: "Dinner, seated by sector" },
    ],
    speakers: ["Hana Al-Rashid"],
    tickets: [
      { id: "member", name: "Chapter member", priceLabel: "AED 150", period: "one-off", perks: ["Dinner", "Seating by sector"], featured: true },
      { id: "guest", name: "Guest", priceLabel: "AED 350", period: "one-off", perks: ["Dinner", "Seating by sector"] },
    ],
  },
  {
    id: "evt-isb-teardown",
    name: "ISB Product Teardown",
    dateLabel: "Tue, Nov 11",
    timeLabel: "6:00pm – 8:00pm",
    venue: "ISB Campus, Gachibowli",
    city: "Hyderabad",
    lat: 17.4315,
    lng: 78.3489,
    attendeesMock: 44,
    hostEntityId: "isb-pgp",
    about: "A live teardown of three Indian fintech onboarding flows, run by PGP alumni now working in product.",
    agenda: FREE_AGENDA,
    speakers: ["Vikram Nair", "Priya Raman"],
  },
  {
    id: "evt-isb-reunion",
    name: "PGP Class of 2019 — Five Year Reunion",
    dateLabel: "Sat, Feb 7",
    timeLabel: "All day",
    venue: "ISB Campus, Hyderabad",
    city: "Hyderabad",
    lat: 17.4239,
    lng: 78.3413,
    attendeesMock: 310,
    hostEntityId: "isb-pgp-2019",
    about: "Five years out. Campus tours, a faculty session, and dinner on the lawns. Partners welcome.",
    agenda: [
      { time: "11:00am", item: "Campus tour and class photo" },
      { time: "2:00pm", item: "Faculty session: what changed in five years" },
      { time: "7:00pm", item: "Dinner on the lawns" },
    ],
    speakers: ["Priya Raman", "Vikram Nair", "Tara Bhatt"],
    tickets: [
      { id: "solo", name: "Alum", priceLabel: "₹3,500", period: "one-off", perks: ["Full day", "Dinner", "Class yearbook"], featured: true },
      { id: "couple", name: "Alum + partner", priceLabel: "₹6,000", period: "one-off", perks: ["Full day for two", "Dinner for two", "Class yearbook"] },
    ],
  },
  {
    id: "evt-isb-ivi-demo",
    name: "I-Venture Cohort 9 Demo Day",
    dateLabel: "Fri, Nov 28",
    timeLabel: "2:00pm – 6:00pm",
    venue: "I-Venture @ ISB, Hyderabad",
    city: "Hyderabad",
    lat: 17.4324,
    lng: 78.3401,
    attendeesMock: 180,
    hostEntityId: "isb-ivi-9",
    about: "Nine incubated companies present to an investor room. Open to ISB alumni and invited funds.",
    agenda: [
      { time: "2:00pm", item: "Nine demos, ten minutes each" },
      { time: "4:30pm", item: "Investor speed-meetings" },
    ],
    speakers: ["Sarah Chen", "Rohit Agarwal"],
  },
  {
    id: "evt-iitb-1",
    name: "IIT Bombay Alumni Meet",
    dateLabel: "Sat, Nov 8",
    timeLabel: "11:00am",
    venue: "Powai Lake Lawn",
    city: "Mumbai",
    lat: 19.128,
    lng: 72.915,
    attendeesMock: 96,
    hostEntityId: "iitb",
    about: "The annual Powai gathering. Bring a +1 — first round is on the network.",
    agenda: FREE_AGENDA,
    speakers: ["Rhea Kapoor", "Arjun Bose"],
  },
  {
    id: "evt-iitb-bay-1",
    name: "IITB Bay Area Dinner",
    dateLabel: "Sat, Nov 22",
    timeLabel: "7:00pm",
    venue: "University Ave, Palo Alto",
    city: "Palo Alto",
    lat: 37.4443,
    lng: -122.1607,
    attendeesMock: 38,
    hostEntityId: "iitb-bay",
    about: "Twelve seats, long table, no programme. Reply to claim one.",
    agenda: [{ time: "7:00pm", item: "Dinner, one long table" }],
    speakers: ["Marcus Webb"],
    tickets: [{ id: "seat", name: "Seat at the table", priceLabel: "$60", period: "one-off", perks: ["Dinner", "Drinks"], featured: true }],
  },
  {
    id: "evt-stan-1",
    name: "Stanford Alumni SF Social",
    dateLabel: "Fri, Nov 14",
    timeLabel: "6:30pm",
    venue: "The Battery, SF",
    city: "San Francisco",
    lat: 37.7983,
    lng: -122.4015,
    attendeesMock: 74,
    hostEntityId: "stanford",
    about: "Alums from every era welcome. Drinks, no programme, name tags optional.",
    agenda: FREE_AGENDA,
    speakers: ["Emma Whitfield"],
    tickets: [{ id: "general", name: "General", priceLabel: "$25", period: "one-off", perks: ["Entry", "First drink"], featured: true }],
  },
  {
    id: "evt-exg-1",
    name: "Ex-Googlers Bengaluru Mixer",
    dateLabel: "Thu, Nov 6",
    timeLabel: "7:00pm",
    venue: "Toit Brewpub",
    city: "Bengaluru",
    lat: 12.9698,
    lng: 77.641,
    attendeesMock: 51,
    hostEntityId: "exgoogle",
    about: "Back room is held for us. Xooglers and anyone who's ever survived perf.",
    agenda: FREE_AGENDA,
    speakers: ["Meera Pillai"],
  },
  {
    id: "evt-blr-1",
    name: "Founders & Coffee",
    dateLabel: "Sat, Nov 15",
    timeLabel: "10:00am",
    venue: "Third Wave, Indiranagar",
    city: "Bengaluru",
    lat: 12.9789,
    lng: 77.6408,
    attendeesMock: 42,
    hostEntityId: "blr-founders",
    about: "Informal Saturday coffee. Come swap fundraising war stories.",
    agenda: [{ time: "10:00am", item: "Coffee, no agenda" }],
    speakers: ["Vikram Shah"],
  },
  {
    id: "evt-wip-1",
    name: "Women Who Build",
    dateLabel: "Wed, Nov 29",
    timeLabel: "5:00pm",
    venue: "Rain Tree, Banjara Hills",
    city: "Hyderabad",
    lat: 17.4126,
    lng: 78.4482,
    attendeesMock: 37,
    hostEntityId: "women-product",
    about: "Mentor pairings for the next cohort get announced here.",
    agenda: FREE_AGENDA,
    speakers: ["Nandini Rao"],
  },
  {
    id: "evt-design-1",
    name: "Product Design Meetup",
    dateLabel: "Thu, Nov 20",
    timeLabel: "6:30pm",
    venue: "WeWork Galaxy",
    city: "Bengaluru",
    lat: 12.9345,
    lng: 77.6101,
    attendeesMock: 88,
    hostEntityId: "design-leaders",
    about: "Portfolio reviews in the first hour, talks in the second.",
    agenda: FREE_AGENDA,
    speakers: ["Lavanya Reddy", "Priya Raman"],
  },
  {
    id: "evt-yc-1",
    name: "SF Founders Dinner",
    dateLabel: "Tue, Nov 18",
    timeLabel: "7:00pm",
    venue: "SoMa Loft",
    city: "San Francisco",
    lat: 37.7793,
    lng: -122.3975,
    attendeesMock: 54,
    hostEntityId: "yc",
    about: "YC alumni across batches. One table, strict no-pitching rule.",
    agenda: [{ time: "7:00pm", item: "Dinner" }],
    speakers: ["Rohit Agarwal", "Sarah Chen"],
    tickets: [{ id: "seat", name: "Seat", priceLabel: "$45", period: "one-off", perks: ["Dinner"], featured: true }],
  },
  {
    id: "evt-climate-1",
    name: "Berlin Design Jam",
    dateLabel: "Fri, Nov 21",
    timeLabel: "6:00pm",
    venue: "Factory Berlin",
    city: "Berlin",
    lat: 52.5309,
    lng: 13.3849,
    attendeesMock: 46,
    hostEntityId: "climate",
    about: "A working session on how to communicate carbon numbers people actually believe.",
    agenda: FREE_AGENDA,
    speakers: ["Elin Berg", "Lukas Richter"],
  },
  {
    id: "evt-hike-1",
    name: "Nandi Hills Sunrise Hike",
    dateLabel: "Sat, Nov 15",
    timeLabel: "5:00am",
    venue: "Nandi Hills base",
    city: "Bengaluru",
    lat: 13.3702,
    lng: 77.6835,
    attendeesMock: 23,
    hostEntityId: "club-hikers",
    about: "Early start, steep first kilometre, breakfast at the top. Bring a torch.",
    agenda: [
      { time: "5:00am", item: "Meet at the base" },
      { time: "7:00am", item: "Breakfast at the summit" },
    ],
    speakers: ["Rohan Mehta"],
  },
  {
    id: "evt-sg-1",
    name: "Singapore Growth Summit",
    dateLabel: "Sat, Nov 22",
    timeLabel: "9:00am",
    venue: "Marina Bay Sands Expo",
    city: "Singapore",
    lat: 1.2834,
    lng: 103.8607,
    attendeesMock: 210,
    hostEntityId: "tie-singapore",
    about: "A full-day growth conference run by the Singapore chapter.",
    agenda: [
      { time: "9:00am", item: "Keynote" },
      { time: "11:00am", item: "Three parallel tracks: growth, pricing, retention" },
      { time: "4:00pm", item: "Closing panel" },
    ],
    speakers: ["Wei Zhang", "Olivia Bennett"],
    tickets: [
      { id: "early", name: "Early bird", priceLabel: "S$120", period: "one-off", perks: ["Full day", "All tracks"] },
      { id: "general", name: "General", priceLabel: "S$180", period: "one-off", perks: ["Full day", "All tracks", "Lunch"], featured: true },
    ],
  },
];

export const MOCK_COMPANIES: MockCompany[] = [
  {
    id: "co-driftwood",
    name: "Driftwood",
    industry: "Travel tech",
    city: "Bengaluru",
    lat: 12.9634,
    lng: 77.5855,
    about: "Trip planning for people who hate planning trips. Series A, selling across India and Southeast Asia.",
    founded: "2019",
    sizeLabel: "80–120 people",
    openRoles: [
      { title: "Senior Backend Engineer", location: "Bengaluru · Hybrid" },
      { title: "Product Designer", location: "Remote (India)" },
    ],
  },
  {
    id: "co-nimbus",
    name: "Nimbus",
    industry: "Cloud infra",
    city: "Bengaluru",
    lat: 12.9719,
    lng: 77.6412,
    about: "Managed Kubernetes and cost tooling for mid-market engineering teams.",
    founded: "2017",
    sizeLabel: "200–400 people",
    openRoles: [
      { title: "Staff Platform Engineer", location: "Bengaluru" },
      { title: "Developer Advocate", location: "Bengaluru · Hybrid" },
      { title: "Enterprise AE", location: "Remote (US)" },
    ],
  },
  {
    id: "co-harbor",
    name: "Harbor",
    industry: "Fintech",
    city: "Hyderabad",
    lat: 17.4474,
    lng: 78.3569,
    about: "Payments infrastructure for Indian SMBs — collections, payouts, and reconciliation in one API.",
    founded: "2020",
    sizeLabel: "120–200 people",
    openRoles: [{ title: "ML Engineer, Risk", location: "Hyderabad" }],
  },
  {
    id: "co-clearline",
    name: "Clearline",
    industry: "Insurtech",
    city: "Hyderabad",
    lat: 17.4239,
    lng: 78.4738,
    about: "Health insurance claims, automated end to end. Works with 40 hospital networks.",
    founded: "2018",
    sizeLabel: "200–400 people",
    openRoles: [
      { title: "VP Engineering", location: "Hyderabad" },
      { title: "Claims Operations Lead", location: "Hyderabad" },
    ],
  },
  {
    id: "co-northstar",
    name: "Northstar Labs",
    industry: "AI research",
    city: "San Francisco",
    lat: 37.7946,
    lng: -122.3999,
    about: "Applied research lab working on evaluation and reliability for production language models.",
    founded: "2022",
    sizeLabel: "40–80 people",
    openRoles: [
      { title: "Research Engineer", location: "San Francisco" },
      { title: "Member of Technical Staff", location: "San Francisco" },
    ],
  },
  {
    id: "co-horizon",
    name: "Horizon Ventures",
    industry: "Venture capital",
    city: "New York",
    lat: 40.7484,
    lng: -73.9857,
    about: "Early-stage B2B SaaS fund. Writes first cheques between $500k and $3M.",
    founded: "2014",
    sizeLabel: "10–20 people",
    openRoles: [{ title: "Investment Associate", location: "New York" }],
  },
  {
    id: "co-lattice",
    name: "Lattice",
    industry: "HR tech",
    city: "London",
    lat: 51.5145,
    lng: -0.0922,
    about: "Performance and engagement tooling for companies between 100 and 5,000 people.",
    founded: "2015",
    sizeLabel: "400–800 people",
    openRoles: [{ title: "Engineering Director", location: "London · Hybrid" }],
  },
  {
    id: "co-monzo",
    name: "Monzo",
    industry: "Banking",
    city: "London",
    lat: 51.5225,
    lng: -0.0862,
    about: "A bank built mobile-first, now serving several million current accounts.",
    founded: "2015",
    sizeLabel: "2,000+ people",
    openRoles: [
      { title: "Senior Product Designer", location: "London" },
      { title: "Backend Engineer, Payments", location: "London · Remote-friendly" },
    ],
  },
  {
    id: "co-stealth",
    name: "Stealth",
    industry: "Early-stage startup",
    city: "Singapore",
    lat: 1.2905,
    lng: 103.852,
    about: "Pre-seed, building in logistics. Not saying much more yet.",
    founded: "2025",
    sizeLabel: "Under 10 people",
    openRoles: [{ title: "Founding Engineer", location: "Singapore" }],
  },
  {
    id: "co-amber",
    name: "Amber Robotics",
    industry: "Robotics",
    city: "Berlin",
    lat: 52.5096,
    lng: 13.3989,
    about: "Warehouse robotics for cold-chain facilities across the EU.",
    founded: "2021",
    sizeLabel: "80–120 people",
    openRoles: [
      { title: "Controls Engineer", location: "Berlin" },
      { title: "Field Operations Manager", location: "Berlin · Travel" },
    ],
  },
];

export function eventById(id: string): MockEvent | undefined {
  return MOCK_EVENTS.find((e) => e.id === id);
}

export function companyById(id: string): MockCompany | undefined {
  return MOCK_COMPANIES.find((c) => c.id === id);
}

/** A stable (not random-each-render) small hash, used to derive deterministic mock numbers/picks from a seed string. */
export function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** A plausible, stable "N connections" figure for a profile — not a real count, just enough to make the card feel alive. */
export function mockConnectionCount(id: string): number {
  return 12 + (hashSeed(id) % 480);
}

/** How many of the already-loaded profiles list this company — a real count over mock company data, not a fabricated number. */
export function countPeopleAtCompany(profiles: Array<{ company: string | null }>, companyName: string): number {
  return profiles.filter((p) => p.company?.toLowerCase() === companyName.toLowerCase()).length;
}
