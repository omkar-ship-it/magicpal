import SpaceMap from "@/components/SpaceMap";

/**
 * One co-working floor, on the map — the demo for operators.
 *
 * Full-bleed, like every other surface here: the floor is the map, faces
 * sit on it, and everything else is summoned over the top. The first
 * version of this page was a directory, which read like a phone book and
 * threw away the only thing this product has that a membership portal
 * doesn't — where people actually are.
 *
 * Simulated at full density on purpose. Every community tool these
 * operators have been shown runs on a dozen fake users, and a dozen people
 * is a dinner party; at two hundred the question stops being "who is here"
 * and becomes "who here is worth getting up for".
 */
export default function SpacePage() {
  return <SpaceMap />;
}
