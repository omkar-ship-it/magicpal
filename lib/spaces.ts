import { CIRCLE_MEMBERS, OPEN_INTERESTS, rnd, type CircleMember } from "./circleData";

/**
 * Spaces — MagicPal as a drop-in tool somebody can point at one room or one
 * WhatsApp group, rather than a network you have to move into.
 *
 * Two jobs it turns out to be the same product for:
 *
 *   A meetup. Three hundred people in a hall, badges with first names on,
 *   and no way to find the four worth talking to. The admin puts a QR on a
 *   slide; people scan it and get the room as a list of faces with reasons
 *   attached.
 *
 *   A WhatsApp group. Two hundred people who already trust each other and
 *   genuinely cannot answer "who here is in Berlin". The admin drops a link
 *   in the group.
 *
 * The admin pays and the members don't, because the admin is the one with
 * the problem — and a per-head price on a free WhatsApp group is a product
 * nobody buys.
 */

export type SpaceKind = "event" | "group";

export type Space = {
  code: string;
  kind: SpaceKind;
  name: string;
  /** Who's running it, shown so a scanned link isn't from nowhere. */
  host: string;
  blurb: string;
  /** Free text: a venue for an event, a city or "everywhere" for a group. */
  place: string;
  /** Events only. */
  dateLabel?: string;
  planId: string;
  createdAtLabel: string;
  /** People who've joined, beyond the seeded ones. */
  joinedIds?: string[];
};

export type Plan = {
  id: string;
  name: string;
  priceLabel: string;
  period: string;
  cap: number;
  forKind: SpaceKind | "both";
  perks: string[];
  featured?: boolean;
};

/**
 * Lean on purpose. This competes with a printed name badge and a pinned
 * message, so it has to cost about what an organiser spends on coffee —
 * and the free tier has to be genuinely usable or nobody ever starts.
 */
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Try it",
    priceLabel: "Free",
    period: "up to 25 people",
    cap: 25,
    forKind: "both",
    perks: ["QR code and link", "Everyone, searchable", "AI introductions"],
  },
  {
    id: "event",
    name: "One event",
    priceLabel: "₹2,000",
    period: "one-off, up to 500",
    cap: 500,
    forKind: "event",
    featured: true,
    perks: ["Everything in Try it", "Live 'here now' during the event", "Export who met whom", "Your branding on the landing page"],
  },
  {
    id: "group",
    name: "A group",
    priceLabel: "₹500",
    period: "per month, up to 500",
    cap: 500,
    forKind: "group",
    featured: true,
    perks: ["Everything in Try it", "Members map by city", "Monthly 'who's new' digest", "Your branding on the landing page"],
  },
];

export const planById = (id: string) => PLANS.find((p) => p.id === id) ?? PLANS[0];

/** Short, readable, and not guessable by counting up from one. */
export function makeCode(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 18)
    // Trimmed *after* the slice: cutting at eighteen characters often lands
    // mid-word and leaves a trailing hyphen, which reads as a typo in the URL.
    .replace(/^-+|-+$/g, "");
  const salt = Math.random().toString(36).slice(2, 6);
  return `${slug || "space"}-${salt}`;
}

const KEY = "mp_spaces";

export function getSpaces(): Space[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Space[];
  } catch {
    return [];
  }
}

export function saveSpaces(list: Space[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Private browsing or a full quota — the session still works.
  }
}

export function spaceByCode(code: string): Space | null {
  return getSpaces().find((s) => s.code === code) ?? null;
}

/**
 * Who's already in the room.
 *
 * Seeded from the same roster everything else uses, deterministically per
 * space, so a freshly made QR doesn't open onto an empty page — which is
 * the one thing that would stop anybody scanning the second one.
 */
export function attendeesOfSpace(space: Space): CircleMember[] {
  const size = space.kind === "event" ? 48 : 120;
  return CIRCLE_MEMBERS.filter((m) => rnd(`sp-${space.code}-${m.id}`) % 1000 < Math.round((size / CIRCLE_MEMBERS.length) * 1000));
}

/** At a live event, the people actually in the building right now. */
export function hereNow(space: Space, people: CircleMember[]): CircleMember[] {
  if (space.kind !== "event") return [];
  return people.filter((m) => rnd(`here-${space.code}-${m.id}`) % 100 < 62);
}

export const SPACE_INTERESTS = OPEN_INTERESTS;
