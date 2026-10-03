export const RADIUS_OPTIONS_KM = [5, 10, 25, 50, 100] as const;
export const DEFAULT_RADIUS_KM = 25;
export const MAX_SKILLS = 8;
export const MAX_MAP_RESULTS = 200;

/** A connection has exactly one open request between two people at a time. */
export type ConnectionStatus = "pending" | "accepted" | "declined";

/** The pair in the fixed order the `connections` table's check constraint requires. */
export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}
