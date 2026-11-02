import CircleTreeLoader from "@/components/CircleTreeLoader";

/**
 * Two experiments against density, at the two scales where the map stops
 * working: a million people, and four hundred in one building.
 *
 * Deliberately its own route rather than a mode inside /circle. Both of
 * these are candidates, not decisions, and the way to find out whether a
 * picture of a room is worth sending to somebody is to be able to send
 * somebody the picture of the room.
 */
export const metadata = { title: "The room, and the world — OpenNetworks" };

export default function CircleTreePage() {
  return <CircleTreeLoader />;
}
