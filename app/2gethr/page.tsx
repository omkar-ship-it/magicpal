import SpaceHomeLoader from "@/components/SpaceHomeLoader";

/**
 * A co-working space's own front door.
 *
 * The board opens here rather than on the map, because inside one building
 * the map has nothing to say: everybody is at the same point. The public
 * network is one tap away in the header, which is the right ordering for a
 * member who joined through their desk rather than through the app.
 */
export default function SpacePage() {
  return <SpaceHomeLoader />;
}
