import type { Metadata } from "next";
import CommunityMapLoader from "@/components/CommunityMapLoader";

/**
 * One WhatsApp group, fifty members deep.
 *
 * A link to send a group admin. It answers the question the group chat
 * dodges — not "who is in here" but "which of these two hundred people
 * should I actually talk to, and are they anywhere near me" — and it
 * answers it with the group already full, because a demo that opens
 * empty argues against itself.
 */
export const metadata: Metadata = {
  title: "Hyderabad Founders · 50 members on the map",
  description:
    "What a WhatsApp community looks like on OpenNetworks: fifty members placed across the city, what each is looking for and can help with, and the ones the group chat has never surfaced.",
};

export default function WhatsAppCommunityPage() {
  return <CommunityMapLoader />;
}
