import SpaceAdminLoader from "@/components/SpaceAdminLoader";

/**
 * The organiser's side of MagicPal-as-a-tool: make a space for one meetup
 * or one group chat, pay for it, and walk away with a QR code and a link.
 *
 * Deliberately outside both network experiences. This isn't a place you
 * move into — it's something you point at a room you already have.
 */
export default function SpacesPage() {
  return <SpaceAdminLoader />;
}
