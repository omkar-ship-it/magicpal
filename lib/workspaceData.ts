import { membersOf, rnd, WORKSPACE_ENTITY_ID, type CircleEvent, type CircleMember } from "./circleData";
import { entityById } from "./networks";

/**
 * A workspace, and the density problem it creates.
 *
 * Every other network in this prototype is spread over dozens of cities,
 * which is what makes a world map legible: forty pins, each a stack of
 * three faces. A workspace inverts that. Five hundred and twenty members
 * share one postcode, four hundred of them are in on a Tuesday, and the
 * map that works beautifully for an alumni network collapses into a single
 * unreadable clot of avatars over one building.
 *
 * That collapse is deliberately *not* hidden here. It is the thing worth
 * looking at before anybody designs a way out of it: how discovery and
 * connection actually break when proximity stops discriminating, because
 * everybody is equally near.
 *
 * What is NOT invented: any claim that the app knows where inside the
 * building somebody is. Positions below are a scatter across the footprint
 * to show the scale of the pile-up — they are not floor-level truth, and
 * nothing in the product should ever read them as such.
 */

export const WORKSPACE_ID = WORKSPACE_ENTITY_ID;

/** Roughly four in five members are in on a weekday. */
const IN_TODAY_RATE = 77;

/**
 * The building footprint, in degrees.
 *
 * ±0.00045° ≈ ±50m, which is about the plan of a real floor plate. The
 * existing venue scatter uses ±110m — fine for a conference spilling over
 * a hotel, far too generous for a tower, and at five hundred people the
 * difference is the whole character of the problem.
 */
const FOOTPRINT = 0.00045;

const workspaceEntity = entityById(WORKSPACE_ID);

export const WORKSPACE_PLACE = {
  lat: workspaceEntity?.place?.lat ?? 12.9667,
  lng: workspaceEntity?.place?.lng ?? 77.6,
  name: workspaceEntity?.name ?? "Workspace",
};

/**
 * Who holds a desk here.
 *
 * Drawn from the Bengaluru roster, because a co-working floor is a local
 * population — a workspace whose members are scattered across the world is
 * an alumni network with a different label on it.
 */
export const WORKSPACE_MEMBERS: CircleMember[] = membersOf(WORKSPACE_ID);

/** In the building right now. The number the whole problem hangs off. */
export const WORKSPACE_IN_TODAY: CircleMember[] = WORKSPACE_MEMBERS.filter(
  (m) => rnd(`ws-in-${m.id}`) % 100 < IN_TODAY_RATE
);

/**
 * The workspace as a venue the map already knows how to render.
 *
 * Shaped as a live event on purpose rather than as a new concept: the venue
 * layer, the fly-to, the beacon markers and every `!venueEvent` guard in
 * the map already exist and already work. A workspace is simply a venue
 * that is live every weekday instead of for one evening — and modelling it
 * as anything else would have meant a second map, which is exactly the
 * mistake this replaces.
 */
export const WORKSPACE_VENUE: CircleEvent = {
  id: "ws-galaxy-today",
  name: `${WORKSPACE_PLACE.name} — today`,
  hostEntityId: WORKSPACE_ID,
  kind: "official",
  venue: "Residency Road, Bengaluru",
  cityId: "blr",
  lat: WORKSPACE_PLACE.lat,
  lng: WORKSPACE_PLACE.lng,
  dateLabel: "Today",
  timeLabel: "All day",
  daysAway: 0,
  liveNow: true,
  about:
    "Not an event — the floor itself. Everyone with a desk here who tapped in today.",
  hostMemberId: null,
};

/** A seat inside the footprint. Deterministic: nobody teleports on refresh. */
export function workspacePoint(m: CircleMember): [number, number] {
  return [
    WORKSPACE_PLACE.lng + ((rnd(`wsx-${m.id}`) % 2000) / 1000 - 1) * FOOTPRINT,
    WORKSPACE_PLACE.lat + ((rnd(`wsy-${m.id}`) % 2000) / 1000 - 1) * FOOTPRINT,
  ];
}
