/**
 * Visual prototype data only — Events, Companies, Institutions, Groups, and
 * Announcements are not real features yet. There's no schema, no API route,
 * and nothing here is persisted; it exists purely so the map can demonstrate
 * what a multi-layer, group-aware experience would feel like. Swap this file
 * out (and only this file) if/when any of these become real.
 */

export type MockEvent = {
  id: string;
  name: string;
  dateLabel: string;
  venue: string;
  city: string;
  lat: number;
  lng: number;
  attendeesMock: number;
  /** Which community/alumni network is hosting this — ties the Events layer to a Community Hub. Not every event has a host. */
  hostGroupId?: string;
};

export type MockCompany = {
  id: string;
  name: string;
  industry: string;
  city: string;
  lat: number;
  lng: number;
};

export type InstitutionKind = "university" | "employer_alumni" | "professional_body";

export type MockInstitution = {
  id: string;
  /** 1:1 link to the alumni network this institution grants — opens the same Community Hub. */
  groupId: string;
  name: string;
  kind: InstitutionKind;
  city: string;
  lat: number;
  lng: number;
};

export type GroupType = "alumni" | "community" | "group";

export type MockGroup = {
  id: string;
  name: string;
  type: GroupType;
  memberCountMock: number;
  missionMock: string;
};

export type MockAnnouncement = {
  id: string;
  groupId: string;
  author: string;
  body: string;
  dateLabel: string;
};

export const MOCK_EVENTS: MockEvent[] = [
  { id: "evt-blr-1", name: "Founders & Coffee", dateLabel: "Sat, Oct 18 · 10am", venue: "Third Wave, Indiranagar", city: "Bengaluru", lat: 12.9789, lng: 77.6408, attendeesMock: 42, hostGroupId: "grp-blr-founders" },
  { id: "evt-blr-2", name: "Product Design Meetup", dateLabel: "Thu, Oct 23 · 6:30pm", venue: "WeWork Galaxy", city: "Bengaluru", lat: 12.9345, lng: 77.6101, attendeesMock: 88, hostGroupId: "grp-design-leaders" },
  { id: "evt-hyd-1", name: "HITEC City Tech Mixer", dateLabel: "Fri, Oct 17 · 7pm", venue: "T-Hub, Raidurg", city: "Hyderabad", lat: 17.4455, lng: 78.3772, attendeesMock: 63 },
  { id: "evt-hyd-2", name: "Women Who Build", dateLabel: "Wed, Oct 29 · 5pm", venue: "Rain Tree, Banjara Hills", city: "Hyderabad", lat: 17.4126, lng: 78.4482, attendeesMock: 37, hostGroupId: "grp-women-product" },
  { id: "evt-sf-1", name: "SF Founders Dinner", dateLabel: "Tue, Oct 21 · 7pm", venue: "SoMa Loft", city: "San Francisco", lat: 37.7793, lng: -122.3975, attendeesMock: 54 },
  { id: "evt-nyc-1", name: "NYC Builders Breakfast", dateLabel: "Mon, Oct 20 · 9am", venue: "Flatiron Hub", city: "New York", lat: 40.7411, lng: -73.9897, attendeesMock: 29 },
  { id: "evt-lon-1", name: "London Product Circle", dateLabel: "Thu, Oct 30 · 6pm", venue: "Shoreditch Works", city: "London", lat: 51.5255, lng: -0.0778, attendeesMock: 71 },
  { id: "evt-sg-1", name: "Singapore Growth Summit", dateLabel: "Sat, Nov 1 · 9am", venue: "Marina Bay Sands Expo", city: "Singapore", lat: 1.2834, lng: 103.8607, attendeesMock: 210 },
  { id: "evt-ber-1", name: "Berlin Design Jam", dateLabel: "Fri, Oct 24 · 6pm", venue: "Factory Berlin", city: "Berlin", lat: 52.5309, lng: 13.3849, attendeesMock: 46 },
  { id: "evt-mum-1", name: "Mumbai Fintech Night", dateLabel: "Wed, Oct 22 · 7pm", venue: "BKC Terrace", city: "Mumbai", lat: 19.0660, lng: 72.8690, attendeesMock: 58 },
  { id: "evt-iitb-1", name: "IIT Bombay Alumni Meet", dateLabel: "Sat, Nov 8 · 11am", venue: "Powai Lake Lawn", city: "Mumbai", lat: 19.1280, lng: 72.9150, attendeesMock: 96, hostGroupId: "grp-iitb" },
  { id: "evt-exg-1", name: "Ex-Googlers Bengaluru Mixer", dateLabel: "Thu, Nov 6 · 7pm", venue: "Toit Brewpub", city: "Bengaluru", lat: 12.9698, lng: 77.6410, attendeesMock: 51, hostGroupId: "grp-exgoogle" },
];

export const MOCK_COMPANIES: MockCompany[] = [
  { id: "co-driftwood", name: "Driftwood", industry: "Travel tech", city: "Bengaluru", lat: 12.9634, lng: 77.5855 },
  { id: "co-nimbus", name: "Nimbus", industry: "Cloud infra", city: "Bengaluru", lat: 12.9719, lng: 77.6412 },
  { id: "co-harbor", name: "Harbor", industry: "Fintech", city: "Hyderabad", lat: 17.4474, lng: 78.3569 },
  { id: "co-clearline", name: "Clearline", industry: "Insurtech", city: "Hyderabad", lat: 17.4239, lng: 78.4738 },
  { id: "co-northstar", name: "Northstar Labs", industry: "AI research", city: "San Francisco", lat: 37.7946, lng: -122.3999 },
  { id: "co-horizon", name: "Horizon Ventures", industry: "Venture capital", city: "New York", lat: 40.7484, lng: -73.9857 },
  { id: "co-lattice", name: "Lattice", industry: "HR tech", city: "London", lat: 51.5145, lng: -0.0922 },
  { id: "co-monzo", name: "Monzo", industry: "Banking", city: "London", lat: 51.5225, lng: -0.0862 },
  { id: "co-stealth", name: "Stealth", industry: "Early-stage startup", city: "Singapore", lat: 1.2905, lng: 103.8520 },
  { id: "co-amber", name: "Amber Robotics", industry: "Robotics", city: "Berlin", lat: 52.5096, lng: 13.3989 },
];

export const MOCK_INSTITUTIONS: MockInstitution[] = [
  { id: "inst-iitb", groupId: "grp-iitb", name: "IIT Bombay", kind: "university", city: "Mumbai", lat: 19.1334, lng: 72.9133 },
  { id: "inst-isb", groupId: "grp-isb", name: "Indian School of Business", kind: "university", city: "Hyderabad", lat: 17.4239, lng: 78.3413 },
  { id: "inst-google", groupId: "grp-exgoogle", name: "Google Bengaluru", kind: "employer_alumni", city: "Bengaluru", lat: 12.9351, lng: 77.6947 },
];

export const MOCK_GROUPS: MockGroup[] = [
  { id: "grp-iitb", name: "IIT Bombay Alumni", type: "alumni", memberCountMock: 1240, missionMock: "Connecting IIT Bombay graduates building and leading across the world." },
  { id: "grp-isb", name: "ISB Alumni", type: "alumni", memberCountMock: 860, missionMock: "A network of ISB graduates in product, strategy, and venture." },
  { id: "grp-exgoogle", name: "Ex-Google", type: "alumni", memberCountMock: 540, missionMock: "Former Googlers helping each other build what's next." },
  { id: "grp-blr-founders", name: "Bengaluru Founders", type: "community", memberCountMock: 2100, missionMock: "Early-stage founders in Bengaluru trading notes and warm intros." },
  { id: "grp-women-product", name: "Women in Product", type: "community", memberCountMock: 1680, missionMock: "Product leaders supporting other women building product." },
  { id: "grp-design-leaders", name: "Design Leaders India", type: "community", memberCountMock: 910, missionMock: "Senior design leaders across India's product companies." },
  { id: "grp-hikers", name: "Weekend Hikers", type: "group", memberCountMock: 320, missionMock: "Trail-first, work-second — a standing Saturday hike." },
  { id: "grp-bookclub", name: "Founders' Book Club", type: "group", memberCountMock: 150, missionMock: "One business book a month, one dinner to argue about it." },
];

export const MOCK_ANNOUNCEMENTS: MockAnnouncement[] = [
  { id: "ann-iitb-1", groupId: "grp-iitb", author: "Rhea Kapoor", body: "Alumni meet in Powai on Nov 8 — bring a +1, first round's on the network.", dateLabel: "2 days ago" },
  { id: "ann-iitb-2", groupId: "grp-iitb", author: "Rhea Kapoor", body: "If you're hiring, drop a note — we're building a referral thread for new grads.", dateLabel: "1 week ago" },
  { id: "ann-blr-founders-1", groupId: "grp-blr-founders", author: "Vikram Shah", body: "Third Wave on Saturday — come swap fundraising war stories.", dateLabel: "3 days ago" },
  { id: "ann-women-product-1", groupId: "grp-women-product", author: "Nandini Rao", body: "Mentorship sign-ups are open for Q1 — 20 spots, first come first served.", dateLabel: "5 days ago" },
  { id: "ann-exgoogle-1", groupId: "grp-exgoogle", author: "Arjun Mehta", body: "Mixer at Toit on Nov 6 — RSVP so we can hold the back room.", dateLabel: "1 day ago" },
];

/** A stable (not random-each-render) small hash, used to derive deterministic mock numbers/picks from a seed string. */
function hashSeed(seed: string): number {
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

/** 0–2 groups per person, picked deterministically from their name so the same person always shows the same affiliations. */
export function mockGroupsForName(name: string): MockGroup[] {
  const h = hashSeed(name);
  if (h % 5 === 0) return [];
  const first = MOCK_GROUPS[h % MOCK_GROUPS.length];
  const second = MOCK_GROUPS[(h >>> 3) % MOCK_GROUPS.length];
  if (h % 3 === 0 || second.id === first.id) return [first];
  return [first, second];
}

/** How many of the already-loaded nearby profiles list this company — a real count over mock company data, not a fabricated number. */
export function countPeopleAtCompany(profiles: Array<{ company: string | null }>, companyName: string): number {
  return profiles.filter((p) => p.company?.toLowerCase() === companyName.toLowerCase()).length;
}

/** Which of the already-loaded profiles belong to a given group — a real filter over mock affiliation data, not a fabricated member list. */
export function membersInGroup<T extends { name: string }>(people: T[], groupId: string): T[] {
  return people.filter((p) => mockGroupsForName(p.name).some((g) => g.id === groupId));
}
