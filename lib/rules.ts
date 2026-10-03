export const RADIUS_OPTIONS_KM = [5, 10, 25, 50, 100] as const;
export const DEFAULT_RADIUS_KM = 25;
export const MAX_SKILLS = 8;
export const MAX_MAP_RESULTS = 200;

/** How recently a heartbeat has to have landed to count as "active now" on the map. */
export const ACTIVE_WINDOW_MINUTES = 20;
/** How often the client pings the heartbeat endpoint while a page is open. */
export const HEARTBEAT_INTERVAL_MS = 60_000;

export const DROP_DURATION_OPTIONS_MIN = [30, 60, 90, 120] as const;
export const DEFAULT_DROP_DURATION_MIN = 60;
export const MAX_DROP_LABEL = 80;

/** A connection has exactly one open request between two people at a time. */
export type ConnectionStatus = "pending" | "accepted" | "declined";

/** The pair in the fixed order the `connections` table's check constraint requires. */
export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}
