import SpaceWall from "@/components/SpaceWall";

/**
 * The page the operator puts a link to on their own website.
 *
 * This is the commercial end of the product. A co-working space sells
 * desks, and desks are a commodity — the only asset a competitor cannot
 * copy is the particular people already inside. Nothing in an operator's
 * current stack turns that into something a prospect can see, so the
 * product has to emit a number they can publish.
 */
export const metadata = {
  title: "2gethr — the network inside the building",
};

export default function WallPage() {
  return <SpaceWall />;
}
