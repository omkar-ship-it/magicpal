import BuildingLoader from "@/components/BuildingLoader";

/**
 * Floor by floor — a prototype of one idea, on its own route so it can be
 * handed to somebody without explaining the rest of the app.
 *
 * The question: "23 professionals in this building" is a number, and a
 * number is not a destination. Does breaking it down by floor change what
 * a person actually does when they are standing in the lobby?
 *
 * The second question is technical, and the page answers it on the reader's
 * own device rather than asserting it — see FloorProbe.
 */
export default function BuildingPage() {
  return <BuildingLoader />;
}
