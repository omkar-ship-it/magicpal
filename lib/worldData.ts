import { CIRCLE_CITIES, rnd } from "./circleData";

/**
 * The map at the scale it would be with a million people on it.
 *
 * Nothing here is drawn by Mapbox. At world zoom a basemap is a picture of
 * coastlines with a few dots on it, and the thing worth showing is the
 * opposite: the world drawn *by* the people, with land implied by where
 * they are rather than outlined underneath them. Continents appear because
 * populations are shaped like continents.
 *
 * So this is a deterministic population field in plain equirectangular
 * coordinates, rendered to a canvas. Deterministic matters: the same world
 * on every machine, every reload, so a screenshot taken for a pitch is the
 * screenshot everybody else sees.
 */

export type Attractor = { name: string; lat: number; lng: number; weight: number };

/**
 * Real cities, used as the places people actually cluster around.
 *
 * The member roster's own fifty-four cities are the seed; these are the
 * rest of the inhabited world, without which the field reads as "a product
 * used in nine cities" rather than as a planet. Weights are rough
 * population order of magnitude, not census figures — the only property
 * that matters is that Lagos draws more pins than Lisbon.
 */
const WORLD: Attractor[] = [
  // North America
  { name: "New York", lat: 40.71, lng: -74.0, weight: 30 },
  { name: "Los Angeles", lat: 34.05, lng: -118.24, weight: 24 },
  { name: "Chicago", lat: 41.88, lng: -87.63, weight: 18 },
  { name: "Toronto", lat: 43.65, lng: -79.38, weight: 16 },
  { name: "Mexico City", lat: 19.43, lng: -99.13, weight: 28 },
  { name: "Houston", lat: 29.76, lng: -95.37, weight: 14 },
  { name: "Miami", lat: 25.76, lng: -80.19, weight: 13 },
  { name: "Seattle", lat: 47.61, lng: -122.33, weight: 12 },
  { name: "Vancouver", lat: 49.28, lng: -123.12, weight: 10 },
  { name: "Montreal", lat: 45.5, lng: -73.57, weight: 10 },
  { name: "Atlanta", lat: 33.75, lng: -84.39, weight: 12 },
  { name: "Denver", lat: 39.74, lng: -104.99, weight: 9 },
  { name: "Guadalajara", lat: 20.67, lng: -103.35, weight: 10 },
  { name: "Havana", lat: 23.11, lng: -82.37, weight: 7 },
  { name: "Guatemala City", lat: 14.63, lng: -90.51, weight: 8 },
  { name: "Panama City", lat: 8.98, lng: -79.52, weight: 6 },
  { name: "Minneapolis", lat: 44.98, lng: -93.27, weight: 8 },
  { name: "Calgary", lat: 51.05, lng: -114.07, weight: 7 },
  { name: "Anchorage", lat: 61.22, lng: -149.9, weight: 3 },
  // South America
  { name: "São Paulo", lat: -23.55, lng: -46.63, weight: 28 },
  { name: "Rio de Janeiro", lat: -22.91, lng: -43.17, weight: 20 },
  { name: "Buenos Aires", lat: -34.6, lng: -58.38, weight: 22 },
  { name: "Lima", lat: -12.05, lng: -77.04, weight: 18 },
  { name: "Bogotá", lat: 4.71, lng: -74.07, weight: 18 },
  { name: "Santiago", lat: -33.45, lng: -70.67, weight: 14 },
  { name: "Caracas", lat: 10.48, lng: -66.9, weight: 12 },
  { name: "Brasília", lat: -15.79, lng: -47.88, weight: 11 },
  { name: "Recife", lat: -8.05, lng: -34.88, weight: 10 },
  { name: "Quito", lat: -0.18, lng: -78.47, weight: 9 },
  { name: "Manaus", lat: -3.12, lng: -60.02, weight: 7 },
  { name: "Montevideo", lat: -34.9, lng: -56.16, weight: 6 },
  { name: "La Paz", lat: -16.5, lng: -68.15, weight: 7 },
  { name: "Porto Alegre", lat: -30.03, lng: -51.23, weight: 8 },
  // Europe
  { name: "London", lat: 51.51, lng: -0.13, weight: 26 },
  { name: "Paris", lat: 48.86, lng: 2.35, weight: 24 },
  { name: "Madrid", lat: 40.42, lng: -3.7, weight: 18 },
  { name: "Barcelona", lat: 41.39, lng: 2.17, weight: 14 },
  { name: "Rome", lat: 41.9, lng: 12.5, weight: 16 },
  { name: "Milan", lat: 45.46, lng: 9.19, weight: 13 },
  { name: "Berlin", lat: 52.52, lng: 13.4, weight: 18 },
  { name: "Munich", lat: 48.14, lng: 11.58, weight: 11 },
  { name: "Hamburg", lat: 53.55, lng: 9.99, weight: 10 },
  { name: "Amsterdam", lat: 52.37, lng: 4.9, weight: 13 },
  { name: "Brussels", lat: 50.85, lng: 4.35, weight: 10 },
  { name: "Zurich", lat: 47.38, lng: 8.54, weight: 9 },
  { name: "Vienna", lat: 48.21, lng: 16.37, weight: 11 },
  { name: "Prague", lat: 50.08, lng: 14.44, weight: 10 },
  { name: "Warsaw", lat: 52.23, lng: 21.01, weight: 13 },
  { name: "Kyiv", lat: 50.45, lng: 30.52, weight: 14 },
  { name: "Moscow", lat: 55.76, lng: 37.62, weight: 24 },
  { name: "St Petersburg", lat: 59.93, lng: 30.34, weight: 14 },
  { name: "Stockholm", lat: 59.33, lng: 18.07, weight: 9 },
  { name: "Oslo", lat: 59.91, lng: 10.75, weight: 7 },
  { name: "Copenhagen", lat: 55.68, lng: 12.57, weight: 8 },
  { name: "Helsinki", lat: 60.17, lng: 24.94, weight: 7 },
  { name: "Dublin", lat: 53.35, lng: -6.26, weight: 8 },
  { name: "Lisbon", lat: 38.72, lng: -9.14, weight: 10 },
  { name: "Athens", lat: 37.98, lng: 23.73, weight: 10 },
  { name: "Bucharest", lat: 44.43, lng: 26.11, weight: 10 },
  { name: "Budapest", lat: 47.5, lng: 19.04, weight: 9 },
  { name: "Manchester", lat: 53.48, lng: -2.24, weight: 9 },
  { name: "Lyon", lat: 45.76, lng: 4.84, weight: 8 },
  { name: "Naples", lat: 40.85, lng: 14.27, weight: 9 },
  // Africa
  { name: "Lagos", lat: 6.52, lng: 3.38, weight: 30 },
  { name: "Cairo", lat: 30.04, lng: 31.24, weight: 28 },
  { name: "Kinshasa", lat: -4.44, lng: 15.27, weight: 22 },
  { name: "Johannesburg", lat: -26.2, lng: 28.05, weight: 18 },
  { name: "Cape Town", lat: -33.92, lng: 18.42, weight: 13 },
  { name: "Nairobi", lat: -1.29, lng: 36.82, weight: 16 },
  { name: "Addis Ababa", lat: 9.03, lng: 38.74, weight: 15 },
  { name: "Accra", lat: 5.6, lng: -0.19, weight: 13 },
  { name: "Casablanca", lat: 33.57, lng: -7.59, weight: 13 },
  { name: "Algiers", lat: 36.75, lng: 3.06, weight: 12 },
  { name: "Dar es Salaam", lat: -6.79, lng: 39.21, weight: 14 },
  { name: "Khartoum", lat: 15.5, lng: 32.56, weight: 12 },
  { name: "Abidjan", lat: 5.36, lng: -4.01, weight: 12 },
  { name: "Luanda", lat: -8.84, lng: 13.23, weight: 12 },
  { name: "Kano", lat: 12.0, lng: 8.52, weight: 10 },
  { name: "Tunis", lat: 36.81, lng: 10.18, weight: 8 },
  { name: "Kampala", lat: 0.35, lng: 32.58, weight: 10 },
  { name: "Harare", lat: -17.83, lng: 31.05, weight: 7 },
  { name: "Dakar", lat: 14.72, lng: -17.47, weight: 9 },
  { name: "Antananarivo", lat: -18.88, lng: 47.51, weight: 7 },
  // Middle East & Central Asia
  { name: "Istanbul", lat: 41.01, lng: 28.98, weight: 24 },
  { name: "Tehran", lat: 35.69, lng: 51.39, weight: 20 },
  { name: "Riyadh", lat: 24.71, lng: 46.68, weight: 15 },
  { name: "Baghdad", lat: 33.31, lng: 44.36, weight: 16 },
  { name: "Ankara", lat: 39.93, lng: 32.86, weight: 12 },
  { name: "Tel Aviv", lat: 32.08, lng: 34.78, weight: 10 },
  { name: "Amman", lat: 31.95, lng: 35.93, weight: 9 },
  { name: "Tashkent", lat: 41.3, lng: 69.24, weight: 11 },
  { name: "Almaty", lat: 43.24, lng: 76.89, weight: 9 },
  { name: "Baku", lat: 40.41, lng: 49.87, weight: 9 },
  { name: "Kabul", lat: 34.56, lng: 69.21, weight: 11 },
  // South Asia
  { name: "Karachi", lat: 24.86, lng: 67.01, weight: 26 },
  { name: "Lahore", lat: 31.55, lng: 74.34, weight: 20 },
  { name: "Dhaka", lat: 23.81, lng: 90.41, weight: 28 },
  { name: "Chittagong", lat: 22.36, lng: 91.78, weight: 14 },
  { name: "Kathmandu", lat: 27.72, lng: 85.32, weight: 10 },
  { name: "Jaipur", lat: 26.91, lng: 75.79, weight: 14 },
  { name: "Lucknow", lat: 26.85, lng: 80.95, weight: 14 },
  { name: "Nagpur", lat: 21.15, lng: 79.09, weight: 12 },
  { name: "Surat", lat: 21.17, lng: 72.83, weight: 14 },
  { name: "Kanpur", lat: 26.45, lng: 80.33, weight: 12 },
  { name: "Patna", lat: 25.59, lng: 85.14, weight: 13 },
  { name: "Indore", lat: 22.72, lng: 75.86, weight: 11 },
  { name: "Coimbatore", lat: 11.02, lng: 76.96, weight: 10 },
  { name: "Visakhapatnam", lat: 17.69, lng: 83.22, weight: 10 },
  { name: "Bhopal", lat: 23.26, lng: 77.41, weight: 10 },
  // South-East Asia
  { name: "Jakarta", lat: -6.21, lng: 106.85, weight: 28 },
  { name: "Manila", lat: 14.6, lng: 120.98, weight: 26 },
  { name: "Bangkok", lat: 13.76, lng: 100.5, weight: 22 },
  { name: "Ho Chi Minh City", lat: 10.82, lng: 106.63, weight: 20 },
  { name: "Hanoi", lat: 21.03, lng: 105.85, weight: 17 },
  { name: "Kuala Lumpur", lat: 3.14, lng: 101.69, weight: 15 },
  { name: "Surabaya", lat: -7.25, lng: 112.75, weight: 14 },
  { name: "Yangon", lat: 16.87, lng: 96.2, weight: 14 },
  { name: "Cebu", lat: 10.32, lng: 123.89, weight: 10 },
  { name: "Medan", lat: 3.6, lng: 98.68, weight: 11 },
  { name: "Phnom Penh", lat: 11.56, lng: 104.92, weight: 9 },
  // East Asia
  { name: "Tokyo", lat: 35.68, lng: 139.69, weight: 32 },
  { name: "Osaka", lat: 34.69, lng: 135.5, weight: 20 },
  { name: "Seoul", lat: 37.57, lng: 126.98, weight: 26 },
  { name: "Beijing", lat: 39.9, lng: 116.4, weight: 30 },
  { name: "Shanghai", lat: 31.23, lng: 121.47, weight: 32 },
  { name: "Guangzhou", lat: 23.13, lng: 113.26, weight: 26 },
  { name: "Shenzhen", lat: 22.54, lng: 114.06, weight: 26 },
  { name: "Chengdu", lat: 30.57, lng: 104.07, weight: 22 },
  { name: "Wuhan", lat: 30.59, lng: 114.31, weight: 20 },
  { name: "Xi'an", lat: 34.34, lng: 108.94, weight: 18 },
  { name: "Chongqing", lat: 29.56, lng: 106.55, weight: 24 },
  { name: "Harbin", lat: 45.8, lng: 126.53, weight: 14 },
  { name: "Taipei", lat: 25.03, lng: 121.57, weight: 14 },
  { name: "Hong Kong", lat: 22.32, lng: 114.17, weight: 18 },
  { name: "Ulaanbaatar", lat: 47.89, lng: 106.91, weight: 6 },
  // Oceania
  { name: "Sydney", lat: -33.87, lng: 151.21, weight: 14 },
  { name: "Melbourne", lat: -37.81, lng: 144.96, weight: 13 },
  { name: "Brisbane", lat: -27.47, lng: 153.03, weight: 9 },
  { name: "Perth", lat: -31.95, lng: 115.86, weight: 8 },
  { name: "Auckland", lat: -36.85, lng: 174.76, weight: 7 },
  { name: "Port Moresby", lat: -9.44, lng: 147.18, weight: 5 },
];

/** Everywhere people are, the roster's own cities weighted alongside. */
export const ATTRACTORS: Attractor[] = [
  ...CIRCLE_CITIES.map((c) => ({ name: c.name, lat: c.lat, lng: c.lng, weight: c.weight })),
  ...WORLD,
];

export type Pin = { x: number; y: number; big: boolean; hue: 0 | 1 };

/**
 * The inhabited band, not the globe.
 *
 * Equirectangular, because the projection is doing no work here — Mercator
 * exists to preserve angles for navigation and pays for it by inflating the
 * empty top and bottom of the world. And then the band is cropped to the
 * latitudes people live at: drawing to the poles spent a fifth of the
 * canvas on ice, on a picture whose entire subject is where people are.
 */
const NORTH = 78;
const SOUTH = -56;

export function project(lat: number, lng: number, w: number, h: number) {
  return { x: ((lng + 180) / 360) * w, y: ((NORTH - lat) / (NORTH - SOUTH)) * h };
}

/** The same mapping in percentages, for anything drawn in HTML over the canvas. */
export function projectPct(lat: number, lng: number) {
  return { x: ((lng + 180) / 360) * 100, y: ((NORTH - lat) / (NORTH - SOUTH)) * 100 };
}

/**
 * The population field.
 *
 * A pin per person is the wrong unit at this scale — a million of them is a
 * grey rectangle. Each pin is a *place where people are*, scattered around
 * its city with a tail long enough to join neighbouring cities into regions
 * and short enough that the regions stay apart.
 */
export function worldPins(count: number, w: number, h: number): Pin[] {
  const total = ATTRACTORS.reduce((s, a) => s + a.weight, 0);
  const pins: Pin[] = [];
  let seed = 0;

  for (const a of ATTRACTORS) {
    const n = Math.max(2, Math.round((a.weight / total) * count));
    for (let i = 0; i < n; i++) {
      seed++;
      // Box–Muller from the hash, so the scatter is a real bell rather than
      // a square blob with corners.
      const u1 = (rnd(`wx-${seed}`) % 10000) / 10000 || 0.0001;
      const u2 = (rnd(`wy-${seed}`) % 10000) / 10000;
      const r = Math.sqrt(-2 * Math.log(u1));
      // Wider north–south than east–west: coastlines and valleys run that
      // way more often than not, and a circular blur reads as a stamp.
      // Tighter than the first pass, which scattered a city over eight
      // degrees and turned the continents into weather. A city is a blob;
      // the blobs touching is what draws the land.
      const spread = 0.85 + (rnd(`ws-${seed}`) % 150) / 100;
      const lat = a.lat + r * Math.cos(2 * Math.PI * u2) * spread * 0.78;
      const lng = a.lng + r * Math.sin(2 * Math.PI * u2) * spread;
      if (lat > NORTH || lat < SOUTH) continue;
      const p = project(lat, ((lng + 540) % 360) - 180, w, h);
      pins.push({
        x: p.x,
        y: p.y,
        // A handful sit proud of the field so the eye has somewhere to land.
        big: rnd(`wb-${seed}`) % 100 < 2,
        hue: rnd(`wh-${seed}`) % 100 < 22 ? 1 : 0,
      });
    }
  }
  return pins;
}

/** The number under the headline. Fiction, and labelled as such in the UI. */
export const IMAGINED_TOTAL = 1_284_390;

/** Region totals, split out of the same imagined number. */
export function regionSplit(): Array<{ name: string; n: number }> {
  const groups: Array<[string, number]> = [
    ["South Asia", 0.27],
    ["East Asia", 0.21],
    ["Europe", 0.16],
    ["North America", 0.13],
    ["South-East Asia", 0.09],
    ["Africa", 0.08],
    ["Latin America", 0.04],
    ["Oceania", 0.02],
  ];
  return groups.map(([name, share]) => ({ name, n: Math.round(IMAGINED_TOTAL * share) }));
}

/**
 * A few faces at full size, so the field has somewhere for the eye to land.
 *
 * Without them a million pins is a texture — accurate, impressive for about
 * a second, and impossible to care about. One recognisable person per
 * continent is what turns it back into people.
 */
export const HEROES: Array<{ name: string; lat: number; lng: number }> = [
  { name: "Ananya Iyer", lat: 12.97, lng: 77.59 },
  { name: "Noah Baker", lat: 40.71, lng: -74.0 },
  { name: "Mei-ling Zhang", lat: 31.23, lng: 121.47 },
  { name: "Charlotte Harrison", lat: 51.51, lng: -0.13 },
  { name: "Logan Alvarez", lat: -23.55, lng: -46.63 },
  { name: "Camille Kaur", lat: 6.52, lng: 3.38 },
  { name: "Siddharth Iyer", lat: -33.87, lng: 151.21 },
  { name: "Aarav Banerjee", lat: 25.2, lng: 55.27 },
];
