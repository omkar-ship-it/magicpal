import type { Section } from "@/components/DockBar";

/**
 * Where you are on the map, as something the URL can hold.
 *
 * Until now every bit of navigation state lived only in React, so a refresh
 * dropped you back on the bare map, the browser's back button left the app
 * entirely, and nothing was linkable — you could get to TiE Hyderabad's feed
 * but you couldn't send anyone there. Encoding it in the hash fixes all
 * three at once: back unwinds page → list → map, and a reload lands where you
 * left off.
 */
export type MapRoute = {
  /** A page that isn't one of the five dock sections — currently just "you". */
  page: "you" | null;
  section: Section | null;
  /** The drill path inside that section — ["tie-global", "tie-india"]. */
  path: string[];
  /** That section's own filter chip. */
  filter: string | null;
  /** The network the whole map is scoped to. */
  network: string | null;
  city: string | null;
  /** A network page stood down to a pill, its scope still on the map. */
  minimised: string | null;
  connectionsOnly: boolean;
};

const SECTION_IDS: Section[] = ["network", "chats", "events", "institutions", "companies"];

export const EMPTY_ROUTE: MapRoute = {
  page: null,
  section: null,
  path: [],
  filter: null,
  network: null,
  city: null,
  minimised: null,
  connectionsOnly: false,
};

/** `#/network/tie-global/tie-india?f=all&city=Hyderabad`, or `#/you` */
export function formatRoute(r: MapRoute): string {
  if (r.page) return `#/${r.page}`;
  const segments = [r.section ?? "", ...r.path].map((s) => encodeURIComponent(s)).join("/");
  const params = new URLSearchParams();
  if (r.filter && r.filter !== "all") params.set("f", r.filter);
  if (r.network) params.set("net", r.network);
  if (r.city) params.set("city", r.city);
  if (r.minimised) params.set("min", r.minimised);
  if (r.connectionsOnly) params.set("c", "1");
  const qs = params.toString();
  if (!r.section && !qs) return "";
  return `#/${segments}${qs ? `?${qs}` : ""}`;
}

export function parseRoute(hash: string): MapRoute {
  const raw = hash.replace(/^#\/?/, "");
  if (!raw) return EMPTY_ROUTE;
  const [pathPart, queryPart] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean).map(decodeURIComponent);
  if (segments[0] === "you") return { ...EMPTY_ROUTE, page: "you" };
  const maybeSection = segments[0] as Section | undefined;
  const section = maybeSection && SECTION_IDS.includes(maybeSection) ? maybeSection : null;
  const params = new URLSearchParams(queryPart ?? "");
  return {
    page: null,
    section,
    path: section ? segments.slice(1) : [],
    filter: params.get("f"),
    network: params.get("net"),
    city: params.get("city"),
    minimised: params.get("min"),
    connectionsOnly: params.get("c") === "1",
  };
}
