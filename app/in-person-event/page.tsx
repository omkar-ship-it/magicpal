import type { Metadata } from "next";
import EventRoomLoader from "@/components/EventRoomLoader";

/**
 * One in-person event, fifty people deep.
 *
 * A link to send a community organiser. It answers the question a badge
 * wall and a printed attendee list both dodge — not "who is here" but
 * "who should I walk over to" — and it answers it with the room already
 * full, because a demo that opens empty argues against itself.
 */
export const metadata: Metadata = {
  title: "StartUp Networking · 50 people in the room",
  description:
    "What an in-person event looks like on OpenNetworks: fifty attendees on the venue map, what each is looking for and can help with, and the four worth crossing the room for.",
};

export default function InPersonEventPage() {
  return <EventRoomLoader />;
}
