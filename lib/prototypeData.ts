/**
 * Visual prototype data only — Events and Companies are not real features
 * yet. There's no schema, no API route, and nothing here is persisted.
 *
 * The network/group/club hierarchy lives in lib/networks.ts; this file keeps
 * the things that sit on the map beside it.
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
  /** The network, group, or club hosting this — ties an event to a feed. Not every event has a host. */
  hostEntityId?: string;
};

export type MockCompany = {
  id: string;
  name: string;
  industry: string;
  city: string;
  lat: number;
  lng: number;
};

export const MOCK_EVENTS: MockEvent[] = [
  { id: "evt-blr-1", name: "Founders & Coffee", dateLabel: "Sat, Oct 18 · 10am", venue: "Third Wave, Indiranagar", city: "Bengaluru", lat: 12.9789, lng: 77.6408, attendeesMock: 42, hostEntityId: "net-blr-founders" },
  { id: "evt-blr-2", name: "Product Design Meetup", dateLabel: "Thu, Oct 23 · 6:30pm", venue: "WeWork Galaxy", city: "Bengaluru", lat: 12.9345, lng: 77.6101, attendeesMock: 88, hostEntityId: "net-design-leaders" },
  { id: "evt-hyd-1", name: "HITEC City Tech Mixer", dateLabel: "Fri, Oct 17 · 7pm", venue: "T-Hub, Raidurg", city: "Hyderabad", lat: 17.4455, lng: 78.3772, attendeesMock: 63, hostEntityId: "net-hyd-tech" },
  { id: "evt-hyd-2", name: "Women Who Build", dateLabel: "Wed, Oct 29 · 5pm", venue: "Rain Tree, Banjara Hills", city: "Hyderabad", lat: 17.4126, lng: 78.4482, attendeesMock: 37, hostEntityId: "net-women-product" },
  { id: "evt-sf-1", name: "SF Founders Dinner", dateLabel: "Tue, Oct 21 · 7pm", venue: "SoMa Loft", city: "San Francisco", lat: 37.7793, lng: -122.3975, attendeesMock: 54, hostEntityId: "net-yc" },
  { id: "evt-nyc-1", name: "NYC Builders Breakfast", dateLabel: "Mon, Oct 20 · 9am", venue: "Flatiron Hub", city: "New York", lat: 40.7411, lng: -73.9897, attendeesMock: 29 },
  { id: "evt-lon-1", name: "London Product Circle", dateLabel: "Thu, Oct 30 · 6pm", venue: "Shoreditch Works", city: "London", lat: 51.5255, lng: -0.0778, attendeesMock: 71, hostEntityId: "net-pm-india" },
  { id: "evt-sg-1", name: "Singapore Growth Summit", dateLabel: "Sat, Nov 1 · 9am", venue: "Marina Bay Sands Expo", city: "Singapore", lat: 1.2834, lng: 103.8607, attendeesMock: 210 },
  { id: "evt-ber-1", name: "Berlin Design Jam", dateLabel: "Fri, Oct 24 · 6pm", venue: "Factory Berlin", city: "Berlin", lat: 52.5309, lng: 13.3849, attendeesMock: 46, hostEntityId: "net-climate" },
  { id: "evt-mum-1", name: "Mumbai Fintech Night", dateLabel: "Wed, Oct 22 · 7pm", venue: "BKC Terrace", city: "Mumbai", lat: 19.066, lng: 72.869, attendeesMock: 58 },
  { id: "evt-iitb-1", name: "IIT Bombay Alumni Meet", dateLabel: "Sat, Nov 8 · 11am", venue: "Powai Lake Lawn", city: "Mumbai", lat: 19.128, lng: 72.915, attendeesMock: 96, hostEntityId: "net-iitb" },
  { id: "evt-iitb-bay-1", name: "IITB Bay Area Dinner", dateLabel: "Sat, Nov 22 · 7pm", venue: "University Ave, Palo Alto", city: "Palo Alto", lat: 37.4443, lng: -122.1607, attendeesMock: 38, hostEntityId: "grp-iitb-bay" },
  { id: "evt-exg-1", name: "Ex-Googlers Bengaluru Mixer", dateLabel: "Thu, Nov 6 · 7pm", venue: "Toit Brewpub", city: "Bengaluru", lat: 12.9698, lng: 77.641, attendeesMock: 51, hostEntityId: "net-exgoogle" },
  { id: "evt-stan-1", name: "Stanford Alumni SF Social", dateLabel: "Fri, Nov 14 · 6:30pm", venue: "The Battery, SF", city: "San Francisco", lat: 37.7983, lng: -122.4015, attendeesMock: 74, hostEntityId: "net-stanford" },
  { id: "evt-isb-1", name: "ISB Product Teardown", dateLabel: "Tue, Nov 11 · 6pm", venue: "ISB Campus, Gachibowli", city: "Hyderabad", lat: 17.4315, lng: 78.3489, attendeesMock: 44, hostEntityId: "grp-isb-product" },
  { id: "evt-hike-1", name: "Nandi Hills Sunrise Hike", dateLabel: "Sat, Nov 15 · 5am", venue: "Nandi Hills base", city: "Bengaluru", lat: 13.3702, lng: 77.6835, attendeesMock: 23, hostEntityId: "club-hikers" },
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
  { id: "co-stealth", name: "Stealth", industry: "Early-stage startup", city: "Singapore", lat: 1.2905, lng: 103.852 },
  { id: "co-amber", name: "Amber Robotics", industry: "Robotics", city: "Berlin", lat: 52.5096, lng: 13.3989 },
];

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
